/**
 * Proiectul Împreună — lógica pura del plan (sin Angular, sin estado).
 *
 * Todo lo que es cálculo vive aquí y se prueba en `impreuna-plan.spec.ts`:
 * qué día del plan toca una fecha, cómo se escribe una lectura en cada
 * idioma, el enlace a bible.com, el día equivalente de YouVersion, la semana
 * de un día y cómo se lee una entrada de la web del proyecto.
 *
 * Las lecturas llegan como códigos USFM de bible.com (`PSA.124;PRO.26.17-21`),
 * que es como las da YouVersion y como se enlaza un pasaje: el texto se
 * compone aquí en el idioma de la página. Ver `docs/ai/32-impreuna.md`.
 */
import { BIBLE_BOOK_ORDER, PassageRef, isNewTestament } from '../bible/bible-refs';

/**
 * Qué se lee ese día. El plan alterna cinco días de Nuevo Testamento con dos
 * de Psalmi y Proverbe (`wisdom`); `ot` queda para planes futuros.
 */
export type DayKind = 'nt' | 'wisdom' | 'ot';

const WISDOM = new Set(['PSA', 'PRO']);
const DAY_MS = 86_400_000;

/** Tipo de día según sus libros (ver `DayKind`). */
export function dayKind(refs: readonly PassageRef[]): DayKind {
  if (refs.length > 0 && refs.every((r) => WISDOM.has(r.book))) return 'wisdom';
  const main = refs.find((r) => !WISDOM.has(r.book));
  return main && BIBLE_BOOK_ORDER.includes(main.book) && !isNewTestament(main.book) ? 'ot' : 'nt';
}

/**
 * Día del plan de YouVersion que corresponde a un día de la edición. El
 * proyecto se saltó días del plan (en 2026, el 82): desde ahí van uno más.
 */
export function youversionDay(day: number, skipped: readonly number[]): number {
  let yv = day;
  for (const s of [...skipped].sort((a, b) => a - b)) if (s <= yv) yv++;
  return yv;
}

/** Días que tiene el año. */
export function daysInYear(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;
}

/**
 * Ordinal del día en el año de la edición según la **fecha local** del
 * dispositivo (1 = 1 de enero). Puede salir ≤ 0 (antes) o > total (después):
 * quien llama decide qué hacer fuera de la edición.
 */
export function dayOfEdition(date: Date, year: number): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((local - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
}

/** Fecha (`YYYY-MM-DD`) del día `day` de la edición. */
export function isoDateOfDay(year: number, day: number): string {
  return new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10);
}

/** `Date` a mediodía local del día (para formatear sin saltos de zona horaria). */
export function localDateOfDay(year: number, day: number): Date {
  return new Date(year, 0, day, 12);
}

/** Días (1-based) de la semana lunes → domingo que contiene `day`, dentro de la edición. */
export function weekOf(year: number, day: number, total: number): readonly number[] {
  const weekday = (new Date(Date.UTC(year, 0, day)).getUTCDay() + 6) % 7; // lunes = 0
  const monday = day - weekday;
  return Array.from({ length: 7 }, (_, i) => monday + i).filter((d) => d >= 1 && d <= total);
}

/**
 * Semana que se **anuncia** en la iglesia: la que contiene mañana, como el
 * bloque de lectura de la iglesia. El domingo (día de culto) ya es la que
 * empieza el lunes; de lunes a sábado, la de hoy. Antes de la edición, la
 * primera; acabada, la última.
 */
export function announcedWeek(
  year: number,
  today: { readonly status: 'before' | 'running' | 'ended'; readonly day: number },
  total: number,
): readonly number[] {
  const anchor = today.status === 'before' ? 1 : Math.min(today.day + 1, total);
  return weekOf(year, anchor, total);
}

