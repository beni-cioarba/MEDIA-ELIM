/**
 * Referencias bíblicas — lógica pura, sin Angular: libros (USFM ↔ nombres en
 * rumano / español), pasajes (`PRO.26.17-21`), cómo se escriben en cada
 * idioma y sus enlaces a bible.com (texto, audio, `intent:` de Android).
 *
 * Lo usan Proiectul Împreună (`/impreuna`), Citirea Bibliei y la portada.
 * Pruebas: `bible-refs.spec.ts`. Docs: `docs/ai/32-impreuna.md` → «Citirea zilei».
 */
import booksJson from './bible-books.json';

export type BibleLang = 'ro' | 'es';

interface BookNames {
  readonly ro: string;
  readonly es: string;
  readonly roOne?: string;
  readonly esOne?: string;
  readonly chapters?: number;
}

const BOOKS = booksJson.books as Readonly<Record<string, BookNames>>;
/** Los 66 libros en el orden del canon (códigos USFM). */
export const BIBLE_BOOK_ORDER: readonly string[] = Object.keys(BOOKS);
const BOOK_ORDER = BIBLE_BOOK_ORDER;
/** Índice del primer libro del Nuevo Testamento (Mateo) en el canon. */
const FIRST_NT = BOOK_ORDER.indexOf('MAT');

/** ¿Es del Nuevo Testamento? */
export function isNewTestament(book: string): boolean {
  return BOOK_ORDER.indexOf(book) >= FIRST_NT;
}

/** Capítulos de un libro (0 si no se conoce el libro). */
export function bookChapters(book: string): number {
  return BOOKS[book]?.chapters ?? 0;
}

/** Una referencia: libro, capítulo y, si no es el capítulo entero, versículos. */
export interface PassageRef {
  /** Código tal cual (`PRO.26.17-21`): es también el del enlace a bible.com. */
  readonly code: string;
  readonly book: string;
  readonly chapter: number;
  readonly from?: number;
  readonly to?: number;
}

/** Referencias seguidas del mismo libro, ya rotuladas («Psalmii 124, 125»). */
export interface PassageGroup {
  readonly book: string;
  readonly label: string;
  readonly refs: readonly PassageRef[];
}

/** Versión de bible.com en la que se abre la lectura en cada idioma. */
export interface BibleVersion {
  readonly id: number;
  readonly abbr: string;
  readonly name: string;
  /** Nombre corto para un botón («Cornilescu», «RVR 1960»). */
  readonly short: string;
}

/** Cornilescu en rumano y Reina-Valera 1960 en español (ids verificados en bible.com). */
export const BIBLE_VERSIONS: Readonly<Record<BibleLang, BibleVersion>> = {
  ro: { id: 191, abbr: 'VDC', name: 'Cornilescu', short: 'Cornilescu' },
  es: { id: 149, abbr: 'RVR1960', name: 'Reina-Valera 1960', short: 'RVR 1960' },
};

/** `PRO.26.17-21` → `{ book: 'PRO', chapter: 26, from: 17, to: 21 }`. */
export function parseRef(code: string): PassageRef {
  const [book, chapter, verses] = code.split('.');
  const [from, to] = (verses ?? '').split('-').map(Number);
  return from
    ? { code, book, chapter: Number(chapter), from, to: to || from }
    : { code, book, chapter: Number(chapter) };
}

/** Una lectura del plan (`PSA.124;PSA.125`) → sus referencias, en orden. */
export function parseReading(reading: string): readonly PassageRef[] {
  return reading.split(';').filter(Boolean).map(parseRef);
}

/** Nombre del libro en el idioma; `single` = se cita un solo capítulo. */
export function bookName(book: string, lang: BibleLang, single = false): string {
  const names = BOOKS[book];
  if (!names) return book;
  return (single ? names[lang === 'ro' ? 'roOne' : 'esOne'] : undefined) ?? names[lang];
}

/** `26` · `26:17–21` · `26:5`. */
function chapterSpec(ref: PassageRef): string {
  if (!ref.from) return String(ref.chapter);
  return ref.to && ref.to !== ref.from ? `${ref.chapter}:${ref.from}–${ref.to}` : `${ref.chapter}:${ref.from}`;
}

/** Un pasaje suelto, con su libro: «Psalmul 124», «Proverbe 26:17–21», «Filimon». */
export function refLabel(ref: PassageRef, lang: BibleLang): string {
  if (BOOKS[ref.book]?.chapters === 1 && !ref.from) return bookName(ref.book, lang);
  return `${bookName(ref.book, lang, true)} ${chapterSpec(ref)}`;
}

