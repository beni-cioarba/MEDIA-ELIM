/**
 * Prueba de humo de la web **compilada**, antes de publicarla.
 *
 * Sirve la compilación como GitHub Pages (`serve-dist.mjs`), abre cada página
 * estática en dos anchos (escritorio y teléfono) con el Chrome instalado y
 * comprueba lo que se auditó a mano en noviembre de 2026
 * (`docs/ai/76-plan-maestro.md` § 2.7): estado HTTP, consola limpia, un `h1`,
 * un `main`, sin desbordes, contraste, objetivos táctiles, nombres accesibles
 * y claves sin traducir (`page-audit.mjs`). Después:
 *   · pide por HTTP cada enlace interno encontrado: ninguno puede dar 404;
 *   · abre la ventana de proyección a 1920 × 1080 y recorre el carrusel:
 *     ninguna diapositiva en blanco, ningún error.
 *
 * Uso (tras `ng build` + `generate-route-pages.mjs`):
 *   node scripts/e2e/smoke.mjs --dist dist/iglesia-redes/browser
 *   … --only /contact/        sólo esa página
 *   … --browser msedge        (por defecto: $PDF_BROWSER, chrome, msedge)
 *
 * Sale con 1 si hay algún fallo. Las páginas se miran con
 * `prefers-reduced-motion: reduce`: sin eso, un texto a mitad de su animación
 * de entrada mide menos contraste del que tiene.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { ROBOTS_DISALLOW } from '../generate-route-pages.mjs';
import { auditPage } from './page-audit.mjs';
import { serveDist } from './serve-dist.mjs';

const args = parseArgs(process.argv.slice(2));
const DIST = resolve(args.dist ?? 'dist/iglesia-redes/browser');

const VIEWPORTS = [
  { name: 'escritorio', mobile: false, context: { viewport: { width: 1366, height: 768 } } },
  {
    name: 'teléfono',
    mobile: true,
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
];
/** Lienzo de la proyección: 1080p, el que se usa para medir `--pj-u`. */
const PROJECTION = { width: 1920, height: 1080 };
/** Diapositivas que se recorren como mucho (el carrusel es circular). */
const MAX_SLIDES = 40;
/** Espera tras cargar: `@defer` en reposo, fuentes, primer render de datos. */
const SETTLE_MS = 900;

// Herramientas del operador: existen sólo como rutas de la app (sin página
// estática), así que por HTTP dan 404 a propósito.
const OPERATOR_PATHS = ROBOTS_DISALLOW;

// Colecciones de URL con datos (ver `sample`).
const DATA_COLLECTIONS = ['/anunturi/', '/conducere/', '/botezuri/', '/rugaciune-pentru-familii/', '/impreuna/ziua/'];

const { origin, close } = await serveDist(DIST);
const browser = await launch(args.browser);
const problems = [];
const report = (where, regla, detalle) => problems.push({ where, regla, detalle });

try {
  const roots = await i18nRoots();
  const pages = sample(await staticPages(DIST)).filter((p) => !args.only || p === args.only);
  if (pages.length === 0) throw new Error(`No hay páginas que probar en ${DIST}.`);
  console.log(`Prueba de humo: ${pages.length} páginas × ${VIEWPORTS.length} anchos (${origin})`);

  const links = new Set();
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      ...viewport.context,
      locale: 'ro-RO',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    for (const path of pages) {
      const where = `${path} [${viewport.name}]`;
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !isThirdParty(message)) errors.push(describe(message));
      });
      page.on('pageerror', (error) => errors.push(`excepción: ${String(error).slice(0, 200)}`));
      try {
        const response = await page.goto(origin + path, { waitUntil: 'load', timeout: 45_000 });
        if (response?.status() !== 200) report(where, 'http', `estado ${response?.status()}`);
        await page.waitForSelector('app-root h1, app-root main', { timeout: 15_000 });
        await settle(page);
        const result = await page.evaluate(auditPage, { mobile: viewport.mobile, roots });
        for (const f of result.fallos) report(where, f.regla, f.detalle);
        for (const link of result.links) links.add(link);
        for (const error of new Set(errors)) report(where, 'consola', error);
      } catch (error) {
        report(where, 'carga', String(error).split('\n')[0].slice(0, 200));
      }
      await page.close();
    }
    await context.close();
  }

  if (!args.only) {
    await checkLinks(links);
    await checkProjection();
  }
} finally {
  await browser.close();
  await close();
}

