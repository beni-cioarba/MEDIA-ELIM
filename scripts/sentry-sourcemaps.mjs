/**
 * Source maps a Sentry, y fuera de la web publicada.
 *
 * El build de producción genera mapas **ocultos** (`angular.json` →
 * `sourceMap.hidden`: el `.js` no los referencia). Este script, tras `ng build`:
 *  1. Si hay `SENTRY_AUTH_TOKEN`, los sube a Sentry asociados a la versión
 *     (`sentryRelease()`, la misma que pone la web en cada error) con prefijo
 *     `~/`: Sentry los empareja por versión + nombre de fichero y la pila del
 *     error se lee con el código original. Organización y proyecto salen del
 *     DSN (`TELEMETRY_CONFIG`): no hace falta configurarlos aparte.
 *  2. Borra los `.map` de la carpeta publicada, haya subida o no.
 *
 * Por qué por versión y no por *debug ID*: el build de Angular ya marca cada
 * fichero con `//# debugId=`, pero sin el registro en tiempo de ejecución que
 * lee el SDK, y `sentry-cli sourcemaps inject` no lo añade a ficheros ya
 * marcados. Además, inyectar cambiaría los `.js` después del build y habría
 * que recalcular los hashes del service worker.
 *
 * Un fallo de la subida **no** para el despliegue: sin mapas, los errores
 * siguen llegando, sólo que minificados. Ver `docs/ai/77-analitica-errores.md`.
 *
 * Uso: node scripts/sentry-sourcemaps.mjs --dist dist/iglesia-redes/browser
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './lib/load-ts-module.mjs';

const argv = process.argv.slice(2);
const distArg = argv.indexOf('--dist');
const DIST = distArg >= 0 ? argv[distArg + 1] : 'dist/iglesia-redes/browser';

const { sentryRelease, sentryTarget } = loadTsModule('src/app/core/telemetry/release.ts');
const { DEFAULT_TELEMETRY_CONFIG } = loadTsModule('src/app/core/telemetry/telemetry.config.ts');
const { APP_VERSION } = loadTsModule('src/environments/version.ts');

const maps = readdirSync(DIST).filter((name) => name.endsWith('.map'));
if (!maps.length) {
  console.log('Sin source maps en la compilación: nada que subir.');
  process.exit(0);
}

const token = process.env.SENTRY_AUTH_TOKEN;
const dsn = DEFAULT_TELEMETRY_CONFIG.sentryDsn;
const target = dsn ? sentryTarget(dsn) : null;
const release = sentryRelease(APP_VERSION);

if (!token || !target) {
  console.log(`Source maps sin subir (${!token ? 'falta SENTRY_AUTH_TOKEN' : 'sin DSN de Sentry'}).`);
} else {
  try {
    execFileSync(
      process.execPath,
      [
        'node_modules/@sentry/cli/bin/sentry-cli',
        'sourcemaps',
        'upload',
        '--org', target.org,
        '--project', target.project,
        '--release', release,
        '--url-prefix', '~/',
        DIST,
      ],
      { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: token } },
    );
    console.log(`✓ Source maps subidos a Sentry (${maps.length}) para ${release}.`);
  } catch {
    console.warn(`⚠ No se pudieron subir los source maps de ${release}: los errores llegarán minificados.`);
  }
}

for (const name of maps) rmSync(join(DIST, name));
console.log(`✓ ${maps.length} source maps fuera de la web publicada.`);
