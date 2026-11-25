/**
 * Ningún workflow puede quedarse corriendo sin límite.
 *
 * Sin `timeout-minutes` GitHub deja un job hasta **6 horas**: el 25/11/2026 un
 * despliegue colgado tuvo la web sin actualizar más de 3 h y sin avisar a
 * nadie. Esta prueba falla si un job —o un paso del job que compila y
 * publica— se queda sin el suyo, también en un workflow que se añada mañana.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../.github/workflows/', import.meta.url));
const files = readdirSync(DIR).filter((name) => /\.ya?ml$/.test(name));

/** Lo que se admite como mucho por job, en minutos (el aviso de las 08:00 espera a su hora). */
const MAX_MINUTES = 30;
const EXCEPTIONS = { 'impreuna-push.yml': 90 };

/** Trozos de `jobs:` (dos espacios de sangría), con su texto. */
function jobsOf(text) {
  const body = text.replace(/\r\n/g, '\n').split(/^jobs:\s*$/m)[1] ?? '';
  return body
    .split(/^(?= {2}[\w-]+:\s*$)/m)
    .filter((chunk) => /^ {2}[\w-]+:/.test(chunk))
    .map((chunk) => ({ name: chunk.match(/^ {2}([\w-]+):/)[1], text: chunk }));
}

/** Pasos de un job (seis espacios y guion). */
function stepsOf(job) {
  return job.text.split(/^(?= {6}- )/m).filter((chunk) => /^ {6}- /.test(chunk));
}

const minutes = (text, indent) => Number(text.match(new RegExp(`^ {${indent}}timeout-minutes: (\\d+)`, 'm'))?.[1] ?? 0);

test('hay workflows que mirar', () => assert.ok(files.length >= 3));

for (const file of files) {
  const text = readFileSync(DIR + file, 'utf8').replace(/\r\n/g, '\n');
  const jobs = jobsOf(text);

  test(`${file}: sin tabuladores ni caracteres de control (GitHub rechazaría el fichero)`, () => {
    assert.doesNotMatch(text, /[\u0000-\u0009\u000b-\u001f]/);
  });

  test(`${file}: cada job tiene timeout-minutes`, () => {
    assert.ok(jobs.length > 0, 'no se ha encontrado ningún job');
    for (const job of jobs) {
      const limit = minutes(job.text, 4);
      assert.ok(limit > 0, `el job «${job.name}» no tiene timeout-minutes (GitHub lo dejaría 6 h)`);
      const max = EXCEPTIONS[file] ?? MAX_MINUTES;
      assert.ok(limit <= max, `el job «${job.name}» admite ${limit} min (máximo ${max})`);
    }
  });
}

test('deploy.yml: cada paso de «build» que ejecuta algo tiene su propio límite', () => {
  const build = jobsOf(readFileSync(`${DIR}deploy.yml`, 'utf8')).find((job) => job.name === 'build');
  assert.ok(build);
  for (const step of stepsOf(build)) {
    const name = step.match(/name: (.+)/)?.[1] ?? step.trim().split('\n')[0];
    assert.ok(minutes(step, 8) > 0, `el paso «${name}» no tiene timeout-minutes`);
  }
});
