#!/usr/bin/env node
/**
 * Optimiza las imágenes de assets/drive-media/.
 *
 * Para cada *.jpg/*.png/*.jpeg genera DOS variantes:
 *   - <nombre>.webp           → versión hero (1600px ancho máx, calidad 78)
 *   - <nombre>-thumb.webp     → versión miniatura (480px ancho máx, calidad 72)
 *
 * Reduce típicamente 18 MB → 250 KB (~70x más pequeño).
 *
 * Requisitos:
 *   npm i -D sharp
 *
 * Uso:
 *   node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error(
    '\n❌ Falta la dependencia "sharp". Instálala con:\n   npm i -D sharp\n',
  );
  process.exit(1);
}

const SRC_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'drive-media');
const HERO_WIDTH = 1600;
const THUMB_WIDTH = 480;
const HERO_QUALITY = 78;
const THUMB_QUALITY = 72;

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ No existe la carpeta ${SRC_DIR}`);
  process.exit(1);
}

const exts = new Set(['.jpg', '.jpeg', '.png']);

(async () => {
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => exts.has(path.extname(f).toLowerCase()) && !f.includes('-thumb'));

  if (files.length === 0) {
    console.log('ℹ️  No se encontraron imágenes para optimizar.');
    return;
  }

  let totalIn = 0;
  let totalOut = 0;

  for (const file of files) {
    const inputPath = path.join(SRC_DIR, file);
    const base = path.basename(file, path.extname(file));
    const heroOut = path.join(SRC_DIR, `${base}.webp`);
    const thumbOut = path.join(SRC_DIR, `${base}-thumb.webp`);

    const stat = fs.statSync(inputPath);
    totalIn += stat.size;

    await sharp(inputPath)
      .rotate()
      .resize({ width: HERO_WIDTH, withoutEnlargement: true })
      .webp({ quality: HERO_QUALITY, effort: 5 })
      .toFile(heroOut);

    await sharp(inputPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY, effort: 5 })
      .toFile(thumbOut);

    const outSize = fs.statSync(heroOut).size + fs.statSync(thumbOut).size;
    totalOut += outSize;

    const ratio = (stat.size / outSize).toFixed(1);
    console.log(
      `✓ ${file}  ${formatKB(stat.size)} → ${formatKB(outSize)}  (${ratio}x)`,
    );
  }

  console.log(
    `\n✅ Total: ${formatKB(totalIn)} → ${formatKB(totalOut)}  (${(totalIn / totalOut).toFixed(1)}x más pequeño)\n`,
  );
  console.log(
    '👉 Ahora puedes BORRAR los .jpg originales si quieres (las versiones .webp ya cubren todo).',
  );
})();

function formatKB(bytes) {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(bytes / 1024) + ' KB';
}
