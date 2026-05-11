// Genera los iconos PWA (192/512, normales y maskable) a partir del logo
// principal `assets/logo-elim.png`.
// Para los maskable se añade un padding (~16%) y un fondo oscuro acorde
// al theme-color (#060914) para que el icono no quede recortado al ser
// renderizado dentro de la "safe zone" en Android.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '..', 'src', 'assets', 'logo-elim.png');
const OUT_DIR = resolve(here, '..', 'src', 'assets', 'pwa');

const BG = '#060914';

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function makeStandard(size, outName) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT_DIR, outName));
}

async function makeMaskable(size, outName) {
  // Maskable: fondo opaco + ~16% padding en cada lado para "safe zone".
  const inner = Math.round(size * 0.68);
  const overlay = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: overlay, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT_DIR, outName));
}

async function main() {
  await ensureDir(OUT_DIR);
  await Promise.all([
    makeStandard(192, 'icon-192.png'),
    makeStandard(512, 'icon-512.png'),
    makeMaskable(192, 'icon-192-maskable.png'),
    makeMaskable(512, 'icon-512-maskable.png'),
  ]);
  console.log('PWA icons generated in', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
