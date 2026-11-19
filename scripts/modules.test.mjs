// Tests del registro de módulos: cada carpeta de `src/app/features` con
// páginas (`<x>.pages.ts`) tiene sus rutas (`<x>.routes.ts`) y están en
// `app.routes.ts`. Es lo que se olvida al añadir un módulo a mano.
// Uso: node --test scripts/   (o `npm run test:scripts`)
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { modulePages } from './generate-route-pages.mjs';

const FEATURES = 'src/app/features';
const appRoutes = readFileSync('src/app/app.routes.ts', 'utf8');

const modules = readdirSync(FEATURES).filter((dir) => existsSync(join(FEATURES, dir, `${dir}.pages.ts`)));

test('hay módulos', () => {
  assert.ok(modules.length >= 15, `sólo ${modules.length}`);
});

test('cada módulo con páginas tiene sus rutas y está en app.routes.ts', () => {
  for (const id of modules) {
    assert.ok(existsSync(join(FEATURES, id, `${id}.routes.ts`)), `${id}: falta ${id}.routes.ts`);
    assert.match(appRoutes, new RegExp(`from './features/${id}/${id}\\.routes'`), `${id}: no está en app.routes.ts`);
  }
});

test('las rutas de cada módulo se construyen desde sus páginas (pageRoute)', () => {
  for (const id of modules) {
    const pages = readFileSync(join(FEATURES, id, `${id}.pages.ts`), 'utf8');
    const routes = readFileSync(join(FEATURES, id, `${id}.routes.ts`), 'utf8');
    const constName = /export const (\w+_PAGES)\b/.exec(pages)?.[1];
    assert.ok(constName, `${id}: sin export *_PAGES`);
    assert.match(routes, new RegExp(`${constName}\\b`), `${id}: sus rutas no usan ${constName}`);
    assert.match(routes, /pageRoute\(/, `${id}: sus rutas no usan pageRoute`);
  }
});

test('rutas únicas entre todos los módulos', () => {
  const paths = modulePages().map((page) => page.path);
  const repeated = paths.filter((path, index) => paths.indexOf(path) !== index);
  assert.deepEqual(repeated, []);
});
