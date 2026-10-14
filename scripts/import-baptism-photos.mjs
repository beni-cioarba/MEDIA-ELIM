/**
 * Importa los retratos de los candidatos al bautismo y regenera su manifiesto.
 *
 * Cada botez llega como una carpeta con un retrato por candidato, con el
 * `id` del candidato como nombre de fichero (`natalia-cuth.jpg`; es el `id`
 * de `core/baptisms.config.ts`). Todos salen con el **mismo encuadre**: 4:5,
 * de pecho para arriba, con la cara a la misma altura. Así la rejilla del
 * registro se lee como una sola serie aunque las fotos sean de móviles y años
 * distintos.
 *
 *   src/assets/baptisms/<AAAA-MM-DD>/<id>-320.webp    rejillas y carrusel
 *   src/assets/baptisms/<AAAA-MM-DD>/<id>-640.webp    tarjeta grande, retina
 *   src/assets/baptisms/<AAAA-MM-DD>/<id>-1080.webp   perfil en escritorio a 2×
 *
 * El recorte de cada foto (normalizado: `[izquierda, arriba, ancho, alto]`)
 * vive en `scripts/assets-src/baptism-crops.json`. Se calculó detectando la
 * cara (OpenCV): alto del recorte = 4,2 × la cara, frente a 0,85 × la cara del
 * borde superior. Una foto sin recorte en el fichero se encuadra sola
 * (`attention` de sharp) a 4:5; para afinarla, se añade su caja al JSON.
 *
 * Calidad: Lanczos3 + enfoque suave y WebP q84 con `smartSubsample`. Nunca se
 * amplía: si el recorte mide menos que un tamaño, ese tamaño no se genera.
 * Privacidad: no se copia ningún metadato (EXIF con GPS, móvil, fecha).
 *
 * Retratos «de estudio» (fondo común y encuadre igualado): los compone
 * `scripts/baptism-studio.py` y se importan con `--studio`, ya en 4:5, a
 * `src/assets/baptisms-studio/` con su propio manifiesto. Los originales de
 * arriba **se conservan**: `PORTRAIT_STYLE` en `baptisms.service.ts` elige
 * cuáles se ven (y cae al original si falta el de estudio).
 *
 * Uso:
 *   node scripts/import-baptism-photos.mjs "<carpeta del botez>" 2023-06-11
 *   node scripts/import-baptism-photos.mjs --all "<carpeta con una subcarpeta por fecha>"
 *   node scripts/import-baptism-photos.mjs --studio "<salida de baptism-studio.py>"
 *   node scripts/import-baptism-photos.mjs --manifest
 *
 * Reimportar un botez vacía antes su carpeta: no quedan variantes huérfanas.
 * Receta completa: docs/ai/34-baptisms.md.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, parse } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'src/assets/baptisms';
const MANIFIESTO = 'src/app/core/baptism-photos.generated.ts';
const RECORTES = 'scripts/assets-src/baptism-crops.json';
const DESTINO_ESTUDIO = 'src/assets/baptisms-studio';
const MANIFIESTO_ESTUDIO = 'src/app/core/baptism-studio-photos.generated.ts';

/** Anchos generados (la proporción es siempre 4:5). */
const ANCHOS = [320, 640, 1080];
const PROPORCION = 4 / 5;
const WEBP = { quality: 84, effort: 6, smartSubsample: true };
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff']);

async function leerRecortes() {
  return existsSync(RECORTES) ? JSON.parse(await readFile(RECORTES, 'utf8')) : {};
}

/** Retratos de estudio: ya vienen en 4:5 y encuadrados; sólo se reducen. */
async function importarEstudio(raiz) {
  // Sólo se reemplazan las fechas que trae `raiz`: las demás se quedan como
  // están (sus PNG de estudio no tienen por qué seguir en el disco).
  for (const fecha of (await readdir(raiz)).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    const carpeta = join(DESTINO_ESTUDIO, fecha);
    await rm(carpeta, { recursive: true, force: true });
    await mkdir(carpeta, { recursive: true });
    const ficheros = (await readdir(join(raiz, fecha))).filter((f) => EXTENSIONES.has(extname(f).toLowerCase()));
    console.log(`\n${fecha} — ${ficheros.length} retratos de estudio`);
    for (const fichero of ficheros.sort()) {
      const id = parse(fichero).name;
      const base = sharp(join(raiz, fecha, fichero));
      const { width = 0 } = await base.metadata();
      const anchos = [...new Set([...ANCHOS.filter((a) => a < width), Math.min(width, ANCHOS.at(-1))])];
      const hechos = [];
      for (const a of anchos) {
        const salida = await base
          .clone()
          .resize(a, Math.round(a / PROPORCION), { fit: 'cover', kernel: 'lanczos3', withoutEnlargement: true })
          .sharpen({ sigma: 0.5 })
          .webp(WEBP)
          .toBuffer();
        await writeFile(join(carpeta, `${id}-${a}.webp`), salida);
        hechos.push(`${a} (${Math.round(salida.length / 1024)} kB)`);
      }
      console.log(`  ${id}  ·  ${hechos.join(' · ')}`);
    }
  }
}

