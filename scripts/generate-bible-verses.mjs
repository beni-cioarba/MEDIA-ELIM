#!/usr/bin/env node
/**
 * Versículos por capítulo y palabras por versículo de los 66 libros, para que
 * la web diga cuánto se tarda en leer un texto (Proiectul Împreună, Citirea
 * Bibliei, la portada)
 * («26 de versete · ≈ 4 min»). Escribe `src/app/core/bible/bible-verses.json`.
 *
 *   node scripts/generate-bible-verses.mjs        (una vez; el JSON se versiona)
 *
 * Fuente: la King James Version de github.com/aruljohn/Bible-kjv (dominio
 * público; un JSON por libro). Su división en capítulos y versículos es la de
 * Cornilescu y Reina-Valera 1960 salvo detalles (3 Juan tiene 15 versículos en
 * la RVR1960 y 14 aquí): sirve para contar, no para citar. Del texto sólo se
 * guarda la media de palabras por versículo de cada libro (los Salmos son más
 * cortos que Romanos), no el texto.
 *
 * Comprobaciones: 66 libros, 1.189 capítulos y 31.102 versículos (los de la KJV).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS_FILE = resolve(ROOT, 'src/app/core/bible/bible-books.json');
const OUT_FILE = resolve(ROOT, 'src/app/core/bible/bible-verses.json');
const SOURCE = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master';

const getJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.json();
};

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

async function main() {
  const usfm = Object.keys(JSON.parse(await readFile(BOOKS_FILE, 'utf8')).books);
  const names = await getJson(`${SOURCE}/Books.json`);
  if (usfm.length !== 66 || names.length !== 66) throw new Error(`Esperaba 66 libros: ${usfm.length} / ${names.length}`);

  const books = {};
  let chapters = 0;
  let verses = 0;
  for (const [i, code] of usfm.entries()) {
    const book = await getJson(`${SOURCE}/${encodeURIComponent(names[i].replace(/\s+/g, ''))}.json`);
    const counts = book.chapters.map((c) => c.verses.length);
    const totalWords = book.chapters.reduce((sum, c) => sum + c.verses.reduce((s, v) => s + words(v.text), 0), 0);
    const totalVerses = counts.reduce((a, b) => a + b, 0);
    books[code] = { wpv: Math.round((totalWords / totalVerses) * 10) / 10, verses: counts };
    chapters += counts.length;
    verses += totalVerses;
  }
  if (chapters !== 1189 || verses !== 31102) throw new Error(`Totales raros: ${chapters} capítulos, ${verses} versículos`);

  // Un libro por línea: el diff de una corrección se lee de un vistazo.
  const lines = Object.entries(books).map(([code, b]) => `    ${JSON.stringify(code)}: ${JSON.stringify(b)}`);
  const json = [
    '{',
    `  "$comment": "Versículos por capítulo (KJV, dominio público) y palabras por versículo de cada libro, para estimar el tiempo de lectura. Generado por scripts/generate-bible-verses.mjs: no editar a mano.",`,
    '  "books": {',
    lines.join(',\n'),
    '  }',
    '}',
    '',
  ].join('\n');
  await writeFile(OUT_FILE, json);
  console.log(`✓ ${OUT_FILE} — 66 libros, ${chapters} capítulos, ${verses} versículos (${(json.length / 1024).toFixed(1)} kB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
