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
 *   … --workers 4             páginas a la vez (por defecto, según el equipo)
 *   … --date 2026-11-29T09:00 como si fuera ese día: lo que sólo se ve con un
 *                             evento hoy (el 22/11/2026 el contraste de «HOY»
 *                             bloqueó el despliegue de la mañana del evento)
 *
 * **Siempre termina** (25/11/2026: un Chrome colgado dejó un despliegue 3 h 35
 * min en curso). Cada página tiene su plazo y su navegador: si se bloquea, se
 * mata y se repite una vez en uno nuevo; si vuelve a bloquearse, es un fallo
 * con nombre. Hay un presupuesto total y, por encima, un guardián que corta el
 * proceso pase lo que pase. Y **sin internet**: el navegador sólo resuelve el
 * servidor local, así que ni la red ni YouTube deciden si se publica.
 *
 * Sale con 1 si hay algún fallo. Las páginas se miran con
 * `prefers-reduced-motion: reduce`: sin eso, un texto a mitad de su animación
 * de entrada mide menos contraste del que tiene.
 */
import { readdir, readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { ROBOTS_DISALLOW } from '../generate-route-pages.mjs';
import { DeadlineError, runPool, withDeadline } from './deadline.mjs';
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

// ── Plazos ────────────────────────────────────────────────────────────────
/** Una página entera (cargar, recorrer, auditar). Lo normal son 2–4 s; las más largas, ~20 en un equipo cargado. */
const PAGE_MS = 45_000;
/** Recorrer el carrusel de la proyección. Lo normal son ~10 s. */
const PROJECTION_MS = 60_000;
/** Arrancar o cerrar un navegador. */
const BROWSER_MS = 20_000;
/** Presupuesto de toda la prueba: agotado, no se empiezan más páginas. */
const BUDGET_MS = 180_000;
/** Guardián: el proceso termina aquí aunque todo lo demás falle. */
const HARD_MS = BUDGET_MS + 60_000;
/** Intentos por tarea ante un **bloqueo** (los fallos de auditoría no se repiten). */
const ATTEMPTS = 2;

/** Páginas a la vez: más de 4 no acelera (una CPU por Chrome) y falsea las esperas. */
const WORKERS = Math.max(1, Number(args.workers) || Math.min(4, availableParallelism()));

// Herramientas del operador: existen sólo como rutas de la app (sin página
// estática), así que por HTTP dan 404 a propósito.
const OPERATOR_PATHS = ROBOTS_DISALLOW;

// Avisos que la propia app escribe en consola al no haber internet en la prueba
// (son de la app, no del navegador: no traen la dirección del recurso).
const OFFLINE_NOTICES = [/^\[elim:youtube\]/];

// Colecciones de URL con datos (ver `sample`).
const DATA_COLLECTIONS = ['/anunturi/', '/conducere/', '/botezuri/', '/rugaciune-pentru-familii/', '/impreuna/ziua/'];

const startedAt = Date.now();
const elapsed = () => Date.now() - startedAt;
const problems = [];
const report = (where, regla, detalle) => problems.push({ where, regla, detalle });
/** Qué se está haciendo ahora mismo: si el guardián corta, dice dónde. */
const running = new Map();

// Último recurso: no depende de ninguna promesa ni de que Chrome conteste.
setTimeout(() => {
  console.error(`\n✗ Prueba cortada a los ${HARD_MS / 1000} s. En curso: ${[...running.values()].join(' · ') || 'cierre'}`);
  printProblems();
  process.exit(1);
}, HARD_MS).unref();

const { origin, close } = await serveDist(DIST);
/** Todos los navegadores abiertos, para no dejar ninguno vivo al acabar. */
const servers = new Set();
const retries = [];
const timings = [];

const roots = await i18nRoots();
const pages = sample(await staticPages(DIST)).filter((p) => !args.only || p === args.only);
if (pages.length === 0) throw new Error(`No hay páginas que probar en ${DIST}.`);
console.log(`Prueba de humo: ${pages.length} páginas × ${VIEWPORTS.length} anchos, ${WORKERS} a la vez (${origin})`);

const links = new Set();
const tasks = VIEWPORTS.flatMap((viewport) =>
  pages.map((path) => ({
    where: `${path} [${viewport.name}]`,
    ms: PAGE_MS,
    run: (browser) => checkPage(browser, path, viewport),
  })),
);
// La proyección va la primera: es la tarea más larga y así no alarga el final.
if (!args.only) tasks.unshift({ where: '/media/ecran [proyección]', ms: PROJECTION_MS, run: checkProjection });

const slots = Array.from({ length: WORKERS }, () => null);
const pending = await runPool(tasks, WORKERS, runTask, () => elapsed() > BUDGET_MS);
for (const task of pending) report(task.where, 'presupuesto', `sin probar: se agotaron los ${BUDGET_MS / 1000} s`);

if (!args.only) await checkLinks(links);

await Promise.all([...servers].map(kill));
await withDeadline(close(), BROWSER_MS, 'cerrar el servidor').catch(() => {});

const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 3);
console.log(
  `Duración: ${Math.round(elapsed() / 1000)} s · más lentas: ${slowest.map((t) => `${t.where} ${(t.ms / 1000).toFixed(1)} s`).join(' · ')}`,
);
// Un bloqueo que se recupera no impide publicar, pero se ve en el resumen de la ejecución.
for (const retry of retries) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ '}Repetida por bloqueo: ${retry}`);

