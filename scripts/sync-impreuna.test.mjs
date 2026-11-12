// Pruebas de scripts/sync-impreuna.mjs (sin red): `npm run test:scripts`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  applySkips,
  buildIcs,
  chaptersOfCode,
  chaptersOfRomanianReading,
  daysInYear,
  decodeEntities,
  foldLine,
  isFastingDay,
  formatReading,
  isoDateOfDay,
  parseWpPost,
  parseYouVersionRefs,
  parseYoutubeUpload,
  toJson,
} from './sync-impreuna.mjs';

const { books } = JSON.parse(await readFile(new URL('../src/app/core/impreuna/bible-books.json', import.meta.url), 'utf8'));

const POST = {
  id: 12449,
  title: { rendered: 'Ziua 315 &#8211; Adi Ion &#8211; 11 Noiembrie 2026' },
  content: {
    rendered:
      '<p class="wp-block-paragraph">Iacov 1</p>\n<figure><iframe title="Ziua 315 Adi Ion" src="https://www.youtube.com/embed/91WVKzPoQ-4?feature=oembed"></iframe></figure><p>Maturitatea…</p>',
  },
};

test('parseWpPost: día, ponente, vídeo, id y lectura de una entrada diaria', () => {
  assert.deepEqual(parseWpPost(POST), { day: 315, speaker: 'Adi Ion', video: '91WVKzPoQ-4', id: 12449, reading: 'Iacov 1' });
});

test('parseWpPost: títulos con cero a la izquierda, sin fecha o que no son de un día', () => {
  assert.equal(parseWpPost({ ...POST, title: { rendered: 'Ziua 001 &#8211; Nelu Filip &#8211; 1 Ianuarie 2026' } }).day, 1);
  assert.equal(parseWpPost({ ...POST, title: { rendered: 'Ziua 41 Radu Mariș' } }).speaker, 'Radu Mariș');
  assert.equal(parseWpPost({ ...POST, title: { rendered: 'Anunț important' } }), null);
  assert.equal(parseWpPost({ ...POST, content: { rendered: '<p>Iacov 1</p>' } }).video, null);
});

test('parseYoutubeUpload: «Ziua 316 Paul Răducanu» subido la víspera a las 22:15 UTC', () => {
  const item = (title, publishedAt, videoId = 'IQjsyn26RTY') => ({ snippet: { title, publishedAt, resourceId: { videoId } } });
  assert.deepEqual(parseYoutubeUpload(item('Ziua 316 Paul Răducanu', '2026-11-11T22:15:02Z'), 2026), {
    day: 316,
    speaker: 'Paul Răducanu',
    video: 'IQjsyn26RTY',
  });
  assert.equal(parseYoutubeUpload(item('Gala Credo TV', '2026-11-11T22:15:02Z'), 2026), null);
  assert.equal(parseYoutubeUpload(item('Ziua 2 Alguien', '2026-11-11T22:15:02Z'), 2026), null);
});

test('decodeEntities: numéricas, hexadecimales y con nombre', () => {
  assert.equal(decodeEntities('a &#8211; b &#x219B; &amp; &nbsp;c'), 'a – b ↛ &  c');
});

test('parseYouVersionRefs: referencias en orden y sin repetir', () => {
  const html =
    '<a href="/bible/111/PSA.124.NIV">x</a><a href="/bible/111/PSA.125.NIV">y</a><a href="/bible/111/PRO.26.17-21.NIV?x=1">z</a><a href="/bible/111/PSA.124.NIV">x</a>';
  assert.deepEqual(parseYouVersionRefs(html), ['PSA.124', 'PSA.125', 'PRO.26.17-21']);
});

test('applySkips: el día 82 de YouVersion desaparece y el resto corre uno', () => {
  const yv = Array.from({ length: 366 }, (_, i) => [`D${i + 1}`]);
  const out = applySkips(yv, [82]);
  assert.equal(out.length, 365);
  assert.deepEqual(out[80], ['D81']);
  assert.deepEqual(out[81], ['D83']);
  assert.deepEqual(out[364], ['D366']);
});

