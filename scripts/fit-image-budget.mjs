/**
 * Recomprime los WebP de `src/assets/` que pasan de su presupuesto de peso
 * (`scripts/lib/image-budget.mjs`), **sin cambiar sus dimensiones**.
 *
 * Baja la calidad de 82 en pasos de 4 hasta que cabe (mínimo 66). Si ni así
 * cabe, se queda con la versión más pequeña que haya conseguido y lo dice. Un
 * fichero sólo se sustituye si el resultado pesa menos.
 *
 * Uso:
 *   npm run images:budget              (recomprime)
 *   npm run images:budget -- --dry-run (sólo dice qué haría)
 *
 * Idempotente: lo que ya cabe no se toca.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageBudgetKb } from './lib/image-budget.mjs';

const ROOT = 'src/assets';
const QUALITIES = [82, 78, 74, 70, 66];
const dryRun = process.argv.includes('--dry-run');

const files = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.toLowerCase().endsWith('.webp')) files.push(path);
  }
};
await walk(ROOT);

let saved = 0;
let touched = 0;
for (const file of files.sort()) {
  const budget = imageBudgetKb(file);
  if (budget === null) continue;
  const size = (await stat(file)).size;
  if (size <= budget * 1024) continue;

  const input = await readFile(file);
  let best = null;
  let quality = null;
  for (const q of QUALITIES) {
    const out = await sharp(input).webp({ quality: q, effort: 6 }).toBuffer();
    if (!best || out.length < best.length) {
      best = out;
      quality = q;
    }
    if (out.length <= budget * 1024) break;
  }
  const kb = (n) => Math.round(n / 1024);
  if (!best || best.length >= size) {
    console.log(`· ${file}: ${kb(size)} kB, no mejora al recomprimir`);
    continue;
  }
  const fits = best.length <= budget * 1024 ? '' : ` (sigue por encima de ${budget} kB)`;
  console.log(`${dryRun ? '· [simulación]' : '✓'} ${file}: ${kb(size)} → ${kb(best.length)} kB (calidad ${quality})${fits}`);
  if (!dryRun) await writeFile(file, best);
  saved += size - best.length;
  touched++;
}
console.log(touched ? `\n${touched} imagen(es): −${(saved / 1024 / 1024).toFixed(1)} MB.` : 'Todas dentro de su presupuesto.');