if (problems.length === 0) {
  console.log('✓ Prueba de humo en verde.');
  process.exit(0);
}
printProblems();
process.exit(1);

// ═════════════════════════════════════════════════════════════════════════

function printProblems() {
  if (problems.length === 0) return;
  const byRule = new Map();
  for (const p of problems) byRule.set(p.regla, (byRule.get(p.regla) ?? 0) + 1);
  console.error(`\n✗ ${problems.length} fallo(s): ${[...byRule].map(([r, n]) => `${r} ${n}`).join(' · ')}\n`);
  const max = Number(args.max ?? 120);
  for (const p of problems.slice(0, max)) console.error(`  ${p.where} — ${p.regla}: ${p.detalle}`);
  if (problems.length > max) console.error(`  … y ${problems.length - max} más (--max <n> para verlos).`);
}

/**
 * Una tarea en su puesto, con plazo. Si el navegador no contesta (o se cae) se
 * mata y se repite en uno limpio. Lo que la tarea anota sólo cuenta si termina:
 * un intento a medias no deja fallos ni enlaces.
 */
async function runTask(task, slot) {
  running.set(slot, task.where);
  const begun = Date.now();
  let last = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      slots[slot] ??= await launch(args.browser);
      const found = await withDeadline(task.run(slots[slot].browser), task.ms, task.where);
      for (const p of found.problems) report(task.where, p.regla, p.detalle);
      for (const link of found.links ?? []) links.add(link);
      if (last) retries.push(`${task.where} (${last})`);
      last = null;
      break;
    } catch (error) {
      last = error instanceof DeadlineError ? error.message : String(error).split('\n')[0].slice(0, 200);
      if (slots[slot]) await kill(slots[slot]);
      slots[slot] = null;
    }
  }
  if (last) report(task.where, 'bloqueo', `${last} (${ATTEMPTS} intentos)`);
  timings.push({ where: task.where, ms: Date.now() - begun });
  running.delete(slot);
}

/** Abre una página en un contexto limpio (como una primera visita) y la audita. */
async function checkPage(browser, path, viewport) {
  const found = [];
  const context = await browser.newContext({
    ...viewport.context,
    locale: 'ro-RO',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  if (args.date) await context.clock.setSystemTime(new Date(args.date));
  const page = await context.newPage();
  const errors = listenErrors(page);
  const response = await page.goto(origin + path, { waitUntil: 'load', timeout: 20_000 });
  if (response?.status() !== 200) found.push({ regla: 'http', detalle: `estado ${response?.status()}` });
  await page.waitForSelector('app-root h1, app-root main', { timeout: 15_000 });
  await settle(page);
  const result = await page.evaluate(auditPage, { mobile: viewport.mobile, roots });
  found.push(...result.fallos);
  for (const error of new Set(errors)) found.push({ regla: 'consola', detalle: error });
  await context.close();
  return { problems: found, links: result.links };
}

/** Errores de consola y excepciones **propias** de la página. */
function listenErrors(page, ignore = () => false) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !ignore(message) && !isThirdParty(message)) errors.push(describe(message));
  });
  page.on('pageerror', (error) => errors.push(`excepción: ${String(error).slice(0, 200)}`));
  return errors;
}

/**
 * Un recurso de **otro** servidor que falla no es un fallo de esta compilación:
 * la prueba corre sin internet, la app ya cuenta con ello y sigue con lo que
 * tiene. Lo propio —un chunk, un asset— sí cuenta.
 */