if (problems.length === 0) {
  console.log('✓ Prueba de humo en verde.');
  process.exit(0);
}
const byRule = new Map();
for (const p of problems) byRule.set(p.regla, (byRule.get(p.regla) ?? 0) + 1);
console.error(`\n✗ ${problems.length} fallo(s): ${[...byRule].map(([r, n]) => `${r} ${n}`).join(' · ')}\n`);
for (const p of problems.slice(0, Number(args.max ?? 120))) console.error(`  ${p.where} — ${p.regla}: ${p.detalle}`);
if (problems.length > 120 && !args.max) console.error(`  … y ${problems.length - 120} más (--max <n> para verlos).`);
process.exit(1);

// ═════════════════════════════════════════════════════════════════════════

/**
 * Un recurso de **otro** servidor que falla (la API de YouTube rechaza el
 * origen local con 403, proiectulimpreuna.ro puede no responder) no es un
 * fallo de esta compilación: la app ya cuenta con ello y sigue con lo que
 * tiene. Lo propio —un chunk, un asset— sí cuenta.
 */
function isThirdParty(message) {
  const url = message.location()?.url ?? '';
  if (/^https?:/.test(url) && !url.startsWith(origin)) return true;
  // CORS de una web ajena: el navegador lo atribuye a nuestra página, pero el
  // recurso es de otro dominio. Pasa en la prueba porque se sirve desde
  // 127.0.0.1 y esas APIs sólo admiten el dominio publicado (p. ej.
  // proiectulimpreuna.ro → `Access-Control-Allow-Origin: https://elimarganda.com`):
  // en la web real no ocurre y la página ya completa lo que falte.
  const cors = message.text().match(/Access to (?:XMLHttpRequest|fetch) at '(https?:\/\/[^']+)'/);
  return !!cors && !cors[1].startsWith(origin);
}

/** El mensaje de consola con la dirección del recurso que lo causó (el texto solo no la trae). */
function describe(message) {
  const url = message.location()?.url ?? '';
  return `${message.text().slice(0, 160)}${url ? ` ← ${url.replace(origin, '')}` : ''}`;
}

/** Recorre la página entera para montar lo diferido por viewport y vuelve arriba. */
async function settle(page) {
  await page.waitForTimeout(SETTLE_MS);
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += 600) {
      window.scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 50));
    }
    window.scrollTo(0, 0);
    await new Promise((done) => setTimeout(done, 250));
  });
}

/**
 * Colecciones de URL con datos: cientos de páginas con la misma plantilla (un
 * día de Împreună, un candidato, un anuncio). Se audita **una de cada forma**
 * (misma colección y misma profundidad); que todas respondan 200 ya lo mira
 * `checkLinks`.
 */
function sample(pages) {
  const taken = new Set();
  return pages.filter((path) => {
    const collection = DATA_COLLECTIONS.find((prefix) => path.startsWith(prefix) && path !== prefix);
    if (!collection) return true;
    const shape = `${collection}#${path.split('/').length}`;
    if (taken.has(shape)) return false;
    taken.add(shape);
    return true;
  });
}

/** Cada `index.html` de la compilación es una página: `/`, `/contact/`… */
async function staticPages(dist) {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (dir === dist && entry.name === 'assets') continue;
        await walk(join(dir, entry.name));
      } else if (entry.name === 'index.html') {
        const rel = relative(dist, dir).split(sep).join('/');
        found.push(rel ? `/${rel}/` : '/');
      }
    }
  };
  await walk(dist);
  return found.sort();
}

