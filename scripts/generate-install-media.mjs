/**
 * Láminas de instalación y manifiestos, por idioma (`npm run pwa:install`).
 *
 *  · `src/assets/pwa/install/<idioma>/<lámina>.jpg`       1080×1920 → hoja «Instalar» de Chrome en Android
 *  · `…/<lámina>-wide.jpg`                                 1920×1080 → la de Chrome y Edge de escritorio
 *  · `…/<lámina>-thumb.webp`                                432×768  → nuestra hoja (iPhone, iPad, Samsung…)
 *  · `src/manifest.webmanifest` (rumano) y `src/manifest.es.webmanifest`
 *  · `scripts/assets-src/install-media.lock.json`          huella de lo pintado
 *
 * Los textos están en `lib/install-media.mjs`; aquí sólo cómo se dibujan:
 * HTML y CSS con las tipografías de la web (`@fontsource-variable/*`),
 * fotografiado con el Chrome instalado (`playwright-core`) y comprimido con
 * `sharp`. Marca según `docs/ai/45-design-system.md`: wordmark tipográfico con
 * las proporciones de `app-brand-logo`; el emblema, sólo dentro del icono.
 *
 * Fotos: las que ya publica la web, de espaldas o de lejos (hay menores: nada
 * de primeros planos). Sin fechas: una lámina no caduca.
 *
 * JPEG y no WebP: Chrome sólo documenta JPEG y PNG para `screenshots`.
 *
 *   node scripts/generate-install-media.mjs [--manifests]   # sólo los manifiestos
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LANGS, MAX_PLATE_BYTES, PLATES, SIZES, manifestFile, plateFile, programRows, renderManifest, sourceDigest } from './lib/install-media.mjs';
import { loadTsModule } from './lib/load-ts-module.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (path) => join(ROOT, path);
const url = (path) => pathToFileURL(at(path)).href;

const font = (family, pkg, file) =>
  ['latin', 'latin-ext']
    .map(
      (subset) => `@font-face{font-family:'${family}';font-weight:100 900;src:url('${url(
        `node_modules/@fontsource-variable/${pkg}/files/${file}-${subset}-wght-normal.woff2`,
      )}') format('woff2');${subset === 'latin-ext' ? 'unicode-range:U+0100-02BA,U+1E00-1E9F,U+2020-20C0;' : ''}}`,
    )
    .join('\n');

/** Trazados de 24×24 (los de `core/ui/icon-registry.ts`). */
const ICONS = {
  megaphone: ['M3 10v4a1 1 0 0 0 1 1h2.5l6.5 4V5L6.5 9H4a1 1 0 0 0-1 1z', 'M16.5 9.5a3.5 3.5 0 0 1 0 5', 'M19.5 7a7.5 7.5 0 0 1 0 10'],
  calendar: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M16 2v4M8 2v4M3 10h18'],
  heart: ['M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.6 8.8-8.6a5.5 5.5 0 0 0 0-7.8z'],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8.5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'm21 15-4-4L6 21'],
  play: ['M8 5.5v13l11-6.5z'],
};
const svg = (name, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICONS[name]
    .map((d) => `<path d="${d}"/>`)
    .join('')}</svg>`;

// ---------------------------------------------------------------------
// Ilustraciones: una por lámina, en un lienzo de 1080 de ancho.
// ---------------------------------------------------------------------
const ART = {
  welcome: () => `<img class="icon" src="${url('src/assets/pwa/icon-any-512.png')}" alt="">`,
  program: (plate, lang, weekly) => `
    <div class="sheet"><div class="sheet__rings"><i></i><i></i></div>
      ${programRows(weekly, lang)
        .map((row) => `<div class="row${row.time.includes('·') ? ' row--main' : ''}"><b>${row.day}</b><span>${row.time}</span></div>`)
        .join('')}
    </div>`,
  cards: (plate, lang) => `
    <div class="cards">${['megaphone', 'calendar', 'heart', 'image']
      .map((name, i) => `<div class="card card--${i}"><i>${svg(name)}</i><b>${plate.cards[lang][i]}</b></div>`)
      .join('')}</div>`,
  reading: (plate, lang) => `
    <div class="phone"><div class="phone__screen">
      <div class="phone__clock">8:00</div>
      <div class="notice"><img src="${url('src/assets/pwa/shortcut-impreuna-192.png')}" alt="">
        <div><b>${plate.notice[lang][0]}</b><span>${plate.notice[lang][1]}</span></div></div>
      <div class="phone__note">${plate.note[lang]}</div>
    </div></div>`,
  live: (plate, lang) => `
    <div class="player"><img src="${url('src/assets/drive-media/ancorat_2026_predica.webp')}" alt="">
      <span class="player__chip"><i></i>${plate.chip[lang]}</span>
      <span class="player__play">${svg('play', 'class="solid"')}</span>
      <span class="player__bar"><i></i></span></div>`,
};

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased}
.plate{position:relative;width:100%;height:100%;overflow:hidden;color:#fff}
.brand{display:grid;grid-template-columns:max-content;row-gap:calc(var(--s)*.07);line-height:1;--s:96px}
.brand b{font:600 var(--s)/1 'Playfair Display';letter-spacing:.16em;margin-right:-.16em;color:var(--ink)}
.brand span{width:0;min-width:100%;font:600 calc(var(--s)*.289)/1 Inter;letter-spacing:.06em;margin-right:-.06em;text-align-last:justify;color:var(--accent)}
h1{font-weight:800;font-size:114px;line-height:1.05;letter-spacing:-.03em;text-wrap:nowrap}
h1 span{display:block}
.copy{position:relative;z-index:2;display:grid;justify-items:center;gap:72px;text-align:center}
.art{position:relative;z-index:1}
/* Temas */
.t-photo,.t-navy,.t-blue{--ink:#faf9f6;--accent:#d4af37}
.t-gold,.t-paper{--ink:#1a365d;--accent:#1a365d;color:#122844}
.t-paper{--accent:#856618}
.t-photo{background:#0d1f35}
.t-photo::before{content:'';position:absolute;inset:0;background:url('${url('src/assets/drive-media/fanfara_2026.webp')}') 64% 100%/auto 78% no-repeat}
.t-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0d1f35 21%,rgba(13,31,53,.72) 36%,rgba(26,54,93,.12) 62%,rgba(13,31,53,.62) 100%)}
.t-navy{background:radial-gradient(90% 60% at 15% 0%,#2c5282 0%,transparent 70%),linear-gradient(160deg,#1a365d,#0d1f35)}
.t-blue{background:radial-gradient(80% 55% at 85% 30%,#4a6f9c 0%,transparent 70%),linear-gradient(170deg,#24466f,#122844)}
.t-gold{background:radial-gradient(100% 60% at 20% 0%,#f8edc4 0%,transparent 70%),linear-gradient(165deg,#e3c766,#c9a032)}
.t-paper{background:radial-gradient(90% 55% at 85% 0%,#f8edc4 0%,transparent 65%),linear-gradient(180deg,#faf9f6,#eef1f6)}
/* Rayos suaves desde abajo: profundidad sin imagen. */
.t-navy::before,.t-blue::before,.t-gold::before{content:'';position:absolute;left:50%;top:62%;width:2600px;height:2600px;margin:-1300px;background:repeating-conic-gradient(from 6deg,rgba(255,255,255,.055) 0 10deg,transparent 10deg 22deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 62%)}
.t-gold::before{background:repeating-conic-gradient(from 6deg,rgba(255,255,255,.2) 0 10deg,transparent 10deg 22deg)}
/* Vertical */
.narrow .copy{position:absolute;top:118px;left:0;right:0}
.narrow .art{position:absolute;left:0;right:0;top:860px;bottom:0;display:grid;justify-items:center;align-items:start}
.narrow.l-2 .art{top:760px}
/* Horizontal */
.wide .copy{position:absolute;left:130px;top:0;bottom:0;width:820px;align-content:center;justify-items:start;text-align:left;gap:60px}
.wide .brand{--s:104px}
.wide h1{font-size:122px}
.wide .art{position:absolute;right:90px;top:0;bottom:0;width:840px;display:grid;place-items:center}
.wide .t-photo::before,.wide.t-photo::before{background-size:cover;background-position:50% 70%}
.wide.t-photo::after{background:linear-gradient(90deg,#0d1f35 20%,rgba(13,31,53,.7) 46%,rgba(13,31,53,.18) 100%)}
.wide.t-navy::before,.wide.t-blue::before,.wide.t-gold::before{left:74%;top:50%}
/* Icono */
.icon{width:470px;height:470px;filter:drop-shadow(0 40px 60px rgba(0,0,0,.55))}
.narrow .icon{margin-top:170px}
/* Programa */
.sheet{position:relative;width:820px;padding:54px 60px 62px;border-radius:64px;background:#fff;color:#122844;box-shadow:0 50px 110px -20px rgba(90,64,8,.55)}
.narrow .sheet{margin-top:-6px}
.sheet__rings{position:absolute;top:-34px;left:0;right:0;display:flex;justify-content:space-between;padding:0 190px}
.sheet__rings i{width:34px;height:92px;border-radius:17px;background:#1a365d}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:40px;padding:27px 20px;font-size:60px;line-height:1;border-bottom:3px solid #eef1f6;font-variant-numeric:tabular-nums}
.row:last-child{border:0}
.row b{font-weight:700}
.row span{font-weight:600;color:#4a5568}
.row--main{margin-top:18px;border:0;border-radius:32px;background:#1a365d;color:#fff;padding:36px 40px}
.row--main b{font-size:56px}
.row--main{gap:20px}
.row--main span{color:#e3c766;font-weight:800;white-space:nowrap;font-size:50px}
.wide .sheet{width:760px;padding:40px 46px 46px}
.wide .row{font-size:52px;padding:20px 18px}
.wide .row--main{padding:28px 28px}
.wide .row--main span{font-size:46px}
.wide .row--main b{font-size:50px}
/* Tarjetas */
.cards{position:relative;width:100%;height:1000px}
.card{position:absolute;display:flex;align-items:center;gap:40px;width:780px;padding:38px 44px;border-radius:52px;background:#fff;color:#122844;font-size:72px;box-shadow:0 36px 70px -18px rgba(0,0,0,.55)}
.card i{display:grid;place-items:center;width:136px;height:136px;border-radius:38px;background:linear-gradient(140deg,#24466f,#122844);color:#fff}
.card i svg{width:78px;height:78px}
.card b{font-weight:700;letter-spacing:-.02em}
.card--0{left:70px;top:0;transform:rotate(-3deg)}
.card--1{right:50px;top:232px;transform:rotate(2deg)}
.card--2{left:60px;top:470px;transform:rotate(-1.5deg)}
.card--3{right:70px;top:704px;transform:rotate(2.5deg)}
.card--1 i,.card--3 i{background:linear-gradient(140deg,#e3c766,#bf9a2b);color:#122844}
/* Teléfono */
.phone{width:760px;height:1300px;padding:26px;border-radius:116px;background:linear-gradient(140deg,#2d3748,#0b1320);box-shadow:0 60px 120px -20px rgba(13,31,53,.6),inset 0 0 0 4px rgba(255,255,255,.14)}
.narrow .phone{margin-top:-70px}
.phone__screen{height:100%;border-radius:92px;padding:120px 34px 0;background:radial-gradient(110% 60% at 80% 0%,#4a6f9c,transparent 70%),linear-gradient(180deg,#1a365d,#0d1f35);color:#fff;text-align:center}
.phone__clock{font:700 230px/1 'Plus Jakarta Sans';letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.notice{display:flex;align-items:center;gap:30px;margin-top:70px;padding:34px 32px;border-radius:52px;background:rgba(255,255,255,.96);color:#122844;text-align:left}
.notice img{width:128px;height:128px}
.notice b,.notice span{display:block;white-space:nowrap}
.notice b{font-size:52px;font-weight:800;letter-spacing:-.02em}
.notice span{margin-top:8px;font-size:39px;font-weight:500;color:#4a5568}
.phone__note{margin-top:40px;font-size:42px;font-weight:600;color:#e3c766}
/* Directo */
.player{position:relative;width:940px;aspect-ratio:1/1.02;border-radius:56px;overflow:hidden;background:#000;box-shadow:0 60px 120px -20px rgba(0,0,0,.7),0 0 0 8px rgba(255,255,255,.12)}
.narrow .player{margin-top:30px}
.wide .player{width:760px;aspect-ratio:1/1}
.player img{width:100%;height:100%;object-fit:cover;object-position:56% 50%}
.player::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,31,53,.3),rgba(13,31,53,0) 40%,rgba(13,31,53,.6))}
.player__chip{position:absolute;z-index:1;left:38px;top:38px;display:flex;align-items:center;gap:20px;padding:18px 34px;border-radius:99px;background:#fff;color:#122844;font-size:48px;font-weight:800;letter-spacing:.02em}
.player__chip i{width:30px;height:30px;border-radius:50%;background:#c53030}
.player__play{position:absolute;z-index:1;inset:0;margin:auto;display:grid;place-items:center;width:200px;height:200px;top:40%;border-radius:50%;background:linear-gradient(140deg,#e3c766,#d4af37);color:#122844;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.player__play svg{width:112px;height:112px;margin-left:10px}
.player__play .solid{fill:currentColor}
.player__bar{position:absolute;z-index:1;left:44px;right:44px;bottom:44px;height:16px;border-radius:8px;background:rgba(255,255,255,.4)}
.player__bar i{display:block;width:100%;height:100%;border-radius:8px;background:#d4af37}
`;

