#!/usr/bin/env node
/**
 * Proiectul Împreună — datos del módulo `/impreuna` (docs/ai/32-impreuna.md).
 *
 *   node scripts/sync-impreuna.mjs            Vídeos y ponentes ya publicados (WordPress
 *                                             de proiectulimpreuna.ro) + calendarios .ics
 *   node scripts/sync-impreuna.mjs --plan     Además rehace el plan de lecturas desde
 *                                             YouVersion (una vez por edición)
 *   node scripts/sync-impreuna.mjs --offline  Sólo regenera los .ics desde los JSON
 *   node scripts/sync-impreuna.mjs --year 2027
 *
 * Qué escribe:
 *   src/app/core/impreuna/data/<año>.plan.json   lecturas día a día (códigos USFM)
 *   src/app/core/impreuna/data/<año>.media.json  [vídeo, ponente, id del post] por día
 *   src/assets/calendars/impreuna-<año>-{ro,es}.ics   suscripción de calendario
 *
 * ── De dónde sale cada cosa (auditado el 11/11/2026) ─────────────────────
 * El proyecto sigue el plan de YouVersion 43657 («New Testament, Psalms &
 * Proverbs in a Year», 366 días) **con un salto**: el 23/03/2026 (día 82) se
 * saltaron el día 82 de YouVersion (Luca 12:35-59), así que desde entonces su
 * día N es el día N+1 de YouVersion. Se comprobó contra los 315 días ya
 * publicados: coinciden todos salvo 8 erratas de su web (p. ej. el día 306
 * pone «2 Tesaloniceni 3» y el vídeo es de Psalmul 119). Por eso la lectura
 * sale de YouVersion (normalizada) y de WordPress sólo el vídeo y el ponente;
 * las diferencias se avisan por consola, no se copian.
 *
 * Los resúmenes y motivos de oración de cada día **no** se copian: son texto
 * suyo; la web enlaza a su entrada.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = resolve(ROOT, 'src/app/core/impreuna/data');
const BOOKS_FILE = resolve(ROOT, 'src/app/core/impreuna/bible-books.json');
const ICS_DIR = resolve(ROOT, 'src/assets/calendars');

/** Origen público de la web (enlaces de los eventos del calendario). */
export const SITE = 'https://elimarganda.com';
const WP = 'https://proiectulimpreuna.ro';
const CONFIG_FILE = resolve(ROOT, 'src/app/core/church.config.ts');
/**
 * Lista de subidas del canal del Cult (`UU` + id del canal). Fuente principal
 * del vídeo: lo suben a las 22:15 UTC con el título «Ziua 316 Paul Răducanu»,
 * horas antes de que la web del proyecto publique su entrada.
 */
const YT_UPLOADS = 'UUqKwJYXPbht3Oh0riWfT1bg';
/** La clave de la web está restringida por dominio: se manda su `Referer`. */
const YT_REFERER = 'https://elimarganda.com/';

/**
 * Ediciones. Una por año: el plan de YouVersion que siguen, los días de ese
 * plan que se saltaron y la categoría de WordPress donde publican cada día.
 */
export const EDITIONS = {
  2026: { youversionPlan: 43657, youversionSkipped: [82], wpCategory: 'proiectul-impreuna-2026' },
};

/** Versión de bible.com por idioma: Cornilescu (VDC) y Reina-Valera 1960. */
export const BIBLE_VERSIONS = {
  ro: { id: 191, abbr: 'VDC' },
  es: { id: 149, abbr: 'RVR1960' },
};