/** Agrupa referencias seguidas del mismo libro y las rotula. */
export function groupRefs(refs: readonly PassageRef[], lang: BibleLang): readonly PassageGroup[] {
  const groups: { book: string; refs: PassageRef[] }[] = [];
  for (const ref of refs) {
    const last = groups.at(-1);
    if (last && last.book === ref.book) last.refs.push(ref);
    else groups.push({ book: ref.book, refs: [ref] });
  }
  return groups.map(({ book, refs: list }) => ({
    book,
    refs: list,
    label:
      list.length === 1
        ? refLabel(list[0], lang)
        : `${bookName(book, lang)} ${list.map(chapterSpec).join(', ')}`,
  }));
}

/**
 * La lectura en una línea: «Psalmii 124, 125; Proverbe 26:17–21». Misma regla
 * que `formatReading` de `scripts/sync-impreuna.mjs` (calendarios .ics).
 */
export function formatReading(refs: readonly PassageRef[], lang: BibleLang): string {
  return groupRefs(refs, lang)
    .map((g) => g.label)
    .join('; ');
}

/** Enlace al pasaje en bible.com; en el móvil abre la app Biblia si está instalada. */
export function bibleUrl(ref: PassageRef, lang: BibleLang): string {
  const v = BIBLE_VERSIONS[lang];
  return `https://www.bible.com/bible/${v.id}/${ref.code}.${v.abbr}`;
}

/** El pasaje en audio en bible.com (Cornilescu y RVR1960 tienen audio; comprobado el 12/11/2026). */
export function bibleAudioUrl(ref: PassageRef, lang: BibleLang): string {
  const v = BIBLE_VERSIONS[lang];
  return `https://www.bible.com/audio-bible/${v.id}/${ref.code}.${v.abbr}`;
}

/**
 * Enlace `intent:` de Android (Chrome, Edge, Samsung Internet): abre `url` en
 * la app `pkg` si está instalada y, si no, el navegador va a `fallback`. Es el
 * mecanismo oficial para «abre la app o, si no la tiene, otra cosa»; ninguna
 * web puede preguntar qué apps hay instaladas.
 * https://developer.chrome.com/docs/android/intents
 */
export function androidIntentUrl(url: string, pkg: string, fallback: string): string {
  const { protocol, host, pathname, search } = new URL(url);
  return (
    `intent://${host}${pathname}${search}#Intent;scheme=${protocol.slice(0, -1)};package=${pkg};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  );
}

/** Para comparar nombres: sin diacríticos (ţ/ț, â/ă…), espacios simples, minúsculas. */
const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Nombre rumano del libro (también «Psalmul») → código USFM. */
const RO_BOOKS: ReadonlyMap<string, string> = new Map(
  Object.entries(BOOKS).flatMap(([code, names]) =>
    [names.ro, names.roOne].filter((n): n is string => !!n).map((n) => [normalizeName(n), code] as const),
  ),
);

/** Un trozo de plan: «Ezechiel 1-3», «Psalmul 23», «Proverbe 26:22-28» o sólo «5» (mismo libro). */
const RO_PART = /^(?:(.*?\D)\s+)?(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?(?:\s*-\s*(\d{1,3}))?$/u;

/**
 * Un texto de plan escrito en rumano («Isaia 43-44», «Plângerile lui Ieremia 5,
 * Ezechiel 1», «1 Samuel 3-4; Psalmul 23») → sus referencias, **un capítulo
 * por referencia** (un tramo de capítulos se lee capítulo a capítulo, y así se
 * abre en la Biblia y se escucha). Acepta el texto ya compuesto por
 * `typesetPassage` (raya y WORD JOINER). Lo que no reconoce lo descarta: mejor
 * nada que un enlace a otro libro.
 */
export function parseRomanianPassage(text: string): readonly PassageRef[] {
  const refs: PassageRef[] = [];
  let book: string | null = null;
  for (const raw of text.replace(/⁠/g, '').split(/[;,]/)) {
    const match = RO_PART.exec(raw.trim().replace(/\s*[–—]\s*/g, '-'));
    if (!match) continue;
    if (match[1]) book = RO_BOOKS.get(normalizeName(match[1])) ?? null;
    if (!book) continue;
    const first = Number(match[2]);
    if (match[3]) {
      refs.push(parseRef(`${book}.${first}.${match[3]}${match[4] ? `-${match[4]}` : ''}`));
      continue;
    }
    const last = Math.min(match[5] ? Number(match[5]) : first, first + 150);
    for (let chapter = first; chapter <= last; chapter++) refs.push(parseRef(`${book}.${chapter}`));
  }
  return refs;
}
