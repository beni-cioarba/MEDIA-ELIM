/**
 * Importa las fotos de perfil de «Conducere» (slujitori) y regenera su manifiesto.
 *
 * La iglesia pasa una carpeta con una foto por persona y su nombre como
 * nombre de fichero («GRIGORE TOMOIAGA.jpg», «PETRICA_HALAS.jpeg»). El nombre
 * se convierte en el `id` de la persona en `core/leadership.config.ts`; una
 * foto cuyo nombre no corresponde a nadie se rechaza (no quedan ficheros
 * huérfanos que nadie pinta).
 *
 * Encuadre: todas las fotos salen en **retrato 4:5**, la proporción de las
 * fotos que manda la iglesia. Así todas las tarjetas tienen la misma escala
 * de cara y el `object-position` del avatar sirve para todas. Si la foto es
 * más ancha se recortan los lados buscando la cara (`attention`); si es más
 * alta se recorta por abajo (nunca la cabeza).
 *
 * Por cada foto se generan varios anchos para `srcset`
 *
 *   src/assets/leadership/<id>-160.webp    avatar de 1,5–3 rem
 *   src/assets/leadership/<id>-320.webp    filas y tarjetas pequeñas
 *   src/assets/leadership/<id>-640.webp    tarjetas y retina
 *   src/assets/leadership/<id>-960.webp    cabecera del perfil en móvil
 *   src/assets/leadership/<id>-1600.webp   visor a pantalla completa
 *
 * y se **regenera** `src/app/core/leadership-photos.generated.ts` leyendo lo
 * que hay en disco. La foto aparece en la web sólo con eso: la configuración
 * de personas no lleva nombres de fichero.
 *
 * Calidad: reducción Lanczos3 + enfoque suave (sólo cuando se reduce) y WebP
 * q90 con `smartSubsample`. Son retratos y se ven grandes en el perfil y en
 * el visor; por encima de 90 el peso crece sin diferencia visible. Nunca se
 * amplía: si el original es menor que un ancho, ese ancho no se genera y el
 * mayor es el propio original.
 *
 * Privacidad: no se copia ningún metadato (EXIF con GPS, móvil, fecha);
 * `.rotate()` aplica antes la orientación y la salida es sRGB.
 *
 * Uso:
 *   node scripts/import-leadership-photos.mjs "<carpeta o foto>" [...]
 *   node scripts/import-leadership-photos.mjs --manifest   (sólo regenera el manifiesto)
 *
 * Reimportar a una persona sustituye todas sus variantes.
 */

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'src/assets/leadership';
const MANIFIESTO = 'src/app/core/leadership-photos.generated.ts';
const CONFIG = 'src/app/core/leadership.config.ts';

/** Anchos generados. El mayor cubre el visor a pantalla completa en retina. */
const ANCHOS = [160, 320, 640, 960, 1600];

/** Proporción de salida (ancho / alto): retrato 4:5. */
const PROPORCION = 4 / 5;

const WEBP = { quality: 90, effort: 6, smartSubsample: true };

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff']);

/** Por debajo de este ancho (tras recortar) la foto se verá blanda en el perfil. */
const ANCHO_MINIMO_RECOMENDADO = 640;

/**
 * «GRIGORE TOMOIAGA.jpg.jpeg» → «grigore-tomoiaga». Quita todas las
 * extensiones de imagen encadenadas (los móviles suelen duplicarlas).
 */
