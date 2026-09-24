/**
 * Genera la variante intermedia (960 px) de las fotos de `drive-media/`.
 *
 * Por qué hace falta: las fotos existen a 1600 px (escritorio) y a 480 px
 * (miniatura), y no hay nada en medio. La portada las usa a pantalla completa,
 * así que **un teléfono se descargaba los 1600 px enteros** —112 kB para
 * pintar 390 px de ancho— y la miniatura de 480 se veía blanda en cuanto la
 * pantalla tenía el doble de densidad. Con la de 960, un móvil 2× coge lo que
 * necesita y nada más.
 *
 * Uso:
 *   node scripts/generate-image-sizes.mjs            (genera lo que falte)
 *   node scripts/generate-image-sizes.mjs --dry-run  (sólo dice qué haría)
 *
 * Es idempotente: una variante que ya existe se salta.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const CARPETA = 'src/assets/drive-media';

/** Ancho de la variante intermedia. Cubre móviles de densidad doble. */
const ANCHO = 960;

/** Calidad WebP: por encima de 85 el peso se dispara sin diferencia visible. */
const CALIDAD = 80;

const SUFIJO = `-${ANCHO}.webp`;

const dryRun = process.argv.includes('--dry-run');
const kb = (bytes) => Math.round(bytes / 1024);

async function main() {
  const entradas = await readdir(CARPETA);

  // Los originales: los `.webp` que no son ya una variante generada.
  const originales = entradas.filter(
    (f) => f.endsWith('.webp') && !f.endsWith('-thumb.webp') && !f.endsWith(SUFIJO),
  );

  let hechas = 0;

  for (const archivo of originales) {
    const destino = archivo.replace(/\.webp$/, SUFIJO);
    if (entradas.includes(destino)) {
      console.log(`· ${destino} — ya existe`);
      continue;
    }

    const origen = join(CARPETA, archivo);
    const info = await stat(origen);
    const entrada = await readFile(origen);
    const meta = await sharp(entrada).metadata();

    if (meta.width <= ANCHO) {
      console.log(`· ${archivo} — ya mide ${meta.width} px, no hace falta`);
      continue;
    }

    const salida = await sharp(entrada)
      .resize({ width: ANCHO, withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toBuffer();

    const resumen =
      `${archivo} (${meta.width} px, ${kb(info.size)} kB)` +
      ` → ${destino} (${ANCHO} px, ${kb(salida.length)} kB)`;

    if (dryRun) {
      console.log(`· [simulación] ${resumen}`);
    } else {
      await writeFile(join(CARPETA, destino), salida);
      console.log(`✓ ${resumen}`);
    }
    hechas++;
  }

  const verbo = dryRun ? 'se generaría(n)' : 'generada(s)';
  console.log(hechas > 0 ? `\n${hechas} variante(s) ${verbo}.` : '\nNo faltaba ninguna.');
}

await main();