/** Raíces de los diccionarios: una clave sin traducir empieza por una de ellas. */
async function i18nRoots() {
  const dir = 'src/assets/i18n';
  const roots = new Set();
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.ro.json') || f === 'ro.json')) {
    for (const key of Object.keys(JSON.parse(await readFile(join(dir, file), 'utf8')))) roots.add(key);
  }
  return [...roots];
}

/** Ningún enlace interno puede dar 404 a quien no ejecuta JS (Google, WhatsApp). */
async function checkLinks(links) {
  const context = await browser.newContext();
  let checked = 0;
  for (const link of [...links].sort()) {
    const path = new URL(link).pathname;
    if (/\.[a-z0-9]{2,5}$/i.test(path)) continue; // ficheros: los sirve el build
    if (OPERATOR_PATHS.some((operator) => path === operator || path.startsWith(`${operator}/`))) continue;
    checked++;
    const response = await context.request.get(link, { maxRedirects: 3 }).catch(() => null);
    if (!response || response.status() !== 200) report(path, 'enlace', `estado ${response?.status() ?? 'sin respuesta'}`);
  }
  await context.close();
  console.log(`Enlaces internos comprobados: ${checked}`);
}

/** La proyección nunca se queda en blanco: se recorre el carrusel entero. */
async function checkProjection() {
  const context = await browser.newContext({ viewport: PROJECTION, locale: 'ro-RO', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    // El propio documento da 404 a propósito: la ventana de proyección es una
    // ruta de la app sin página estática (herramienta del operador).
    const own = (message.location()?.url ?? '').endsWith('/media/ecran');
    if (message.type() === 'error' && !own && !isThirdParty(message)) errors.push(describe(message));
  });
  page.on('pageerror', (error) => errors.push(`excepción: ${String(error).slice(0, 200)}`));
  const where = '/media/ecran [proyección]';
  try {
    await page.goto(`${origin}/media/ecran`, { waitUntil: 'load', timeout: 45_000 });
    await page.waitForSelector('.stage.is-fullscreen .slide--active', { timeout: 20_000 });
    const seen = new Set();
    for (let i = 0; i < MAX_SLIDES; i++) {
      await page.waitForTimeout(450);
      const slide = await page.evaluate(() => {
        const active = document.querySelector('.stage.is-fullscreen .slide--active');
        if (!active) return null;
        const text = active.textContent.replace(/\s+/g, ' ').trim();
        const box = active.getBoundingClientRect();
        return { key: active.className + '|' + text.slice(0, 60), chars: text.length, media: active.querySelectorAll('img, canvas, svg').length, width: box.width, height: box.height };
      });
      if (!slide) {
        report(where, 'proyección', `sin diapositiva activa tras ${i} avances`);
        break;
      }
      if (seen.has(slide.key)) break; // vuelta completa
      seen.add(slide.key);
      if (slide.chars === 0 && slide.media === 0) report(where, 'proyección', `diapositiva en blanco: ${slide.key.split('|')[0]}`);
      if (slide.width < PROJECTION.width * 0.5 || slide.height < PROJECTION.height * 0.5) report(where, 'proyección', `diapositiva sin tamaño: ${slide.key.split('|')[0]}`);
      await page.keyboard.press('ArrowRight');
    }
    console.log(`Diapositivas proyectadas recorridas: ${seen.size}`);
    if (seen.size === 0) report(where, 'proyección', 'no se proyecta ninguna diapositiva');
    for (const error of new Set(errors)) report(where, 'consola', error);
  } catch (error) {
    report(where, 'carga', String(error).split('\n')[0].slice(0, 200));
  }
  await context.close();
}

async function launch(preferred) {
  const channels = [...new Set([preferred ?? process.env.PDF_BROWSER, 'chrome', 'msedge'].filter(Boolean))];
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* siguiente */
    }
  }
  throw new Error(`No hay navegador instalado (${channels.join(', ')}).`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '');
    if (!key) continue;
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}
