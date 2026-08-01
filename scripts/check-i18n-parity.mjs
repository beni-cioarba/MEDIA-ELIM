// Comprueba que los diccionarios es/ro tienen exactamente el mismo juego de claves.
// Uso: npm run i18n:check
import { readFileSync } from 'node:fs';

/** Pares de ficheros que deben tener idéntica estructura. */
const BUNDLES = ['{lang}.json', 'credo-articles.{lang}.json'];

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? flatten(value, path) : [path];
  });

const load = (file) =>
  flatten(JSON.parse(readFileSync(new URL(`../src/assets/i18n/${file}`, import.meta.url), 'utf8')));

let failed = 0;

for (const bundle of BUNDLES) {
  const ro = load(bundle.replace('{lang}', 'ro'));
  const es = load(bundle.replace('{lang}', 'es'));
  const missingInEs = ro.filter((k) => !es.includes(k));
  const missingInRo = es.filter((k) => !ro.includes(k));

  if (missingInEs.length || missingInRo.length) {
    failed += 1;
    console.error(`✗ ${bundle}`);
    if (missingInEs.length) console.error('  Faltan en es:', missingInEs.join(', '));
    if (missingInRo.length) console.error('  Faltan en ro:', missingInRo.join(', '));
  } else {
    console.log(`✓ ${bundle} — ${ro.length} claves en ambos idiomas.`);
  }
}

process.exitCode = failed ? 1 : 0;