function html(plate, lang, shape, weekly) {
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
${font('Plus Jakarta Sans', 'plus-jakarta-sans', 'plus-jakarta-sans')}
${font('Playfair Display', 'playfair-display', 'playfair-display')}
${font('Inter', 'inter', 'inter')}
${CSS}</style>
<div class="plate ${shape} t-${plate.theme} l-${plate.title[lang].length}">
  <div class="copy"><div class="brand"><b>ELIM</b><span>ARGANDA DEL REY</span></div>
  <h1>${plate.title[lang].map((line) => `<span>${line}</span>`).join('')}</h1></div>
  <div class="art">${ART[plate.art](plate, lang, weekly)}</div>
</div></html>`;
}

async function launch() {
  const { chromium } = await import('playwright-core');
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* siguiente */
    }
  }
  throw new Error('No hay Chrome ni Edge instalados.');
}

/** La mejor calidad que cabe en el peso máximo. */
async function encodeJpeg(sharp, png) {
  for (let quality = 86; quality >= 60; quality -= 4) {
    const out = await sharp(png).jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
    if (out.length <= MAX_PLATE_BYTES) return out;
  }
  throw new Error('La lámina no baja de peso: simplifica la foto.');
}

async function renderPlates(weekly) {
  const sharp = (await import('sharp')).default;
  const work = await mkdtemp(join(tmpdir(), 'elim-install-'));
  const browser = await launch();
  try {
    for (const shape of ['narrow', 'wide']) {
      const page = await browser.newPage({ viewport: SIZES[shape], deviceScaleFactor: 1 });
      for (const lang of LANGS) {
        for (const plate of PLATES.filter((p) => shape === 'narrow' || p.wide)) {
          const file = join(work, `${lang}-${plate.id}-${shape}.html`);
          await writeFile(file, html(plate, lang, shape, weekly));
          await page.goto(pathToFileURL(file).href);
          await page.evaluate(() => document.fonts.ready);
          // Un titular que se sale sería una lámina cortada: mejor fallar aquí.
          const overflow = await page.evaluate(() =>
            [...document.querySelectorAll('h1 span,.card b,.notice b,.notice span,.row')].some((el) => {
              const box = el.getBoundingClientRect();
              return el.scrollWidth > el.clientWidth + 1 || box.right > innerWidth - 24 || box.left < 24;
            }),
          );
          if (overflow) throw new Error(`Texto que no cabe: ${lang}/${plate.id} (${shape})`);
          const png = await page.screenshot({ type: 'png' });
          const save = async (kind, buffer) => {
            const out = at(`src/${plateFile(plate, lang, kind)}`);
            await mkdir(dirname(out), { recursive: true });
            await writeFile(out, buffer);
            console.log(`${plateFile(plate, lang, kind).padEnd(48)} ${(buffer.length / 1024).toFixed(0)} kB`);
          };
          await save(shape, await encodeJpeg(sharp, png));
          if (shape === 'narrow') {
            const { width, height } = SIZES.thumb;
            await save('thumb', await sharp(png).resize(width, height).webp({ quality: 80 }).toBuffer());
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await rm(work, { recursive: true, force: true });
  }
}

const { PUBLIC_URL } = loadTsModule(at('src/app/core/site.ts'));
const { WEEKLY_PROGRAM } = loadTsModule(at('src/app/core/content/weekly.content.ts'));
const publicUrl = PUBLIC_URL.endsWith('/') ? PUBLIC_URL : `${PUBLIC_URL}/`;

if (!process.argv.includes('--manifests')) {
  await rm(at('src/assets/pwa/install'), { recursive: true, force: true });
  await renderPlates(WEEKLY_PROGRAM);
  await writeFile(
    at('scripts/assets-src/install-media.lock.json'),
    `${JSON.stringify({ painted: sourceDigest(WEEKLY_PROGRAM) }, null, 2)}\n`,
  );
}
for (const lang of LANGS) {
  const file = at(`src/${manifestFile(lang)}`);
  const next = renderManifest(lang, publicUrl);
  const current = await readFile(file, 'utf8').catch(() => '');
  if (current !== next) await writeFile(file, next);
  console.log(`src/${manifestFile(lang)}${current === next ? ' (sin cambios)' : ''}`);
}
