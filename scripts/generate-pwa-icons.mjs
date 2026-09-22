// Genera el icono de la app y todos sus derivados a partir del **emblema** de la
// iglesia (`scripts/assets-src/emblema-elim.png`, 674×674, fondo transparente).
//
// El emblema es el disco interior del sello institucional (paloma, cruz y llama
// sobre disco claro), sin el anillo de texto del departamento. Es la misma
// receta que usa la app administrativa (INEB_ELIM_Administrativ): así los
// iconos de las dos apps se reconocen como hermanos en la pantalla de inicio.
//
//  - Launcher / Apple: el emblema sobre baldosa navy de marca, al 78 % del lado.
//    Como es circular cabe entero en el círculo de seguridad de los iconos
//    "maskable" (80 %), así que **un mismo PNG sirve para `any` y `maskable`**.
//  - Favicon (16–32 px): al 84 %, que es lo máximo que admite la baldosa sin que
//    el disco toque el borde. A ese tamaño manda una sola forma legible.
//  - Todo se rasteriza desde el máster de 674 px, nunca desde un PNG ya reescalado.
//  - La baldosa es el navy de la marca (`navy(700)` = `--c-primary`, #1a365d),
//    el mismo de la app administrativa.
//
// Se ejecuta con `npm run pwa:icons` (usa `sharp`, ya en devDependencies). Los
// PNG resultantes se versionan; el máster no se publica.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, 'assets-src', 'emblema-elim.png');
const OUT_DIR = resolve(here, '..', 'src', 'assets', 'pwa');
const FAVICON_ICO = resolve(here, '..', 'src', 'favicon.ico');

/** Navy de marca (`navy(700)` en `_tokens.scss`): baldosa del icono. */
const NAVY = '#1a365d';
/** Emblema al 78 % del lado: cabe en el círculo de seguridad maskable (80 %). */
const LAUNCHER_RATIO = 0.78;
/** Favicon al 84 %: el símbolo lo más grande posible sin tocar el borde. */
const FAVICON_RATIO = 0.84;

/** Baldosa navy con el emblema centrado a la proporción indicada. */
async function tile(size, ratio) {
  const inner = Math.round(size * ratio);
  const emblem = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: emblem, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Contenedor ICO: cabecera + directorio + los PNG tal cual (todo navegador actual lo entiende). */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const dir = Buffer.alloc(16 * frames.length);
  let offset = header.length + dir.length;
  frames.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir[o] = size;
    dir[o + 1] = size;
    dir[o + 2] = 0; // paleta
    dir[o + 3] = 0; // reservado
    dir.writeUInt16LE(1, o + 4); // planos
    dir.writeUInt16LE(32, o + 6); // bits por píxel
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.png)]);
}

const kb = (buf) => `${(buf.length / 1024).toFixed(1)} kB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const outputs = [
    ['icon-512.png', 512, LAUNCHER_RATIO], // manifest (any + maskable)
    ['icon-192.png', 192, LAUNCHER_RATIO], // manifest (any + maskable)
    ['icon-180.png', 180, LAUNCHER_RATIO], // apple-touch-icon
    ['favicon-32.png', 32, FAVICON_RATIO], // <link rel="icon" sizes="32x32">
  ];
  for (const [name, size, ratio] of outputs) {
    const png = await tile(size, ratio);
    await writeFile(resolve(OUT_DIR, name), png);
    console.log(`${name.padEnd(16)} ${String(size).padStart(3)} px  ${kb(png)}`);
  }

  const frames = await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, png: await tile(size, FAVICON_RATIO) })),
  );
  const icoBuf = ico(frames);
  await writeFile(FAVICON_ICO, icoBuf);
  console.log(`favicon.ico      16/32/48  ${kb(icoBuf)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