export function idDesdeFichero(fichero) {
  let nombre = basename(fichero);
  while (EXTENSIONES.has(extname(nombre).toLowerCase())) nombre = nombre.slice(0, -extname(nombre).length);
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function listarFotos(rutas) {
  const fotos = [];
  for (const ruta of rutas) {
    if ((await stat(ruta)).isDirectory()) {
      for (const f of (await readdir(ruta)).sort()) {
        if (EXTENSIONES.has(extname(f).toLowerCase())) fotos.push(join(ruta, f));
      }
    } else {
      fotos.push(ruta);
    }
  }
  if (fotos.length === 0) throw new Error(`No hay fotos en ${rutas.join(', ')}`);
  return fotos;
}

/** Recorta a 4:5 sin escalar: lados con `attention`, o el pie si sobra alto. */
async function recortar(ruta) {
  const orientada = await sharp(ruta).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(orientada).metadata();
  const anchoObjetivo = Math.round(height * PROPORCION);

  if (Math.abs(width - anchoObjetivo) <= 1) return { buffer: orientada, width, height, original: [width, height] };

  const [w, h, position] =
    width > anchoObjetivo
      ? [anchoObjetivo, height, sharp.strategy.attention]
      : [width, Math.round(width / PROPORCION), 'north'];

  // PNG en memoria: el recorte intermedio no pierde calidad.
  const buffer = await sharp(orientada).resize(w, h, { fit: 'cover', position }).png().toBuffer();
  return { buffer, width: w, height: h, original: [width, height] };
}

async function importar(rutas) {
  const config = await readFile(CONFIG, 'utf8');
  const fotos = await listarFotos(rutas);
  const desconocidos = fotos.filter((f) => !config.includes(`id: '${idDesdeFichero(f)}'`));
  if (desconocidos.length > 0) {
    throw new Error(
      `Sin persona en ${CONFIG}:\n${desconocidos.map((f) => `  ${basename(f)} → ${idDesdeFichero(f)}`).join('\n')}\n` +
        'Renombra la foto como «Nombre Apellido» de su entrada en PEOPLE.',
    );
  }

  await mkdir(DESTINO, { recursive: true });
  const existentes = await readdir(DESTINO);

  console.log(`\n${fotos.length} fotos → ${DESTINO}`);
  for (const ruta of fotos) {
    const id = idDesdeFichero(ruta);
    for (const f of existentes.filter((f) => f.startsWith(`${id}-`))) await rm(join(DESTINO, f));

    const { buffer, width, original } = await recortar(ruta);
    // Un ancho a menos de un 15 % del mayor no aporta (324 y 320 son el mismo fichero).
    const mayor = Math.min(width, ANCHOS.at(-1));
    const anchos = [...ANCHOS.filter((a) => a < mayor * 0.85), mayor];

    const hechos = [];
    for (const ancho of anchos) {
      let tubo = sharp(buffer);
      if (ancho < width) {
        tubo = tubo
          .resize(ancho, Math.round(ancho / PROPORCION), { fit: 'fill', kernel: 'lanczos3' })
          .sharpen({ sigma: 0.5 });
      }
      const salida = await tubo.webp(WEBP).toBuffer();
      await writeFile(join(DESTINO, `${id}-${ancho}.webp`), salida);
      hechos.push(`${ancho} (${Math.round(salida.length / 1024)} kB)`);
    }

    const aviso =
      width < ANCHO_MINIMO_RECOMENDADO ? `  ⚠ sólo ${width} px de ancho: pedir una foto de más resolución` : '';
    console.log(`  ${basename(ruta)} → ${id}  ${original.join('×')}  ·  ${hechos.join(' · ')}${aviso}`);
  }
}

/** Lee lo que hay en disco y escribe el manifiesto TypeScript. */
async function generarManifiesto() {
  const porId = new Map();
  if (existsSync(DESTINO)) {
    for (const f of await readdir(DESTINO)) {
      const m = f.match(/^(.+)-(\d+)\.webp$/);
      if (!m) continue;
      const { width = 0, height = 0 } = await sharp(join(DESTINO, f)).metadata();
      const lista = porId.get(m[1]) ?? [];
      lista.push({ size: Number(m[2]), width, height });
      porId.set(m[1], lista);
    }
  }

  const cuerpo = [...porId]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, variantes]) => {
      variantes.sort((a, b) => a.size - b.size);
      const mayor = variantes.at(-1);
      return `  '${id}': { width: ${mayor.width}, height: ${mayor.height}, variants: [${variantes.map((v) => v.size).join(', ')}] },`;
    })
    .join('\n');

  const ts = `/**
 * Manifiesto de fotos de perfil de «Conducere» — GENERADO.
 *
 * No lo edites a mano: lo escribe \`scripts/import-leadership-photos.mjs\`
 * leyendo \`src/assets/leadership/\`. Clave = \`id\` de la persona; \`variants\`
 * son los anchos disponibles (\`<id>-<ancho>.webp\`), de menor a mayor.
 */

export interface LeadershipPhotoManifestEntry {
  /** Medidas de la variante mayor (todas son retrato 4:5). */
  readonly width: number;
  readonly height: number;
  readonly variants: readonly number[];
}

export const LEADERSHIP_PHOTOS: Readonly<Record<string, LeadershipPhotoManifestEntry>> = {
${cuerpo}
};
`;
  await writeFile(MANIFIESTO, ts);
  console.log(`\nManifiesto: ${MANIFIESTO} (${porId.size} personas)`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: node scripts/import-leadership-photos.mjs "<carpeta o foto>" [...] | --manifest');
  process.exit(1);
}
if (args[0] !== '--manifest') await importar(args);
await generarManifiesto();
