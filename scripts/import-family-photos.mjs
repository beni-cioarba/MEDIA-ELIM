/**
 * Importa las fotos de «Rugăciune pentru familii» y regenera su manifiesto.
 *
 * La iglesia pasa una carpeta por semana con una foto por familia, con el
 * nombre de la familia como nombre de fichero («Bîrle Sebastian și Maria.png»).
 * Por cada foto se generan tres tamaños (lado mayor), para `srcset`:
 *
 *   src/assets/family-prayer/<AAAA-MM-DD>/<id>-480.webp    resumen, fondo difuminado
 *   src/assets/family-prayer/<AAAA-MM-DD>/<id>-960.webp    ficha en móvil / tableta
 *   src/assets/family-prayer/<AAAA-MM-DD>/<id>-1600.webp   ficha en escritorio, retina y proyección
 *
 * y después se **regenera** `src/app/core/family-photos.generated.ts` leyendo
 * lo que hay en disco (todas las semanas): medidas y tamaños reales de cada
 * foto. La configuración de familias ya no lleva medidas a mano; una foto
 * recortada de nuevo no puede quedar descuadrada respecto a sus datos.
 *
 * Calidad: reducción Lanczos3 + enfoque suave (compensa la pérdida de nitidez
 * de reducir) y WebP q84 con `smartSubsample` (bordes y tonos de piel sin
 * sangrado de color). Nunca se amplía: si el original es menor que un tamaño,
 * ese tamaño no se genera.
 *
 * Privacidad: son fotos de familias con menores. No se copia ningún metadato
 * (EXIF con GPS, móvil, fecha); `.rotate()` aplica antes la orientación y la
 * salida es sRGB.
 *
 * Uso:
 *   node scripts/import-family-photos.mjs "<carpeta con las fotos>" 2026-09-27
 *   node scripts/import-family-photos.mjs --manifest   (sólo regenera el manifiesto)
 *
 * La fecha es el **domingo** en que se presenta la semana. Reimportar una
 * semana **vacía antes su carpeta**: no quedan variantes huérfanas.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, parse } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'src/assets/family-prayer';
const MANIFIESTO = 'src/app/core/family-photos.generated.ts';

/** Lados mayores generados. El mayor cubre la ficha proyectada a 1080p y retina. */
const TAMANOS = [480, 960, 1600];

/** WebP: q84 es el punto en que las caras dejan de mostrar bloques a 2×. */
const WEBP = { quality: 84, effort: 6, smartSubsample: true };

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff']);

/**
 * «Bîrle Sebastian și Maria» → «birle-sebastian-maria». Es el `id` de la
 * familia en la configuración y el nombre del fichero.
 */
export function slugify(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((palabra) => palabra && palabra !== 'si')
    .join('-');
}

async function importarSemana(origen, fecha) {
  if (new Date(`${fecha}T12:00:00`).getDay() !== 0) {
    console.warn(`⚠ ${fecha} no es domingo: la semana se identifica por el domingo en que se presenta.`);
  }

  const ficheros = (await readdir(origen)).filter((f) => EXTENSIONES.has(extname(f).toLowerCase()));
  if (ficheros.length === 0) throw new Error(`No hay fotos en ${origen}`);

  const carpeta = join(DESTINO, fecha);
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });

  console.log(`\n${fecha} — ${ficheros.length} fotos`);
  for (const fichero of ficheros.sort((a, b) => a.localeCompare(b, 'ro'))) {
    const nombre = parse(fichero).name.normalize('NFC');
    const id = slugify(nombre);
    const base = sharp(join(origen, fichero)).rotate();
    const { width = 0, height = 0 } = await base.metadata();
    const lado = Math.max(width, height);

    // Tamaños que el original permite sin ampliar; si queda entre dos, el
    // mayor es el propio original (1281 px → 480 · 960 · 1281), no el de abajo.
    const tamanos = [...new Set([...TAMANOS.filter((t) => t < lado), Math.min(lado, TAMANOS.at(-1))])];

    const hechos = [];
    for (const tam of tamanos) {
      const salida = await base
        .clone()
        .resize(tam, tam, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
        .sharpen({ sigma: 0.55 })
        .webp(WEBP)
        .toBuffer({ resolveWithObject: true });
      await writeFile(join(carpeta, `${id}-${tam}.webp`), salida.data);
      hechos.push(`${tam} (${Math.round(salida.data.length / 1024)} kB)`);
    }

    const aviso = lado < TAMANOS[TAMANOS.length - 1] ? `  ⚠ original de ${lado} px: por debajo de ${TAMANOS.at(-1)}` : '';
    console.log(`  ${nombre} → ${id}  ${width}×${height}  ·  ${hechos.join(' · ')}${aviso}`);
  }
}

/** Lee todas las semanas en disco y escribe el manifiesto TypeScript. */
async function generarManifiesto() {
  const entradas = {};
  if (existsSync(DESTINO)) {
    for (const semana of (await readdir(DESTINO)).sort()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) continue;
      const ficheros = await readdir(join(DESTINO, semana));
      const porId = new Map();
      for (const f of ficheros) {
        const m = f.match(/^(.+)-(\d+)\.webp$/);
        if (!m) continue;
        const meta = await sharp(join(DESTINO, semana, f)).metadata();
        const lista = porId.get(m[1]) ?? [];
        lista.push({ size: Number(m[2]), width: meta.width, height: meta.height });
        porId.set(m[1], lista);
      }
      for (const [id, variantes] of [...porId].sort(([a], [b]) => a.localeCompare(b))) {
        variantes.sort((a, b) => a.size - b.size);
        const mayor = variantes.at(-1);
        entradas[`${semana}/${id}`] = {
          width: mayor.width,
          height: mayor.height,
          variants: variantes.map((v) => [v.size, v.width]),
        };
      }
    }
  }

  const cuerpo = Object.entries(entradas)
    .map(
      ([clave, v]) =>
        `  '${clave}': { width: ${v.width}, height: ${v.height}, variants: [${v.variants
          .map(([s, w]) => `[${s}, ${w}]`)
          .join(', ')}] },`,
    )
    .join('\n');

  const ts = `/**
 * Manifiesto de fotos de «Rugăciune pentru familii» — GENERADO.
 *
 * No lo edites a mano: lo escribe \`scripts/import-family-photos.mjs\` leyendo
 * \`src/assets/family-prayer/\`. Clave \`<domingo>/<id>\`; \`variants\` son los
 * pares [lado mayor del fichero, ancho real en px] para montar el \`srcset\`.
 */

export interface FamilyPhotoManifestEntry {
  /** Medidas de la variante mayor (proporción de la foto). */
  readonly width: number;
  readonly height: number;
  /** [sufijo del fichero (lado mayor), ancho real], de menor a mayor. */
  readonly variants: readonly (readonly [number, number])[];
}

export const FAMILY_PHOTOS: Readonly<Record<string, FamilyPhotoManifestEntry>> = {
${cuerpo}
};
`;
  await writeFile(MANIFIESTO, ts);
  console.log(`\n✓ Manifiesto: ${Object.keys(entradas).length} fotos → ${MANIFIESTO}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== '--manifest') {
    const [origen, fecha] = args;
    if (!origen || !/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) {
      console.error('Uso: node scripts/import-family-photos.mjs "<carpeta>" AAAA-MM-DD (domingo)');
      console.error('     node scripts/import-family-photos.mjs --manifest');
      process.exit(1);
    }
    await importarSemana(origen, fecha);
  }
  await generarManifiesto();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