test('formatReading: agrupa capítulos seguidos y usa el nombre de cada idioma', () => {
  assert.equal(formatReading('PSA.124;PSA.125;PRO.26.17-21', 'ro', books), 'Psalmii 124, 125; Proverbe 26:17–21');
  assert.equal(formatReading('PSA.36;PRO.8.32-36', 'es', books), 'Salmo 36; Proverbios 8:32–36');
  assert.equal(formatReading('JAS.1', 'es', books), 'Santiago 1');
  assert.equal(formatReading('PHM.1', 'ro', books), 'Filimon');
});

test('chaptersOfRomanianReading: lee lo que escribe la web del proyecto', () => {
  assert.deepEqual(chaptersOfRomanianReading('Psalmul 120, Psalmul 121, Proverbe 26:1-8', books), ['PSA.120', 'PSA.121', 'PRO.26']);
  assert.deepEqual(chaptersOfRomanianReading('Psalmul 64, Psalmul 65 și Proverbe 14:17-24', books), ['PSA.64', 'PSA.65', 'PRO.14']);
  assert.deepEqual(chaptersOfRomanianReading('Faptele Apostolilor 14', books), ['ACT.14']);
  assert.deepEqual(chaptersOfRomanianReading('Filimon', books), ['PHM.1']);
  assert.deepEqual(chaptersOfRomanianReading('1 Tesaloniceni 3', books), ['1TH.3']);
  assert.deepEqual(chaptersOfCode('PSA.124;PRO.26.17-21'), ['PSA.124', 'PRO.26']);
});

test('fechas: 2026 tiene 365 días y el 315 es el 11 de noviembre', () => {
  assert.equal(daysInYear(2026), 365);
  assert.equal(daysInYear(2028), 366);
  assert.equal(isoDateOfDay(2026, 315), '2026-11-11');
});

test('foldLine: ninguna línea pasa de 75 octetos ni parte un carácter', () => {
  const line = `SUMMARY:${'Împreună · '.repeat(20)}`;
  const folded = foldLine(line).split('\r\n');
  for (const part of folded) assert.ok(Buffer.byteLength(part) <= 75, part);
  assert.equal(folded.map((p, i) => (i ? p.slice(1) : p)).join(''), line);
});

test('buildIcs: un evento de día completo por día, con aviso a las 07:00', () => {
  const ics = buildIcs({ year: 2026, readings: ['MAT.1', 'PSA.1;PSA.2;PRO.1.1-7'], lang: 'ro', books });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20260102\r\nDTEND;VALUE=DATE:20260103/);
  assert.match(ics, /SUMMARY:Ziua 2 · Psalmii 1\\, 2\\; Proverbe 1:1–7/);
  assert.match(ics, /TRIGGER:PT7H/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('el primer jueves es día de post și rugăciune y el calendario lo dice', () => {
  assert.equal(isFastingDay(2026, 309), true); // 5 de noviembre
  assert.equal(isFastingDay(2026, 316), false); // 12 de noviembre
  const readings = Array.from({ length: 309 }, () => 'HEB.10');
  const ics = buildIcs({ year: 2026, readings, lang: 'ro', books });
  assert.match(ics, /SUMMARY:Ziua 309 · Evrei 10 · Post și rugăciune/);
  assert.match(ics, /DESCRIPTION:Prima joi din lună: zi de post și rugăciune/);
  assert.doesNotMatch(ics, /SUMMARY:Ziua 308 · Evrei 10 · Post/);
});

test('toJson: un día por línea y las filas de vídeo en una sola', () => {
  const json = toJson({ readings: ['MAT.1', 'MAT.2'], days: [['a', 'B', 1], null] });
  assert.match(json, /"readings": \[\n {4}"MAT.1",\n {4}"MAT.2"\n {2}\]/);
  assert.match(json, /\["a", "B", 1\]/);
  assert.deepEqual(JSON.parse(json), { readings: ['MAT.1', 'MAT.2'], days: [['a', 'B', 1], null] });
});
