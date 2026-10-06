#!/usr/bin/env node
/**
 * Optimiza las imágenes de assets/drive-media/.
 *
 * Para cada *.jpg/*.png/*.jpeg genera las variantes de la portada:
 *   - <nombre>-2560.webp      → pantallas anchas / alta densidad (calidad 80),
 *                               SÓLO si el original mide >= 2400 px de ancho
 *   - <nombre>.webp           → versión hero (1600px ancho máx, calidad 82)
 *   - <nombre>-960.webp       → móviles de densidad doble (calidad 80)
 *   - <nombre>-thumb.webp     → versión miniatura (480px ancho máx, calidad 72)
 *
 * Calidad: la portada se ve a pantalla completa, así que manda la nitidez.
 * Con 78 y tope de 1600 px las fotos se veían blandas en un monitor de 1920
 * (oct. 2026). Si el original ya viene comprimido (WhatsApp, captura de
 * vídeo), ninguna variante lo arregla: pide el fichero de la cámara.
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
const LARGE_WIDTH = 2560;
const LARGE_MIN_SOURCE = 2400;
const LARGE_QUALITY = 80;
const HERO_WIDTH = 1600;
const HERO_QUALITY = 82;
const MEDIUM_WIDTH = 960;
const MEDIUM_QUALITY = 80;
const THUMB_WIDTH = 480;
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

    // Ancho ya girado: con orientación EXIF 5-8 el ancho real es el alto.
    const meta = await sharp(inputPath).metadata();
    const sourceWidth = (meta.orientation ?? 1) >= 5 ? meta.height ?? 0 : meta.width ?? 0;
    const largeOut = path.join(SRC_DIR, `${base}-2560.webp`);
    const mediumOut = path.join(SRC_DIR, `${base}-960.webp`);

    if (sourceWidth >= LARGE_MIN_SOURCE) {
      await sharp(inputPath)
        .rotate()
        .resize({ width: LARGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: LARGE_QUALITY, effort: 5, smartSubsample: true })
        .toFile(largeOut);
    } else {
      console.warn(
        `⚠️  ${file} mide ${sourceWidth}px: sin variante 2560, en monitores grandes se verá blanda.`,
      );
    }

    await sharp(inputPath)
      .rotate()
      .resize({ width: HERO_WIDTH, withoutEnlargement: true })
      .webp({ quality: HERO_QUALITY, effort: 5, smartSubsample: true })
      .toFile(heroOut);

    await sharp(inputPath)
      .rotate()
      .resize({ width: MEDIUM_WIDTH, withoutEnlargement: true })
      .webp({ quality: MEDIUM_QUALITY, effort: 5 })
      .toFile(mediumOut);

    await sharp(inputPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY, effort: 5 })
      .toFile(thumbOut);

    const outSize = [largeOut, heroOut, mediumOut, thumbOut]
      .filter((f) => fs.existsSync(f))
      .reduce((sum, f) => sum + fs.statSync(f).size, 0);
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
    '👉 Saca los .jpg originales de la carpeta (no se publican), pero GUÁRDALOS: sin ellos no se\n' +
      '   pueden regenerar las fotos a más resolución. Añade `large` en heroSlides si se creó la -2560.',
  );
})();

function formatKB(bytes) {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(bytes / 1024) + ' KB';
}
