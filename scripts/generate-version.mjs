#!/usr/bin/env node
/**
 * Genera `src/environments/version.ts` a partir de dos fuentes:
 *
 *  - **manual** — `version` de `package.json`. Es la única cifra que decide
 *    una persona (semver: 2.1.0 cuando hay novedades, 2.0.1 cuando hay
 *    arreglos). No la toca ningún script.
 *  - **automática** — se deriva de git en cada build:
 *      · `build`   → `git rev-list --count HEAD`, o sea el número de commits
 *                    de la rama. Es un contador que sube solo, siempre, sin
 *                    que nadie se acuerde de incrementarlo.
 *      · `commit`  → hash corto, que es lo que de verdad identifica el
 *                    código que está publicado.
 *      · `builtAt` → fecha de compilación (ISO), para saber si el navegador
 *                    sigue sirviendo un service worker viejo.
 *
 * Se ejecuta en `postinstall`, `prestart` y `prebuild`: el fichero nunca
 * falta y nunca queda obsoleto. Por eso está en `.gitignore`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src', 'environments', 'version.ts');

/** Ejecuta git y devuelve '' si falla (tarball sin .git, CI sin historial…). */
function git(...args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const release = pkg.version;
const build = Number(git('rev-list', '--count', 'HEAD')) || 0;
const commit = git('rev-parse', '--short=7', 'HEAD') || 'local';
// Un build con cambios sin commitear no es reproducible: se marca.
const dirty = git('status', '--porcelain') !== '';
const builtAt = new Date().toISOString();

const contents = `/**
 * FICHERO GENERADO — no lo edites a mano.
 * Lo escribe scripts/generate-version.mjs en postinstall, prestart y prebuild.
 * Para cambiar el número visible, edita "version" en package.json.
 */
export interface AppVersion {
  /** Semver manual de package.json. Es lo que se muestra al usuario. */
  readonly release: string;
  /** Número de commits de la rama. Contador automático y monótono. */
  readonly build: number;
  /** Hash corto del commit publicado. */
  readonly commit: string;
  /** true si se compiló con cambios sin commitear. */
  readonly dirty: boolean;
  /** Fecha de compilación en ISO 8601. */
  readonly builtAt: string;
}

export const APP_VERSION: AppVersion = {
  release: '${release}',
  build: ${build},
  commit: '${commit}',
  dirty: ${dirty},
  builtAt: '${builtAt}',
};
`;

writeFileSync(OUTPUT, contents, 'utf8');

console.log(
  `✓ version.ts — v${release} · build ${build} · ${commit}${dirty ? ' (dirty)' : ''}`,
);
