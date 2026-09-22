// Guardia del presupuesto de legibilidad de la proyección.
//
// Recorre las hojas SCSS de proyección y falla si algún `font-size` en unidades
// de lienzo (`--pj-u`) baja del mínimo, o si la escala `--pj-fs-*` se
// redefine por debajo de su suelo. Es la red que evita que un bloque nuevo
// vuelva a meter texto que no se lee desde el fondo del templo.
//
//   Mínimo absoluto: 3,2u (35 px a 1080p, legible desde ~8 m).
//   Suelos de la escala (docs/ai/30-presentation.md → «Legibilidad»):
//     eyebrow 3,2 · caption 3,8 · body 4,6 · lead 5,6 · title 8 · hero 8,6 · display 11
//
// Uso: `npm run check:projection` (también en CI antes del build).
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIN_U = 3.2;
const SCALE_FLOORS = {
  eyebrow: 3.2,
  caption: 3.8,
  body: 4.6,
  lead: 5.6,
  title: 8,
  hero: 8.6,
  display: 11,
};

/** Hojas con reglas de proyección (todo lo que use `--pj-u`). */
const FILES = [
  'src/app/features/stage/styles/_projection.scss',
  'src/app/features/stage/blocks/bible-block/bible-block.component.scss',
  'src/app/features/announcements/announcement-card/announcement-card.component.scss',
];

const errors = [];

for (const file of FILES) {
  const path = join(ROOT, file);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const rel = relative(ROOT, path).replace(/\\/g, '/');

  lines.forEach((line, i) => {
    const where = `${rel}:${i + 1}`;

    // font-size: calc(var(--pj-u) * N)  — también dentro de fit(...)
    const direct = line.match(/font-size:\s*(?:fit\()?calc\(var\(--pj-u\)\s*\*\s*([\d.]+)\)/);
    if (direct && Number(direct[1]) < MIN_U) {
      errors.push(`${where}: font-size de ${direct[1]}u, por debajo del mínimo ${MIN_U}u`);
    }

    // --pj-fs-<papel>: calc(var(--pj-u) * N)
    const scale = line.match(/--pj-fs-(\w+):\s*calc\(var\(--pj-u\)\s*\*\s*([\d.]+)\)/);
    if (scale) {
      const floor = SCALE_FLOORS[scale[1]];
      if (floor === undefined) {
        errors.push(`${where}: papel tipográfico desconocido --pj-fs-${scale[1]} (añádelo a SCALE_FLOORS)`);
      } else if (Number(scale[2]) < floor) {
        errors.push(`${where}: --pj-fs-${scale[1]} = ${scale[2]}u, por debajo de su suelo ${floor}u`);
      }
    }

    // font-size con px/rem dentro de una hoja de proyección: no escala con el lienzo.
    if (/font-size:\s*[\d.]+(px|rem)/.test(line) && rel.endsWith('_projection.scss')) {
      errors.push(`${where}: font-size en px/rem en la hoja de proyección (usa --pj-fs-* o --pj-u)`);
    }
  });
}

if (errors.length > 0) {
  console.error(`✗ Presupuesto de legibilidad incumplido (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`✓ Proyección dentro del presupuesto de legibilidad (mínimo ${MIN_U}u) en ${FILES.length} hojas.`);