/** Primer y último día (1-based) del mes `month` (0 = enero) en la edición. */
export function monthRange(year: number, month: number): { readonly first: number; readonly last: number } {
  const first = Math.round((Date.UTC(year, month, 1) - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
  const last = Math.round((Date.UTC(year, month + 1, 0) - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
  return { first, last };
}

/** Mes (0 = enero) en que cae el día de la edición. */
export function monthOfDay(year: number, day: number): number {
  return new Date(Date.UTC(year, 0, day)).getUTCMonth();
}

/**
 * Rejilla de un mes para el calendario: semanas de lunes a domingo con el día
 * de la edición en cada casilla (`null` = casilla vacía antes del 1 o tras el
 * último).
 */
export function monthGrid(year: number, month: number): readonly (readonly (number | null)[])[] {
  const { first, last } = monthRange(year, month);
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const cells: (number | null)[] = [...Array<null>(lead).fill(null)];
  for (let day = first; day <= last; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/**
 * ¿Es día de **post și rugăciune**? El Cult lo convoca el primer jueves de
 * cada mes («Postul Împreună», cultulpenticostal.ro, 19/12/2023).
 */
export function isFastingDay(year: number, day: number): boolean {
  const date = new Date(Date.UTC(year, 0, day));
  return date.getUTCDay() === 4 && date.getUTCDate() <= 7;
}

/** Primer día de ayuno desde `from` (incluido) dentro de la edición, o `null`. */
export function nextFastingDay(year: number, from: number, total: number): number | null {
  for (let day = Math.max(1, from); day <= total; day++) if (isFastingDay(year, day)) return day;
  return null;
}

/**
 * «Azi», «ieri», «mâine», «acum 36 de zile», «peste 5 zile» (o en español):
 * dónde cae un día respecto a hoy, con la primera en mayúscula.
 */
export function relativeDay(day: number, today: number, locale: string): string {
  const text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day - today, 'day');
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/**
 * Primer jueves del mes de `date` si aún no ha pasado; si no, el del mes
 * siguiente. El proyecto propone ese día para ayuno y oración.
 */
export function nextFirstThursday(date: Date): Date {
  const firstThursday = (y: number, m: number) => {
    const first = new Date(y, m, 1, 12);
    return new Date(y, m, 1 + ((4 - first.getDay() + 7) % 7), 12);
  };
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const thisMonth = firstThursday(today.getFullYear(), today.getMonth());
  return thisMonth >= today ? thisMonth : firstThursday(today.getFullYear(), today.getMonth() + 1);
}

/**
 * Racha: días seguidos leídos que terminan hoy (o ayer, si hoy aún no se ha
 * marcado: la racha no se rompe hasta que acaba el día).
 */
export function readingStreak(read: ReadonlySet<number>, today: number): number {
  let day = read.has(today) ? today : today - 1;
  let streak = 0;
  while (day >= 1 && read.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

// ── YouTube (fuente principal del vídeo) ─────────────────────────────────

/** Forma mínima de un elemento de `playlistItems.list` (con `fields` recortado). */
export interface YoutubePlaylistItemJson {
  readonly snippet?: {
    readonly title?: string;
    readonly publishedAt?: string;
    readonly resourceId?: { readonly videoId?: string };
  };
}

/**
 * Una subida del canal del Cult → día, vídeo y ponente. El título es «Ziua 316
 * Paul Răducanu». Se descarta lo que no es del proyecto (otros vídeos del
 * canal) y lo que no casa con la fecha de subida (una edición nueva vuelve a
 * empezar en «Ziua 1»): el número del título y el día del año en que se subió
 * (hora de Rumanía, UTC+2/3) no pueden distar más de 3 días.
 * Misma regla que `parseYoutubeUpload` de `scripts/sync-impreuna.mjs`.
 */
export function parseYoutubeUpload(item: YoutubePlaylistItemJson, year: number): WpDayPost | null {
  // NFC: YouTube manda a veces los diacríticos descompuestos («a» + breve).
  const title = (item.snippet?.title ?? '').normalize('NFC').trim();
  const video = item.snippet?.resourceId?.videoId ?? '';
  const match = /^Ziua\s+0*(\d{1,3})\b\s*[–—-]?\s*(.*?)\s*$/u.exec(title);
  if (!match || !/^[\w-]{11}$/.test(video)) return null;
  const day = Number(match[1]);
  const published = Date.parse(item.snippet?.publishedAt ?? '');
  if (Number.isNaN(published)) return null;
  // A la hora de Rumanía: lo suben a las 00:15 de allí (22:15 UTC del día anterior).
  const ro = new Date(published + 3 * 3_600_000);
  const publishedDay = Math.round((Date.UTC(ro.getUTCFullYear(), ro.getUTCMonth(), ro.getUTCDate()) - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
  if (Math.abs(publishedDay - day) > 3) return null;
  return { day, video, speaker: match[2] || null, postId: null };
}

// ── Web del proyecto (WordPress) ─────────────────────────────────────────

/** Lo que se toma de cada entrada diaria de proiectulimpreuna.ro. */
export interface WpDayPost {
  readonly day: number;
  readonly video: string | null;
  readonly speaker: string | null;
  readonly postId: number | null;
}

/** Forma mínima de una entrada de la API REST de WordPress. */
export interface WpPostJson {
  readonly id?: number;
  readonly title?: { readonly rendered?: string };
  readonly content?: { readonly rendered?: string };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/**
 * Una entrada diaria («Ziua 315 – Adi Ion – 11 Noiembrie 2026», con el vídeo
 * incrustado) → día, vídeo, ponente e id. `null` si no es una entrada diaria.
 * Misma regla que `parseWpPost` de `scripts/sync-impreuna.mjs`.
 */
export function parseWpPost(post: WpPostJson): WpDayPost | null {
  const title = decodeEntities(post.title?.rendered ?? '').normalize('NFC').trim();
  const match =
    /^Ziua\s+0*(\d{1,3})\s*[–—-]\s*(.+?)\s*[–—-]\s*\d{1,2}\s+\p{L}+\s+\d{4}\s*$/u.exec(title) ??
    /^Ziua\s+0*(\d{1,3})\s*[–—-]?\s*(.*?)\s*$/u.exec(title);
  if (!match) return null;
  const html = post.content?.rendered ?? '';
  const video =
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/.exec(html)?.[1] ??
    /youtu\.be\/([\w-]{11})/.exec(html)?.[1] ??
    /youtube\.com\/watch\?v=([\w-]{11})/.exec(html)?.[1] ??
    null;
  return {
    day: Number(match[1]),
    video,
    speaker: match[2] || null,
    postId: typeof post.id === 'number' ? post.id : null,
  };
}