async function importarBotez(origen, fecha, recortes) {
  const ficheros = (await readdir(origen)).filter((f) => EXTENSIONES.has(extname(f).toLowerCase()));
  if (ficheros.length === 0) throw new Error(`No hay fotos en ${origen}`);

  const carpeta = join(DESTINO, fecha);
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });

  console.log(`\n${fecha} — ${ficheros.length} retratos`);
  for (const fichero of ficheros.sort()) {
    const id = parse(fichero).name;
    const base = sharp(join(origen, fichero)).rotate();
    // Tras `.rotate()` las medidas útiles son las orientadas.
    const { data, info } = await base.clone().toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;
    const caja = recortes[`${fecha}/${id}`];

    let recorte;
    if (caja) {
      const [l, t, w, h] = caja;
      recorte = sharp(data).extract({
        left: Math.round(l * W),
        top: Math.round(t * H),
        width: Math.min(Math.round(w * W), W - Math.round(l * W)),
        height: Math.min(Math.round(h * H), H - Math.round(t * H)),
      });
    } else {
      const w = Math.min(W, Math.round(H * PROPORCION));
      recorte = sharp(data).resize(w, Math.round(w / PROPORCION), { fit: 'cover', position: 'attention' });
    }
    const plano = await recorte.toBuffer({ resolveWithObject: true });
    const ancho = plano.info.width;

    const anchos = [...new Set([...ANCHOS.filter((a) => a < ancho), Math.min(ancho, ANCHOS.at(-1))])];
    const hechos = [];
    for (const a of anchos) {
      const salida = await sharp(plano.data)
        .resize(a, Math.round(a / PROPORCION), { fit: 'cover', kernel: 'lanczos3', withoutEnlargement: true })
        .sharpen({ sigma: 0.55 })
        .webp(WEBP)
        .toBuffer();
      await writeFile(join(carpeta, `${id}-${a}.webp`), salida);
      hechos.push(`${a} (${Math.round(salida.length / 1024)} kB)`);
    }
    const aviso = caja ? '' : '  · encuadre automático (sin caja en baptism-crops.json)';
    console.log(`  ${id}  ${ancho}px  ·  ${hechos.join(' · ')}${aviso}`);
  }
}

/** Lee los retratos en disco (`destino`) y escribe su manifiesto TypeScript. */
async function generarManifiesto(destino, archivo, nombre, que) {
  const entradas = [];
  if (existsSync(destino)) {
    for (const fecha of (await readdir(destino)).sort()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
      const porId = new Map();
      for (const f of await readdir(join(destino, fecha))) {
        const m = f.match(/^(.+)-(\d+)\.webp$/);
        if (!m) continue;
        porId.set(m[1], [...(porId.get(m[1]) ?? []), Number(m[2])]);
      }
      for (const [id, anchos] of [...porId].sort(([a], [b]) => a.localeCompare(b))) {
        entradas.push(`  '${fecha}/${id}': [${anchos.sort((a, b) => a - b).join(', ')}],`);
      }
    }
  }

  const ts = `/**
 * Manifiesto de ${que} de los candidatos al bautismo — GENERADO.
 *
 * No lo edites a mano: lo escribe \`scripts/import-baptism-photos.mjs\` leyendo
 * \`${destino}/\`. Clave \`<fecha del botez>/<id del candidato>\`;
 * valor: los anchos generados (4:5), de menor a mayor, para el \`srcset\`.
 */

export const ${nombre}: Readonly<Record<string, readonly number[]>> = {
${entradas.join('\n')}
};
`;
  await writeFile(archivo, ts);
  console.log(`\n✓ Manifiesto: ${entradas.length} ${que} → ${archivo}`);
}

async function manifiestos() {
  await generarManifiesto(DESTINO, MANIFIESTO, 'BAPTISM_PHOTOS', 'retratos');
  await generarManifiesto(DESTINO_ESTUDIO, MANIFIESTO_ESTUDIO, 'BAPTISM_STUDIO_PHOTOS', 'retratos de estudio');
}

async function main() {
  const args = process.argv.slice(2);
  const recortes = await leerRecortes();
  if (args[0] === '--studio') {
    if (!args[1]) throw new Error('Falta la carpeta: --studio "<carpeta>"');
    await importarEstudio(args[1]);
  } else if (args[0] === '--all') {
    const raiz = args[1];
    if (!raiz) throw new Error('Falta la carpeta: --all "<carpeta>"');
    for (const fecha of (await readdir(raiz)).sort()) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) await importarBotez(join(raiz, fecha), fecha, recortes);
    }
  } else if (args[0] !== '--manifest') {
    const [origen, fecha] = args;
    if (!origen || !/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) {
      console.error('Uso: node scripts/import-baptism-photos.mjs "<carpeta>" AAAA-MM-DD');
      console.error('     node scripts/import-baptism-photos.mjs --all "<carpeta con subcarpetas por fecha>"');
      console.error('     node scripts/import-baptism-photos.mjs --studio "<salida de baptism-studio.py>"');
      console.error('     node scripts/import-baptism-photos.mjs --manifest');
      process.exit(1);
    }
    await importarBotez(origen, fecha, recortes);
  }
  await manifiestos();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
