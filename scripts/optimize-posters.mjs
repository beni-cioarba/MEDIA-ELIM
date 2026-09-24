/**
 * Optimiza los carteles de `src/assets/posters/`.
 *
 * Por qué existe: los carteles llegan tal cual salen de Canva —PNG de 6 a
 * 10 MB y 2000+ px de lado—. En la tarjeta de la portada se ven a 296 px de
 * alto, así que ese peso es íntegramente tiempo de carga tirado. Este script
 * los deja en WebP de 1080 px y calidad 80 (entre 80 y 200 kB), que es lo que
 * pide `src/assets/posters/README.md`.
 *
 * Además arregla los nombres que deja el navegador al descargar:
 * `cartel.webp.png`, `cartel.webp (1).png` → `cartel.webp`.
 *
 * Uso:
 *   node scripts/optimize-posters.mjs            (optimiza lo que haga falta)
 *   node scripts/optimize-posters.mjs --dry-run  (sólo dice qué haría)
 *
 * Es idempotente: un cartel ya optimizado se salta.
 */

import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const CARPETA = 'src/assets/posters';

/** Lado mayor final. En la tarjeta se ve a 296 px; 1080 cubre pantallas 2×. */
const LADO_MAYOR = 1080;

/** Calidad WebP. Por encima de 85 el peso se dispara sin diferencia visible. */
const CALIDAD = 80;

/** A partir de aquí se considera que un WebP ya está optimizado. */
const LIMITE_KB = 320;

const dryRun = process.argv.includes('--dry-run');

/**
 * Limpia el nombre que deja el navegador: quita el `(1)` de las descargas
 * repetidas y la doble extensión `.webp.png`.
 */
function nombreLimpio(archivo) {
  return archivo
    .replace(/\s*\(\d+\)/g, '')
    .replace(/\.(webp|jpe?g|png)\.(png|jpe?g|webp)$/i, '.$1')
    .replace(/\.(png|jpe?g)$/i, '.webp');
}

const kb = (bytes) => Math.round(bytes / 1024);

async function main() {
  let entradas;
  try {
    entradas = await readdir(CARPETA);
  } catch {
    console.error(`No existe ${CARPETA}. Nada que hacer.`);
    process.exit(0);
  }

  const carteles = entradas.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (carteles.length === 0) {
    console.log('No hay carteles que optimizar.');
    return;
  }

  let tocados = 0;

  for (const archivo of carteles) {
    const origen = join(CARPETA, archivo);
    const destino = join(CARPETA, nombreLimpio(archivo));
    const info = await stat(origen);

    // Ya es un WebP con nombre correcto y peso razonable: se deja en paz.
    if (origen === destino && extname(archivo).toLowerCase() === '.webp' && kb(info.size) <= LIMITE_KB) {
      console.log(`· ${archivo} — ya optimizado (${kb(info.size)} kB)`);
      continue;
    }

    const entrada = await readFile(origen);
    const meta = await sharp(entrada).metadata();
    const salida = await sharp(entrada)
      .resize({
        width: meta.width >= meta.height ? LADO_MAYOR : null,
        height: meta.height > meta.width ? LADO_MAYOR : null,
        withoutEnlargement: true,
      })
      .webp({ quality: CALIDAD })
      .toBuffer();

    const resumen =
      `${archivo} (${meta.width}×${meta.height}, ${kb(info.size)} kB)` +
      ` → ${basename(destino)} (${kb(salida.length)} kB)`;

    if (dryRun) {
      console.log(`· [simulación] ${resumen}`);
      tocados++;
      continue;
    }

    await writeFile(destino, salida);
    if (origen !== destino) await unlink(origen);
    console.log(`✓ ${resumen}`);
    tocados++;
  }

  console.log(
    tocados > 0
      ? `\n${tocados} cartel(es) optimizado(s).`
      : '\nTodo estaba ya optimizado.',
  );
}

await main();
