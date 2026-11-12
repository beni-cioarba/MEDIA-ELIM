// Pruebas de scripts/lib/load-ts-module.mjs: `npm run test:scripts`.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './load-ts-module.mjs';

let dir;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'load-ts-module-'));
  await mkdir(join(dir, 'helpers'));
  await writeFile(join(dir, 'model.ts'), "export interface Thing { readonly a: string }\nexport type Kind = 'x' | 'y';\n");
  await writeFile(join(dir, 'helpers', 'index.ts'), 'export const double = (n: number): number => n * 2;\n');
  await writeFile(join(dir, 'data.json'), '{ "n": 21 }\n');
  // Lo que hace church.config.ts: token de Angular, interfaz importada sin `type`,
  // `import type`, imports sin extensión (fichero y carpeta) y un JSON.
  await writeFile(
    join(dir, 'config.ts'),
    [
      "import { InjectionToken } from '@angular/core';",
      "import { Thing } from './model';",
      "import type { Kind } from './model';",
      "import { double } from './helpers';",
      "import data from './data.json';",
      "export const TOKEN = new InjectionToken<Thing>('TOKEN');",
      "const kind: Kind = 'x';",
      "export const VALUE: Thing & { n: number; kind: Kind } = { a: 'ok', n: double(data.n), kind };",
      '',
    ].join('\n'),
  );
  await writeFile(join(dir, 'broken.ts'), 'export const X = {\n  a: 1,,\n};\n');
  await writeFile(join(dir, 'missing.ts'), "import { y } from './nope';\nexport const X = y;\n");
});

after(() => rm(dir, { recursive: true, force: true }));

test('evalúa el módulo: quita tipos e imports de sólo tipo, resuelve sin extensión y JSON', () => {
  const mod = loadTsModule(join(dir, 'config.ts'));
  assert.deepEqual(mod.VALUE, { a: 'ok', n: 42, kind: 'x' });
});

test('@angular/core se sustituye: el InjectionToken no carga Angular', () => {
  assert.equal(String(loadTsModule(join(dir, 'config.ts')).TOKEN), 'InjectionToken TOKEN');
});

test('un error de sintaxis dice fichero y línea del .ts', () => {
  assert.throws(() => loadTsModule(join(dir, 'broken.ts')), /broken\.ts:2:\d+ /);
});

test('un import relativo que no existe falla con un mensaje claro', () => {
  assert.throws(() => loadTsModule(join(dir, 'missing.ts')), /No se encuentra el módulo .*nope/);
});

test('lee el church.config.ts de verdad', () => {
  const { DEFAULT_CHURCH_CONFIG } = loadTsModule(fileURLToPath(new URL('../../src/app/core/church.config.ts', import.meta.url)));
  assert.ok(Array.isArray(DEFAULT_CHURCH_CONFIG.upcomingEvents));
  assert.ok(DEFAULT_CHURCH_CONFIG.weeklyProgram.length > 0);
});
