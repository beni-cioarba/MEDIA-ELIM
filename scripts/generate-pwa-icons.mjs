// Genera TODOS los iconos de la app (pestaña, instalación, pantalla de inicio,
// atajos) a partir del **emblema** de la iglesia
// (`scripts/assets-src/emblema-elim.png`, 674×674, fondo transparente: paloma,
// cruz y llama sobre disco claro con filete navy).
//
// Revisión del 29/09/2026 («profesional y futurista»). Cada uso tiene su pieza,
// como piden Chrome, Android e iOS (antes un mismo PNG hacía de todo):
//
//  · icon-any-{192,512}   → instalación en escritorio y diálogo de instalar.
//                            Baldosa de esquinas redondeadas (squircle 22 %)
//                            con degradado navy, brillo frío y el emblema con
//                            sombra suave. Esquinas transparentes: en Windows y
//                            macOS no sale un cuadrado duro.
//  · icon-maskable-{192,512} → Android recorta con su propia máscara (círculo,
//                            gota…): fondo a sangre y el emblema al 62 %, bien
//                            dentro del círculo de seguridad (80 %).
//  · icon-monochrome-512  → iconos temáticos de Android 13+: silueta blanca de
//                            paloma + cruz + llama, extraída píxel a píxel del
//                            propio emblema (lo que no es el disco blanco).
//  · icon-180             → apple-touch-icon: a sangre (iOS redondea solo).
//  · favicon-32 + favicon.ico (16/32/48) → la pestaña: el emblema a color a
//                            sangre (antes, el disco al 84 % sobre navy: una
//                            mancha). Ver la nota en `main()`.
//  · shortcut-*-192       → atajos del manifiesto (pulsación larga): baldosa
//                            navy con un icono de trazo blanco (los de la app).
//
// Todo se rasteriza desde el máster de 674 px. Se ejecuta con
// `npm run pwa:icons` (usa `sharp`, ya en devDependencies). Los PNG se
// versionan; el máster no se publica.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, 'assets-src', 'emblema-elim.png');
const OUT_DIR = resolve(here, '..', 'src', 'assets', 'pwa');
const FAVICON_ICO = resolve(here, '..', 'src', 'favicon.ico');

/** Paleta (`_tokens.scss`): navy 600 → 900 del degradado y oro (filete). */
const NAVY_TOP = '#24466f';
const NAVY_BOTTOM = '#0d1f35';
const GOLD = '#d4af37';

// ---------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------

/** Fondo: degradado navy + brillo frío arriba a la izquierda (SVG → PNG). */
function background(size, radius) {
  const r = radius * size;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${NAVY_TOP}"/>
          <stop offset="1" stop-color="${NAVY_BOTTOM}"/>
        </linearGradient>
        <!-- Brillo frío arriba a la izquierda (no dorado: el oro sobre el
             navy se mezclaba en un verde oliva sucio). -->
        <radialGradient id="glow" cx="0.18" cy="0.05" r="0.8">
          <stop offset="0" stop-color="#9db8dc" stop-opacity="0.38"/>
          <stop offset="1" stop-color="#9db8dc" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="shade" cx="0.2" cy="1" r="0.8">
          <stop offset="0" stop-color="#3b82f6" stop-opacity="0.14"/>
          <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
      <rect width="${size}" height="${size}" rx="${r}" fill="url(#glow)"/>
      <rect width="${size}" height="${size}" rx="${r}" fill="url(#shade)"/>
    </svg>`);
}

/** El emblema a un diámetro dado, con sombra suave debajo (profundidad). */
async function emblemWithShadow(size, diameter) {
  const d = Math.round(diameter);
  const emblem = await sharp(SRC).resize(d, d).png().toBuffer();
  const blur = Math.max(1, Math.round(d * 0.045));
  const shadow = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2 + d * 0.035}" r="${d / 2}" fill="#000" fill-opacity="0.45"/>
      </svg>`,
    ),
  )
    .blur(blur)
    .png()
    .toBuffer();
  return { emblem, shadow };
}

/** Icono completo: fondo + sombra + emblema centrado. */
async function launcher(size, { radius, ratio }) {
  const { emblem, shadow } = await emblemWithShadow(size, size * ratio);
  return sharp(background(size, radius))
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: emblem, gravity: 'center' },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Silueta del emblema (paloma + cruz + llama) en blanco sobre transparente:
 * los píxeles que se separan del blanco del disco, sin el filete del borde.
 * Devuelve el recorte ajustado al dibujo.
 */
async function glyph() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  // Radio interior del disco: fuera de él está el filete navy del borde.
  const inner = width * 0.43;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = Math.hypot(x - cx, y - cy) < inner;
      const a = data[i + 3];
      // «Tinta» = cuánto se aleja del blanco del disco (navy, negro y oro).
      const ink = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
      const alpha = inside && a > 0 ? Math.max(0, Math.min(255, (ink - 45) * 3.2)) : 0;
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.round((alpha * a) / 255);
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

/** La silueta encajada (alto `ratio` del lado) y centrada en un lienzo. */
async function glyphOn(size, ratio, base) {
  const g = await glyph();
  const h = Math.round(size * ratio);
  const fitted = await sharp(g).resize({ height: h, width: h, fit: 'inside' }).png().toBuffer();
  return sharp(base).composite([{ input: fitted, gravity: 'center' }]).png({ compressionLevel: 9 }).toBuffer();
}

