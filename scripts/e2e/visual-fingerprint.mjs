/**
 * Huella visual de la proyección y de las páginas de bloques: para cada
 * elemento visible, su caja (redondeada) y los estilos que deciden cómo se ve.
 *
 * Sirve para **refactors que no deben cambiar nada a la vista** (mover
 * estilos de sitio, cargar bloques en diferido): se saca antes y después y se
 * comparan.
 *
 *   node scripts/e2e/visual-fingerprint.mjs --dist <carpeta browser> --out antes.json
 *   node scripts/e2e/visual-fingerprint.mjs --dist <carpeta browser> --out despues.json --compare antes.json
 *
 * Con `--compare` sale con 1 si hay diferencias y las lista.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serveDist } from './serve-dist.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);

const PROPS = [
  'display', 'position', 'font-size', 'font-weight', 'font-family', 'line-height', 'color',
  'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-radius',
  'padding-top', 'padding-left', 'margin-top', 'margin-left', 'gap', 'grid-template-columns',
  'flex-direction', 'justify-content', 'align-items', 'text-transform', 'letter-spacing', 'opacity',
  'box-shadow', 'object-fit', 'aspect-ratio', 'overflow',
];

/**
 * Lo que se mueve solo y no es estable entre dos pasadas: la galería (rota de
 * álbum: la foto destacada y su tira cambian según el momento en que se mida),
 * relojes y cuentas atrás. Se anota la caja del
 * contenedor, no lo de dentro.
 */
const UNSTABLE = '.gallery__rail, .gallery__stage, app-stage-clock, app-service-countdown, .live-now, .stage-bug';
/** En la web, con `prefers-reduced-motion`, la galería no rota: se mide entera. */
const UNSTABLE_WEB = 'app-stage-clock, app-service-countdown, .live-now, .stage-bug, .weekly__countdown';

/** Dentro de la página: huella de lo visible bajo `root`. */
function fingerprint({ rootSelector, props, unstable }) {
  const root = document.querySelector(rootSelector);
  if (!root) return { missing: rootSelector };
  const out = [];
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => c && !c.startsWith('ng-')).sort().join('.') : '';
    const id = `${path}>${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
    const box = el.getBoundingClientRect();
    // Los anfitriones de bloque son `display: contents` (caja 0 × 0): no se
    // anotan, pero se recorre lo de dentro.
    if (box.width >= 1 && box.height >= 1 && cs.visibility !== 'hidden') {
      const style = {};
      for (const p of props) style[p] = cs.getPropertyValue(p);
      out.push({ id, box: [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)], style });
    }
    if (el.matches(unstable)) return;
    let index = 0;
    for (const child of el.children) {
      // Los nodos de comentario de `@defer`/`@if` no son elementos; los
      // marcadores que Angular inserta no deben mover los índices.
      walk(child, `${id}:${index++}`);
    }
  };
  walk(root, '');
  return { count: out.length, nodes: out };
}

const { origin, close } = await serveDist(args.dist);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result = {};
try {
  // Web: páginas de bloque, escritorio y teléfono.
  for (const [name, viewport] of [
    ['web-1366', { width: 1366, height: 900 }],
    ['web-390', { width: 390, height: 844 }],
  ]) {
    const ctx = await browser.newContext({ viewport, locale: 'ro-RO', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    for (const path of ['/media/', '/media/galerie/', '/media/program/', '/media/evenimente/', '/media/transmisiuni/', '/media/retele/', '/media/locatie/', '/media/citirea-bibliei/']) {
      await page.goto(origin + path, { waitUntil: 'load' });
      await page.waitForSelector('.stage .slide', { timeout: 20_000 });
      await page.waitForTimeout(1500);
      result[`${name} ${path}`] = await page.evaluate(fingerprint, { rootSelector: '.stage', props: PROPS, unstable: UNSTABLE_WEB });
    }
    await ctx.close();
  }
  // Proyección a 1080p: cada diapositiva del carrusel.
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ro-RO', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${origin}/media/ecran`, { waitUntil: 'load' });
  await page.waitForSelector('.stage.is-fullscreen .slide--active', { timeout: 20_000 });
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(900);
    const key = await page.evaluate(() => {
      const s = document.querySelector('.stage.is-fullscreen .slide--active');
      return s ? s.className + '|' + s.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : null;
    });
    if (!key || seen.has(key)) break;
    seen.add(key);
    result[`pj-1080 #${String(i).padStart(2, '0')} ${key.split('|')[0]}`] = await page.evaluate(fingerprint, {
      rootSelector: '.stage.is-fullscreen .slide--active',
      props: PROPS,
      unstable: UNSTABLE,
    });
    await page.keyboard.press('ArrowRight');
  }
  await ctx.close();
} finally {
  await browser.close();
  await close();
}

writeFileSync(args.out, JSON.stringify(result));
const scenes = Object.keys(result);
console.log(`Huella: ${scenes.length} escenas, ${scenes.reduce((n, k) => n + (result[k].count ?? 0), 0)} elementos → ${args.out}`);

if (args.compare) {
  const before = JSON.parse(readFileSync(args.compare, 'utf8'));
  let diffs = 0;
  const report = [];
  for (const scene of new Set([...Object.keys(before), ...scenes])) {
    const a = before[scene];
    const b = result[scene];
    if (!a || !b) {
      report.push(`${scene}: ${a ? 'falta ahora' : 'nueva'}`);
      diffs++;
      continue;
    }
    const byId = new Map((a.nodes ?? []).map((n) => [n.id, n]));
    const seenIds = new Set();
    for (const node of b.nodes ?? []) {
      seenIds.add(node.id);
      const old = byId.get(node.id);
      if (!old) {
        diffs++;
        if (report.length < 60) report.push(`${scene}: elemento nuevo ${node.id.slice(-90)}`);
        continue;
      }
      const changes = [];
      if (old.box.join() !== node.box.join()) changes.push(`caja ${old.box.join(',')} → ${node.box.join(',')}`);
      for (const p of PROPS) if (old.style[p] !== node.style[p]) changes.push(`${p}: ${old.style[p]} → ${node.style[p]}`);
      if (changes.length) {
        diffs++;
        if (report.length < 60) report.push(`${scene}: ${node.id.slice(-90)}\n      ${changes.slice(0, 4).join('\n      ')}`);
      }
    }
    for (const node of a.nodes ?? []) {
      if (!seenIds.has(node.id)) {
        diffs++;
        if (report.length < 60) report.push(`${scene}: falta ${node.id.slice(-90)}`);
      }
    }
  }
  if (diffs === 0) console.log('✓ Sin diferencias visibles.');
  else {
    console.error(`✗ ${diffs} diferencia(s):\n  ${report.join('\n  ')}`);
    process.exit(1);
  }
}
