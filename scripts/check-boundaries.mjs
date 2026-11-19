/**
 * Fronteras entre capas de `src/app`: quién puede importar de quién.
 *
 *   features/<x>  →  core, shared y la **API pública** de otra feature
 *                    (`features/<y>/public/**`); nunca su interior
 *   layout        →  core, shared
 *   shared        →  core
 *   core          →  (nada de la app; `import type` sí)
 *
 * `features/<y>/public/` es lo que una feature ofrece al resto (la tarjeta de
 * anuncio que también pinta la proyección, los datos del credo que cita
 * «Quiénes somos»…). Lo demás de la feature es privado: se puede reorganizar
 * sin romper a nadie. Lo genérico que no pertenece a ninguna feature va en
 * `shared/`.
 *
 * Por qué importa: una *feature* que importa el interior de otra las ata, y un
 * `layout` —que es eager— que importa de una *feature* mete su código en el
 * arranque de todas las páginas (así llegaron los datos de las familias al
 * bundle inicial; ver `docs/ai/76-plan-maestro.md`).
 *
 * Sin excepciones desde el 17/11/2026 (fase 3): los 14 cruces heredados se
 * resolvieron moviendo cada pieza a `public/` o a `shared/`.
 *
 * Uso: node scripts/check-boundaries.mjs   (dentro de `npm run check`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve('src/app');

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) files.push(path);
  }
};
walk(ROOT);

/** Área de un fichero: `features/<x>`, `shared`, `layout`, `core` o `app` (raíz). */
const areaOf = (file) => {
  const rel = relative(ROOT, file).split('\\').join('/');
  const publicApi = rel.match(/^features\/([^/]+)\/public(\/|$)/);
  if (publicApi) return `public/${publicApi[1]}`;
  const feature = rel.match(/^features\/([^/]+)/);
  if (feature) return `features/${feature[1]}`;
  const top = rel.split('/')[0];
  return top.includes('.') ? 'app' : top;
};

const allowed = (from, to) => {
  // La API pública de una feature es parte de ella (y ella, de su API).
  const owner = (area) => area.replace(/^public\//, 'features/');
  if (owner(from) === owner(to) || from === 'app') return true;
  // Una feature (o la API de otra) puede usar la API pública de cualquiera.
  if (to.startsWith('public/') && (from.startsWith('features/') || from.startsWith('public/'))) return true;
  if (to === 'core') return true;
  if (from === 'core') return false;
  if (from === 'shared') return false;
  if (from === 'layout') return to === 'shared';
  // feature: core y shared; ni layout ni otra feature.
  return to === 'shared';
};

const IMPORT = /(?:^|\n)\s*(import|export)\s+(type\s+)?[^'";]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

const crossings = new Map(); // "a -> b" → ejemplo
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const from = areaOf(file);
  for (const match of source.matchAll(IMPORT)) {
    const typeOnly = Boolean(match[2]);
    const specifier = match[3] ?? match[4];
    const target = resolve(dirname(file), specifier);
    // Fuera de `src/app` (traducciones, `environments/`): no es una capa.
    if (relative(ROOT, target).startsWith('..')) continue;
    const to = areaOf(target);
    if (typeOnly || allowed(from, to)) continue;
    const key = `${from} -> ${to}`;
    if (!crossings.has(key)) crossings.set(key, `${relative(ROOT, file).split('\\').join('/')} ⇒ ${specifier}`);
  }
}

const found = [...crossings.keys()].sort();
if (found.length === 0) {
  console.log(`✓ Fronteras: ${files.length} ficheros, ningún cruce de capas.`);
  process.exit(0);
}
for (const key of found) console.error(`✗ Cruce de capas: ${key}\n    ${crossings.get(key)}`);
console.error('\nLo que usan dos features va en la API pública de la suya (features/<x>/public/) o, si es genérico, en shared/. El layout no importa de features (difiérelo con @defer en un componente aparte).');
process.exit(1);
