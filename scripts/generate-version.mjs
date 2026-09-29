#!/usr/bin/env node
/**
 * Genera `src/environments/version.ts` a partir de dos fuentes:
 *
 *  - **manual** — MAYOR.MENOR de `version` en `package.json` (3.0.0 cuando
 *    hay un cambio grande, 2.1.0 cuando hay novedades). Lo decide una
 *    persona; ningún script lo escribe.
 *  - **automática** — se deriva de git en cada build:
 *      · PARCHE    → commits desde el último cambio de `"version"`
 *                    (`autoRelease`): 2.0.0 + 3 commits = v2.0.3. Nadie
 *                    tiene que acordarse de subirlo.
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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/**
 * Versión visible = MAYOR.MENOR de `package.json` (lo decide una persona) +
 * PARCHE automático: los commits hechos desde la última vez que se cambió la
 * línea `"version"` de `package.json`.
 *
 *   package.json 2.0.0 y 3 commits después → v2.0.3
 *   se sube a 2.1.0 (commit que toca `"version"`) → v2.1.0, luego 2.1.1…
 *
 * Por commit y no por compilación: compilar diez veces el mismo código no son
 * diez versiones, y el mismo commit da siempre el mismo número en local y en
 * el CI. Los cambios sin commitear se marcan aparte (`dirty` → «+»).
 * Si git no está disponible, se usa la versión de `package.json` tal cual.
 */
function autoRelease(base) {
  const [major = '0', minor = '0', patch = '0'] = String(base).split('.');
  const since = git('log', '-1', '--format=%H', '-G"version":', '--', 'package.json');
  if (!since) return base;
  const commits = Number(git('rev-list', '--count', `${since}..HEAD`)) || 0;
  return `${major}.${minor}.${Number(patch) + commits}`;
}

const release = autoRelease(pkg.version);
const build = Number(git('rev-list', '--count', 'HEAD')) || 0;
const commit = git('rev-parse', '--short=7', 'HEAD') || 'local';
// Un build con cambios sin commitear no es reproducible: se marca.
const dirty = git('status', '--porcelain') !== '';
const builtAt = new Date().toISOString();

const contents = `/**
 * FICHERO GENERADO — no lo edites a mano.
 * Lo escribe scripts/generate-version.mjs en postinstall, prestart y prebuild.
 * MAYOR.MENOR se cambian en "version" de package.json; el PARCHE es automático.
 */
export interface AppVersion {
  /**
   * Lo que se muestra al usuario: MAYOR.MENOR de package.json (manual) y
   * PARCHE = commits desde el último cambio de "version" (automático).
   */
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

// `src/environments/` no contiene ningún otro fichero, y éste está en
// `.gitignore`. Como git no guarda directorios vacíos, en un clon limpio —el
// del CI— la carpeta sencillamente no existe y `writeFileSync` fallaba con
// ENOENT en `postinstall`, antes siquiera de compilar. Crearla aquí mantiene
// el repo sin ficheros centinela.
mkdirSync(dirname(OUTPUT), { recursive: true });

writeFileSync(OUTPUT, contents, 'utf8');

console.log(
  `✓ version.ts — v${release} · build ${build} · ${commit}${dirty ? ' (dirty)' : ''}`,
);