/** Lienzo transparente o baldosa navy lisa (para favicon y monocromo). */
function canvas(size, fill, radius = 0) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      ${fill ? `<rect width="${size}" height="${size}" rx="${radius * size}" fill="${fill}"/>` : ''}
    </svg>`,
  );
}

/**
 * Atajo: baldosa navy redondeada con un icono de trazo blanco (mismos trazados
 * de 24×24 que `core/ui/icon-registry.ts`).
 */
function shortcut(size, paths) {
  const s = size * 0.5;
  const o = (size - s) / 2;
  return sharp(
    Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${NAVY_TOP}"/><stop offset="1" stop-color="${NAVY_BOTTOM}"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>
        <svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
             stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          ${paths.map((d) => `<path d="${d}"/>`).join('')}
        </svg>
      </svg>`),
  )
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Trazados de 24×24 (los mismos de `icon-registry.ts`). */
const SHORTCUT_ICONS = {
  announcements: ['M3 10v4a1 1 0 0 0 1 1h2.5l6.5 4V5L6.5 9H4a1 1 0 0 0-1 1z', 'M16.5 9.5a3.5 3.5 0 0 1 0 5', 'M19.5 7a7.5 7.5 0 0 1 0 10'],
  weekly: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M16 2v4M8 2v4M3 10h18'],
  live: ['M8 5.5v13l11-6.5z'],
  donate: ['M20 12v9H4v-9', 'M2.5 7h19v5h-19z', 'M12 21V7', 'M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z', 'M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z'],
};

/** Contenedor ICO: cabecera + directorio + los PNG tal cual. */
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
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.png)]);
}

const kb = (buf) => `${(buf.length / 1024).toFixed(1)} kB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const write = async (name, png) => {
    await writeFile(resolve(OUT_DIR, name), png);
    console.log(`${name.padEnd(26)} ${kb(png)}`);
  };

  // Instalación y pantalla de inicio.
  for (const size of [512, 192]) {
    await write(`icon-any-${size}.png`, await launcher(size, { radius: 0.225, ratio: 0.7 }));
    await write(`icon-maskable-${size}.png`, await launcher(size, { radius: 0, ratio: 0.62 }));
  }
  await write('icon-180.png', await launcher(180, { radius: 0, ratio: 0.72 }));
  await write('icon-monochrome-512.png', await glyphOn(512, 0.56, canvas(512, null)));

  // Pestaña: el emblema a color, a sangre (todo el cuadro, esquinas
  // transparentes). Se probaron la baldosa navy con el disco al 84 % (a 16 px,
  // una mancha) y la silueta blanca (alta y fina: una raya); el disco entero
  // con la paloma navy y la llama dorada es lo que se reconoce en pestañas
  // claras y oscuras, y rima con el icono instalado.
  const fav = (size) => sharp(SRC).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await write('favicon-32.png', await fav(32));
  const frames = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await fav(size) })));
  const icoBuf = ico(frames);
  await writeFile(FAVICON_ICO, icoBuf);
  console.log(`${'favicon.ico (16/32/48)'.padEnd(26)} ${kb(icoBuf)}`);

  // Atajos del manifiesto.
  for (const [id, paths] of Object.entries(SHORTCUT_ICONS)) {
    await write(`shortcut-${id}-192.png`, await shortcut(192, paths));
  }

  // Vista previa al compartir (og:image, 1200×630). JPEG: una foto de
  // degradados pesa un 80 % menos que en PNG y WhatsApp la carga antes.
  await write('og-image.jpg', await sharp(await ogImage()).jpeg({ quality: 86, mozjpeg: true }).toBuffer());
}

/**
 * Imagen de vista previa para redes (1200×630): el fondo del icono, el
 * emblema a la izquierda y el nombre a la derecha. Tipografía del sistema
 * (sharp rasteriza el SVG sin las webfonts): sans-serif limpia en blanco.
 */
async function ogImage() {
  const W = 1200;
  const H = 630;
  const bg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${NAVY_TOP}"/><stop offset="1" stop-color="${NAVY_BOTTOM}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.15" cy="0.05" r="0.85">
          <stop offset="0" stop-color="#9db8dc" stop-opacity="0.32"/><stop offset="1" stop-color="#9db8dc" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
      <rect x="560" y="258" width="64" height="4" rx="2" fill="${GOLD}"/>
      <text x="560" y="230" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="78"
            font-weight="700" fill="#ffffff">Biserica Elim</text>
      <text x="560" y="330" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="34"
            font-weight="600" letter-spacing="6" fill="#f3e3a6">ARGANDA DEL REY</text>
      <text x="560" y="400" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28"
            fill="#ffffff" fill-opacity="0.78">Program · Anunțuri · Transmisiuni · Rugăciune</text>
    </svg>`);
  // El lienzo de la sombra mide H×H con el círculo centrado: el emblema se
  // centra en ese mismo punto (x = y = H/2) para que la sombra caiga debajo.
  const D = 400;
  const { emblem, shadow } = await emblemWithShadow(H, D);
  return sharp(bg)
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: emblem, left: Math.round((H - D) / 2), top: Math.round((H - D) / 2) },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