const ICS_TEXT = {
  ro: {
    calendar: (y) => `Proiectul Împreună ${y}`,
    description: (y) =>
      `Citirea zilnică a Bibliei din Proiectul Împreună ${y} (Cultul Creștin Penticostal), cu meditația video a zilei. Biserica Elim Arganda.`,
    day: 'Ziua',
    read: 'Citește',
    more: 'Meditația video și motivele de rugăciune',
    fast: 'Post și rugăciune',
    fastLine: 'Prima joi din lună: zi de post și rugăciune, împreună cu tot Cultul Penticostal.',
  },
  es: {
    calendar: (y) => `Proiectul Împreună ${y} · Lectura diaria`,
    description: (y) =>
      `Lectura diaria de la Biblia del Proiectul Împreună ${y} (Cultul Creștin Penticostal, la Iglesia Pentecostal de Rumanía), con la meditación en vídeo del día. Iglesia Elim Arganda.`,
    day: 'Día',
    read: 'Lee',
    more: 'Meditación en vídeo y motivos de oración',
    fast: 'Ayuno y oración',
    fastLine: 'Primer jueves del mes: día de ayuno y oración con toda la Iglesia Pentecostal de Rumanía.',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Funciones puras (probadas en sync-impreuna.test.mjs)
// ─────────────────────────────────────────────────────────────────────────

/** Días del año (365 / 366). */
export function daysInYear(year) {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
}

/**
 * Primer jueves del mes: día de post și rugăciune del Cult. Misma regla que
 * `isFastingDay` de la app (core/impreuna/impreuna-plan.ts).
 */
export function isFastingDay(year, day) {
  const date = new Date(Date.UTC(year, 0, day));
  return date.getUTCDay() === 4 && date.getUTCDate() <= 7;
}

/** `YYYY-MM-DD` del día `day` (1 = 1 de enero) del año. */
export function isoDateOfDay(year, day) {
  return new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10);
}

/** Decodifica las entidades HTML que devuelve WordPress en títulos y párrafos. */
export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const stripTags = (html) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/**
 * Una entrada diaria de WordPress → `{ day, speaker, video, id, reading }`.
 * El título es «Ziua 315 – Adi Ion – 11 Noiembrie 2026»; el vídeo, el primer
 * `youtube.com/embed/<id>`; la lectura, el primer párrafo (sólo para avisar
 * de erratas). `null` si no es una entrada diaria.
 */
export function parseWpPost(post) {
  const title = decodeEntities(post?.title?.rendered ?? '').trim();
  const match =
    /^Ziua\s+0*(\d{1,3})\s*[–—-]\s*(.+?)\s*[–—-]\s*\d{1,2}\s+\p{L}+\s+\d{4}\s*$/u.exec(title) ??
    /^Ziua\s+0*(\d{1,3})\s*[–—-]?\s*(.*?)\s*$/u.exec(title);
  if (!match) return null;
  const html = post?.content?.rendered ?? '';
  const video =
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/.exec(html)?.[1] ??
    /youtu\.be\/([\w-]{11})/.exec(html)?.[1] ??
    /youtube\.com\/watch\?v=([\w-]{11})/.exec(html)?.[1] ??
    null;
  const firstParagraph = /<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
  return {
    day: Number(match[1]),
    speaker: match[2] || null,
    video,
    id: typeof post.id === 'number' ? post.id : null,
    reading: stripTags(firstParagraph),
  };
}

/**
 * Una subida del canal → `{ day, speaker, video }`. Título «Ziua 316 Paul
 * Răducanu»; se descarta lo que no es del proyecto y lo que no casa con la
 * fecha de subida (±3 días, hora de Rumanía). Misma regla que
 * `parseYoutubeUpload` de la app (core/impreuna/impreuna-plan.ts).
 */
export function parseYoutubeUpload(item, year) {
  const title = item?.snippet?.title?.trim() ?? '';
  const video = item?.snippet?.resourceId?.videoId ?? '';
  const match = /^Ziua\s+0*(\d{1,3})\b\s*[–—-]?\s*(.*?)\s*$/u.exec(title);
  if (!match || !/^[\w-]{11}$/.test(video)) return null;
  const day = Number(match[1]);
  const published = Date.parse(item?.snippet?.publishedAt ?? '');
  if (Number.isNaN(published)) return null;
  const ro = new Date(published + 3 * 3_600_000);
  const publishedDay = Math.round((Date.UTC(ro.getUTCFullYear(), ro.getUTCMonth(), ro.getUTCDate()) - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
  if (Math.abs(publishedDay - day) > 3) return null;
  return { day, speaker: match[2] || null, video };
}

/**
 * Referencias de un día de un plan de bible.com, en orden y sin repetir:
 * `/bible/111/PRO.26.17-21.NIV` → `PRO.26.17-21`.
 */
export function parseYouVersionRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/\/bible\/\d+\/([1-3A-Z]{3}\.\d+(?:\.\d+(?:-\d+)?)?)\.[A-Z0-9-]+["?#]/g)) {
    if (!refs.includes(m[1])) refs.push(m[1]);
  }
  return refs;
}

/**
 * Del plan de YouVersion (índice 0 = día 1) a los días de la edición:
 * quita los días saltados. `skipped` son números de día de YouVersion.
 */
export function applySkips(youversionDays, skipped) {
  return youversionDays.filter((_, i) => !skipped.includes(i + 1));
}

/** `PRO.26.17-21` → `{ book, chapter, from?, to? }`. */
export function parseRef(code) {
  const [book, chapter, verses] = code.split('.');
  const [from, to] = (verses ?? '').split('-').map(Number);
  return { book, chapter: Number(chapter), ...(from ? { from, to: to || from } : {}) };
}

/**
 * Lectura en texto, agrupando capítulos seguidos del mismo libro:
 * `PSA.124;PSA.125;PRO.26.17-21` → «Psalmii 124, 125; Proverbe 26:17–21».
 * Misma regla que `formatReading` de la app (core/impreuna/impreuna-plan.ts).
 */
export function formatReading(code, lang, books) {
  const groups = [];
  for (const ref of code.split(';').filter(Boolean).map(parseRef)) {
    const last = groups.at(-1);
    if (last && last.book === ref.book) last.refs.push(ref);
    else groups.push({ book: ref.book, refs: [ref] });
  }
  return groups
    .map(({ book, refs }) => {
      const meta = books[book] ?? { ro: book, es: book };
      if (meta.chapters === 1 && refs.length === 1 && !refs[0].from) return meta[lang];
      const one = refs.length === 1 ? meta[`${lang}One`] : undefined;
      const specs = refs.map((r) => (r.from ? `${r.chapter}:${r.from}${r.to !== r.from ? `–${r.to}` : ''}` : `${r.chapter}`));
      return `${one ?? meta[lang]} ${specs.join(', ')}`;
    })
    .join('; ');
}

/** Enlace a un pasaje en bible.com (abre la app Biblia si está instalada). */
export function bibleUrl(code, lang) {
  const v = BIBLE_VERSIONS[lang];
  return `https://www.bible.com/bible/${v.id}/${code}.${v.abbr}`;
}

/** Escapa un TEXT de iCalendar (RFC 5545 §3.3.11). */
export function escapeIcs(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Pliega una línea a 75 octetos sin partir caracteres UTF-8 (RFC 5545 §3.1). */
export function foldLine(line) {
  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    const limit = out.length === 0 ? 75 : 74; // las continuaciones llevan un espacio delante
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/**
 * Calendario de la edición en un idioma: un evento de día completo por día,
 * con la lectura en el título y aviso a las 07:00 de ese día.
 */
export function buildIcs({ year, readings, lang, books }) {
  const t = ICS_TEXT[lang];
  const stamp = `${year}0101T000000Z`; // fijo: el fichero no cambia si no cambia el plan
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Biserica Elim Arganda//Proiectul Impreuna ${year}//${lang.toUpperCase()}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(t.calendar(year))}`,
    `X-WR-CALDESC:${escapeIcs(t.description(year))}`,
    'X-WR-TIMEZONE:Europe/Madrid',
    'REFRESH-INTERVAL;VALUE=DURATION:P1W',
    'X-PUBLISHED-TTL:P1W',
  ];
  readings.forEach((code, i) => {
    const day = i + 1;
    const date = isoDateOfDay(year, day).replace(/-/g, '');
    const next = isoDateOfDay(year, day + 1).replace(/-/g, '');
    const reading = formatReading(code, lang, books);
    const fasting = isFastingDay(year, day);
    const summary = `${t.day} ${day} · ${reading}${fasting ? ` · ${t.fast}` : ''}`;
    const page = `${SITE}/impreuna/ziua/${day}${lang === 'es' ? '?lang=es' : ''}`;
    const links = code.split(';').map((ref) => bibleUrl(ref, lang));
    const description = [
      ...(fasting ? [t.fastLine, ''] : []),
      `${t.read}: ${reading}`,
      ...links,
      '',
      `${t.more}: ${page}`,
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:impreuna-${year}-${day}-${lang}@elimarganda.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `URL:${page}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(summary)}`,
      'TRIGGER:PT7H',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

const BOOK_ALIASES = {
  'faptele apostolilor': 'ACT',
  fapte: 'ACT',
  proverbele: 'PRO',
  psalmul: 'PSA',
  psalmii: 'PSA',
  psalm: 'PSA',
};

const normalize = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Capítulos (`LIBRO.CAP`) de una lectura escrita en rumano («Psalmul 120,
 * Psalmul 121, Proverbe 26:1-8»). Sólo para comparar con el plan.
 */
export function chaptersOfRomanianReading(text, books) {
  const names = Object.entries(books)
    .flatMap(([code, b]) => [[normalize(b.ro), code], ...(b.roOne ? [[normalize(b.roOne), code]] : [])])
    .concat(Object.entries(BOOK_ALIASES))
    .sort((a, b) => b[0].length - a[0].length);
  const out = [];
  let book = null;
  for (const raw of normalize(text).replace(/\s+si\s+/g, ',').split(/[,;]/)) {
    const part = raw.trim();
    if (!part) continue;
    const found = names.find(([name]) => part.startsWith(name));
    let rest = part;
    if (found) {
      book = found[1];
      rest = part.slice(found[0].length).trim();
    }
    if (!book) continue;
    const chapter = /^(\d+)/.exec(rest)?.[1] ?? (books[book]?.chapters === 1 ? '1' : null);
    if (chapter) out.push(`${book}.${chapter}`);
  }
  return out;
}

/** Capítulos de un día del plan (`PSA.124;PRO.26.17-21` → `PSA.124`, `PRO.26`). */
export const chaptersOfCode = (code) => code.split(';').map((r) => r.split('.').slice(0, 2).join('.'));

// ─────────────────────────────────────────────────────────────────────────
// Red y ficheros
// ─────────────────────────────────────────────────────────────────────────

async function getText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'elim-arganda-sync/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { body: await res.text(), headers: res.headers };
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function fetchYouVersionPlan(planId) {
  const days = [];
  for (let day = 1; ; day += 40) {
    const batch = Array.from({ length: 40 }, (_, i) => day + i);
    const refs = await mapLimit(batch, 8, async (d) => {
      try {
        return parseYouVersionRefs((await getText(`https://www.bible.com/reading-plans/${planId}/day/${d}`)).body);
      } catch {
        return null;
      }
    });
    const end = refs.findIndex((r) => !r || r.length === 0);
    days.push(...(end === -1 ? refs : refs.slice(0, end)));
    if (end !== -1) return days;
  }
}

async function fetchWpPosts(categorySlug) {
  const { body } = await getText(`${WP}/wp-json/wp/v2/categories?slug=${categorySlug}&_fields=id`);
  const category = JSON.parse(body)[0]?.id;
  if (!category) throw new Error(`Categoría ${categorySlug} no encontrada`);
  const posts = [];
  for (let page = 1; ; page++) {
    const url = `${WP}/wp-json/wp/v2/posts?categories=${category}&per_page=100&page=${page}&orderby=date&order=asc&_fields=id,date,title,content`;
    const { body: json, headers } = await getText(url);
    posts.push(...JSON.parse(json));
    if (page >= Number(headers.get('x-wp-totalpages') ?? 1)) return { category, posts };
  }
}

/** Clave de la YouTube Data API: `YOUTUBE_API_KEY` o la de `church.config.ts`. */
async function youtubeKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const config = await readFile(CONFIG_FILE, 'utf8');
  return /youtubeApiKey:\s*'([^']+)'/.exec(config)?.[1] ?? null;
}

/** Subidas del canal desde el principio de la edición (páginas de 50, más recientes primero). */
async function fetchYoutubeUploads(year) {
  const key = await youtubeKey();
  if (!key) throw new Error('sin clave de YouTube');
  const since = Date.UTC(year - 1, 11, 30);
  const items = [];
  let pageToken = '';
  for (let page = 0; page < 12; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${YT_UPLOADS}` +
      `&fields=nextPageToken,items(snippet(publishedAt,title,resourceId/videoId))&key=${key}` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    const res = await fetch(url, { headers: { Referer: YT_REFERER } });
    if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
    const json = await res.json();
    items.push(...(json.items ?? []));
    const oldest = Date.parse(json.items?.at(-1)?.snippet?.publishedAt ?? '');
    if (!json.nextPageToken || oldest < since) break;
    pageToken = json.nextPageToken;
  }
  return items;
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
/**
 * JSON legible y con diffs limpios: un día por línea. Las listas anidadas
 * (`[vídeo, ponente, id]`) van en una sola línea.
 */
export function toJson(data) {
  return (
    JSON.stringify(data, null, 2).replace(/\[\n {6,}([^[\]{}]*?)\n {4,}\]/g, (_, inner) => `[${inner.replace(/,\n\s+/g, ', ')}]`) +
    '\n'
  );
}
const writeJson = (file, data) => writeFile(file, toJson(data));

async function main() {
  const argv = process.argv.slice(2);
  const year = Number(argv[argv.indexOf('--year') + 1]) || Number(Object.keys(EDITIONS).at(-1));
  const edition = EDITIONS[year];
  if (!edition) throw new Error(`No hay edición ${year} en EDITIONS`);
  const offline = argv.includes('--offline');
  const { books } = await readJson(BOOKS_FILE);
  await mkdir(DATA_DIR, { recursive: true });
  const planFile = resolve(DATA_DIR, `${year}.plan.json`);
  const mediaFile = resolve(DATA_DIR, `${year}.media.json`);

  // 1 · Plan de lecturas (YouVersion), sólo con --plan.
  if (argv.includes('--plan') && !offline) {
    console.log(`YouVersion ${edition.youversionPlan}: descargando días…`);
    const yv = await fetchYouVersionPlan(edition.youversionPlan);
    const readings = applySkips(yv, edition.youversionSkipped).map((refs) => refs.join(';'));
    if (readings.length !== daysInYear(year)) {
      throw new Error(`El plan da ${readings.length} días y ${year} tiene ${daysInYear(year)}: revisa youversionSkipped`);
    }
    await writeJson(planFile, {
      year,
      source: { youversion: edition.youversionPlan, skipped: edition.youversionSkipped },
      readings,
    });
    console.log(`✓ ${planFile} (${readings.length} días)`);
  }
  const plan = await readJson(planFile);

  // 2 · Vídeos y ponentes: la web del proyecto (entrada + vídeo) y YouTube
  //     (el vídeo de los días que su web aún no ha publicado).
  if (!offline) {
    const { category, posts } = await fetchWpPosts(edition.wpCategory);
    const media = [];
    const warnings = [];
    for (const post of posts) {
      const parsed = parseWpPost(post);
      if (!parsed || parsed.day < 1 || parsed.day > plan.readings.length) continue;
      media[parsed.day - 1] = [parsed.video, parsed.speaker, parsed.id];
      const expected = chaptersOfCode(plan.readings[parsed.day - 1]).join(' ');
      const published = chaptersOfRomanianReading(parsed.reading, books).join(' ');
      if (published && published !== expected) {
        warnings.push(`  ziua ${parsed.day}: web «${parsed.reading}» · plan ${plan.readings[parsed.day - 1]}`);
      }
      if (!parsed.video) warnings.push(`  ziua ${parsed.day}: sin vídeo`);
    }
    let fromYoutube = 0;
    try {
      for (const item of await fetchYoutubeUploads(year)) {
        const up = parseYoutubeUpload(item, year);
        if (!up || up.day < 1 || up.day > plan.readings.length) continue;
        const row = media[up.day - 1];
        if (row?.[0]) continue; // la web ya lo tiene: manda su entrada
        media[up.day - 1] = [up.video, row?.[1] ?? up.speaker, row?.[2] ?? null];
        fromYoutube++;
      }
    } catch (err) {
      console.log(`YouTube no disponible (${err.message}): sólo la web del proyecto.`);
    }
    const days = Array.from({ length: media.length }, (_, i) => media[i] ?? null);
    await writeJson(mediaFile, { year, wpCategory: category, updated: new Date().toISOString(), days });
    console.log(`✓ ${mediaFile} (${days.filter((d) => d?.[0]).length} días con vídeo; ${fromYoutube} sólo de YouTube)`);
    if (warnings.length) console.log(`Diferencias con su web (erratas suyas; manda el plan):\n${warnings.join('\n')}`);
  }

  // 3 · Calendarios.
  await mkdir(ICS_DIR, { recursive: true });
  for (const lang of ['ro', 'es']) {
    const file = resolve(ICS_DIR, `impreuna-${year}-${lang}.ics`);
    await writeFile(file, buildIcs({ year, readings: plan.readings, lang, books }));
    console.log(`✓ ${file}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