function isThirdParty(message) {
  if (OFFLINE_NOTICES.some((notice) => notice.test(message.text()))) return true;
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
async function checkLinks(found) {
  const paths = [...new Set([...found].map((link) => new URL(link).pathname))]
    .filter((path) => !/\.[a-z0-9]{2,5}$/i.test(path)) // ficheros: los sirve el build
    .filter((path) => !OPERATOR_PATHS.some((operator) => path === operator || path.startsWith(`${operator}/`)))
    .sort();
  const left = await runPool(
    paths,
    8,
    async (path) => {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
      await response?.arrayBuffer().catch(() => null);
      if (response?.status !== 200) report(path, 'enlace', `estado ${response?.status ?? 'sin respuesta'}`);
    },
    () => elapsed() > HARD_MS - 20_000,
  );
  for (const path of left) report(path, 'presupuesto', 'enlace sin comprobar');
  console.log(`Enlaces internos comprobados: ${paths.length - left.length}`);
}

/** La proyección nunca se queda en blanco: se recorre el carrusel entero. */
async function checkProjection(browser) {
  const found = [];
  const context = await browser.newContext({ viewport: PROJECTION, locale: 'ro-RO', serviceWorkers: 'block' });
  if (args.date) await context.clock.setSystemTime(new Date(args.date));
  const page = await context.newPage();
  // El propio documento da 404 a propósito: la ventana de proyección es una
  // ruta de la app sin página estática (herramienta del operador).
  const errors = listenErrors(page, (message) => (message.location()?.url ?? '').endsWith('/media/ecran'));
  await page.goto(`${origin}/media/ecran`, { waitUntil: 'load', timeout: 20_000 });
  await page.waitForSelector('.stage.is-fullscreen .slide--active', { timeout: 20_000 });
  const seen = new Set();
  for (let i = 0; i < MAX_SLIDES; i++) {
    await page.waitForTimeout(450);
    // El bloque de la diapositiva se monta en diferido: se espera a que tenga
    // contenido, no un tiempo fijo (con la máquina cargada salía «en blanco»).
    // Si en 5 s sigue vacía, lo dice la comprobación de abajo.
    await page
      .waitForFunction(
        () => {
          const active = document.querySelector('.stage.is-fullscreen .slide--active');
          return !!active && (active.textContent.trim() !== '' || active.querySelector('img, canvas, svg') !== null);
        },
        undefined,
        { timeout: 5_000 },
      )
      .catch(() => {});
    const slide = await page.evaluate(() => {
      const active = document.querySelector('.stage.is-fullscreen .slide--active');
      if (!active) return null;
      const text = active.textContent.replace(/\s+/g, ' ').trim();
      const box = active.getBoundingClientRect();
      return { key: active.className + '|' + text.slice(0, 60), chars: text.length, media: active.querySelectorAll('img, canvas, svg').length, width: box.width, height: box.height };
    });
    if (!slide) {
      found.push({ regla: 'proyección', detalle: `sin diapositiva activa tras ${i} avances` });
      break;
    }
    if (seen.has(slide.key)) break; // vuelta completa
    seen.add(slide.key);
    const name = slide.key.split('|')[0];
    if (slide.chars === 0 && slide.media === 0) found.push({ regla: 'proyección', detalle: `diapositiva en blanco: ${name}` });
    if (slide.width < PROJECTION.width * 0.5 || slide.height < PROJECTION.height * 0.5) found.push({ regla: 'proyección', detalle: `diapositiva sin tamaño: ${name}` });
    await page.keyboard.press('ArrowRight');
  }
  console.log(`Diapositivas proyectadas recorridas: ${seen.size}`);
  if (seen.size === 0) found.push({ regla: 'proyección', detalle: 'no se proyecta ninguna diapositiva' });
  for (const error of new Set(errors)) found.push({ regla: 'consola', detalle: error });
  await context.close();
  return { problems: found };
}

/**
 * Un navegador propio por puesto, en **proceso aparte** (`launchServer`): así
 * se puede matar aunque no conteste (`browser.close()` espera su respuesta).
 * Sólo resuelve el servidor local: la prueba no depende de internet.
 */
async function launch(preferred) {
  const channels = [...new Set([preferred ?? process.env.PDF_BROWSER, 'chrome', 'msedge'].filter(Boolean))];
  let reason = '';
  for (const channel of channels) {
    let server = null;
    try {
      server = await chromium.launchServer({
        channel,
        headless: true,
        timeout: BROWSER_MS,
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
      });
      const browser = await chromium.connect(server.wsEndpoint(), { timeout: BROWSER_MS });
      const slot = { server, browser };
      servers.add(slot);
      return slot;
    } catch (error) {
      reason = String(error).split('\n')[0];
      if (server) await withDeadline(server.kill(), BROWSER_MS, 'matar').catch(() => {});
    }
  }
  throw new Error(`No hay navegador disponible (${channels.join(', ')}): ${reason}`);
}

/** Mata el proceso del navegador; no espera a que conteste. */
async function kill(slot) {
  servers.delete(slot);
  await withDeadline(slot.server.kill(), BROWSER_MS, 'matar el navegador').catch(() => {});
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
