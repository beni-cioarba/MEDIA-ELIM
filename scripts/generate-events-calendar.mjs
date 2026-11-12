#!/usr/bin/env node
/**
 * Calendario de suscripción de la iglesia → `src/assets/calendars/elim-events.ics`.
 *
 *   npm run calendar:events        (también lo corren prestart, prebuild y el deploy)
 *
 * Es el fichero que abre «Abonează-te» en Evenimente:
 * `CalendarService.webcalUrlForAll()` → `webcal://<host>/assets/calendars/elim-events.ics`.
 * Sale entero de `core/church.config.ts`; no hay nada que tocar a mano:
 *   · cada `upcomingEvents`, una entrada por hora («10:00 & 18:00» → dos) o de día
 *     completo si aún no tiene hora. Los pasados también: en el calendario de quien
 *     se suscribe quedan como historial, y se van cuando se borran del config;
 *   · el `weeklyProgram`, como series `RRULE` (una por culto y hora) desde
 *     `PROGRAM_SINCE`. Las sesiones mensuales (`monthly`: Cina Domnului el primer
 *     domingo…) son series propias, descontadas de la normal;
 *   · un evento a la hora de un culto lo sustituye ese día (`EXDATE`): como en la
 *     web (`ScheduleService`), «manda el manual».
 *
 * Determinista: el mismo config da el mismo fichero byte a byte (DTSTAMP fijo,
 * orden estable). Por eso no se sube al repo (`.gitignore`): se regenera siempre.
 * El TypeScript se lee con `lib/load-ts-module.mjs`, así que da igual el Node que
 * lo ejecute (el 20 del PATH, el 24 del CI). docs/ai/50-build-deploy.md →
 * «Calendario de suscripción».
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTsModule } from './lib/load-ts-module.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = resolve(ROOT, 'src/app/core/church.config.ts');
const PATHS_FILE = resolve(ROOT, 'src/app/core/navigation/app-paths.ts');
const I18N_FILE = resolve(ROOT, 'src/assets/i18n/ro.json');
/** Ruta pública: la que pide `CalendarService.webcalUrlForAll()` (base de la app + esto). */
export const FEED_PATH = 'assets/calendars/elim-events.ics';
const OUT_FILE = resolve(ROOT, 'src', FEED_PATH);

/** El de `CalendarService`: descarga suelta y suscripción son el mismo calendario. */
const PRODID = '-//Biserica Elim Arganda//Eventos//RO';
/** Las horas del config son de Madrid: se publican con `TZID`, no «flotantes». */
export const TZID = 'Europe/Madrid';
/** Duración de cultos y eventos (= `CalendarService.DEFAULT_DURATION_MIN`). */
const DURATION_MIN = 120;
/**
 * `DTSTAMP` fijo (con METHOD:PUBLISH dice cuándo se creó el fichero): así el
 * mismo config da el mismo fichero. Quien se suscribe relee el calendario
 * entero en cada refresco; no lo necesita para enterarse de un cambio.
 */
const DTSTAMP = '20261111T000000Z';
/**
 * Desde qué día sale el programa semanal: el `DTSTART` de cada serie es su
 * primera vez a partir de aquí. Fijo, por lo mismo que `DTSTAMP`; anterior a
 * los eventos del config, para que el historial de los dos empiece a la vez.
 */
export const PROGRAM_SINCE = '2026-09-01';

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_MS = 86_400_000;

/** Huso de Madrid (CET/CEST, reglas de la UE): la definición que exige cada `TZID`. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  `X-LIC-LOCATION:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/* ───────────────────────────── Formato ───────────────────────────── */

/** Escapa un TEXT de iCalendar (RFC 5545 §3.3.11). */
export function escapeIcs(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
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

/** El `slug` de `CalendarService`: los UID coinciden con los de sus descargas. */
export function slug(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Horas `HH:MM` de un texto libre, en orden y sin repetir («10:00 & 18:00» → dos; «» → ninguna). */
export function timesOf(text) {
  const times = [...String(text ?? '').matchAll(/(\d{1,2}):(\d{2})/g)]
    .filter(([, h, m]) => Number(h) < 24 && Number(m) < 60)
    .map(([, h, m]) => `${h.padStart(2, '0')}:${m}`);
  return [...new Set(times)];
}

const minutesOf = (hhmm) => (hhmm ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) : 24 * 60);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* ───────────────────────────── Fechas ────────────────────────────── */
// Fechas de calendario en UTC sólo para contar días: sin husos ni cambios de hora.

function parseDay(iso, what) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  const date = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!date || date.getUTCMonth() !== +m[2] - 1) throw new Error(`${what}: la fecha «${iso}» no es YYYY-MM-DD`);
  return date;
}

const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
const icsDate = (date) => date.toISOString().slice(0, 10).replace(/-/g, '');

/** `YYYYMMDDTHHMMSS` de pared: fecha + hora (+ minutos; pasa al día siguiente si toca). */
function icsLocal(date, hhmm, plusMinutes = 0) {
  return new Date(date.getTime() + (minutesOf(hhmm) + plusMinutes) * 60_000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, '');
}

/** Qué vez es la fecha de su día de la semana en el mes (1–5) y cuántas tiene ese mes (4–5). */
function weekOfMonth(date) {
  const day = date.getUTCDate();
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const nth = Math.ceil(day / 7);
  return { nth, count: nth + Math.floor((last - day) / 7) };
}

/* ─────────────────────── Reglas mensuales → RRULE ─────────────────────── */

/** Ordinales de `BYDAY` en una regla mensual: 1…5 desde el principio, −1…−5 desde el final. */
const ORDINALS = [1, 2, 3, 4, 5, -1, -2, -3, -4, -5];
/** Todas las semanas posibles de un día en un mes: la `nth` de `count` (meses de 4 y de 5). */
const WEEKS = [4, 5].flatMap((count) => Array.from({ length: count }, (_, i) => ({ nth: i + 1, count })));
/** ¿El ordinal `o` (o el `nth` de una `MonthlyRule`: 1–4, −1) cae en la vez `nth` de `count`? */
const hits = (o, nth, count) => (o > 0 ? nth === o : nth === count + 1 + o);

/**
 * El conjunto más pequeño de ordinales `BYDAY` que da exactamente las semanas
 * en que `keep(nth, count)`, tenga el mes 4 o 5 de ese día. Fuerza bruta sobre
 * los 1.023 conjuntos: instantáneo, y acierta en los casos raros (quitar «el
 * último» no es quitar «el 4.º»). `null` si ninguno es exacto.
 */
export function ordinalsFor(keep) {
  let best = null;
  for (let mask = 1; mask < 1 << ORDINALS.length; mask++) {
    const set = ORDINALS.filter((_, i) => mask & (1 << i));
    if (best && set.length >= best.length) continue;
    if (WEEKS.every(({ nth, count }) => keep(nth, count) === set.some((o) => hits(o, nth, count)))) best = set;
  }
  return best;
}

/**
 * Series del programa semanal: una por culto y hora, y una más por cada sesión
 * mensual de esa hora, que se descuenta de la normal. Si dos reglas caen el
 * mismo día, manda la primera (como `ScheduleService.sessionsOn`).
 * `ordinals: null` = semanal.
 */
export function programSeries(program, warn = console.warn) {
  const series = [];
  for (const p of program) {
    if (!ICS_DAYS[p.day]) throw new Error(`weeklyProgram «${p.id}»: day ${p.day} no es 0–6`);
    const times = timesOf(p.time);
    if (!times.length) warn(`weeklyProgram «${p.id}»: «${p.time}» no tiene hora HH:MM; no sale en el calendario`);
    for (const time of times) {
      const rules = [];
      for (const m of p.monthly ?? []) {
        if (m.rule.weekday !== p.day || timesOf(m.time)[0] !== time) continue; // no renombra nada
        if (!rules.some((r) => r.rule.nth === m.rule.nth)) rules.push(m);
      }
      const ruledBefore = (i, nth, count) => rules.slice(0, i).some((r) => hits(r.rule.nth, nth, count));
      const id = `program-${slug(p.id)}-${time.replace(':', '')}`;
      // `fallback`: lo que sale si `keep` no cabe en una RRULE (de más, nunca de menos).
      const add = (suffix, title, keep, fallback) => {
        if (!WEEKS.some(({ nth, count }) => keep(nth, count))) return; // nunca toca
        let ordinals = null; // semanal
        if (!WEEKS.every(({ nth, count }) => keep(nth, count))) {
          ordinals = ordinalsFor(keep);
          if (!ordinals) {
            const as = fallback ? `BYDAY=${fallback.map((o) => `${o}${ICS_DAYS[p.day]}`).join(',')}` : 'semanal';
            warn(`weeklyProgram «${p.id}» ${time}: sus reglas mensuales no caben en una RRULE; «${title}» sale como ${as}`);
            ordinals = fallback;
          }
        }
        series.push({
          uid: `${id}${suffix}-recurring@elim-arganda`,
          source: p.id,
          weekday: p.day,
          time,
          ordinals,
          title,
          description: p.description,
        });
      };
      add('', p.title, (nth, count) => !ruledBefore(rules.length, nth, count), null);
      rules.forEach((r, i) => {
        const code = `${r.rule.nth === -1 ? 'last' : r.rule.nth}${ICS_DAYS[p.day].toLowerCase()}`;
        add(`-${code}`, r.title, (nth, count) => hits(r.rule.nth, nth, count) && !ruledBefore(i, nth, count), [r.rule.nth]);
      });
    }
  }
  // De lunes a domingo, y por hora: el orden del fichero no depende del config.
  return series.sort(
    (a, b) => (a.weekday + 6) % 7 - (b.weekday + 6) % 7 || compare(a.time, b.time) || compare(a.uid, b.uid),
  );
}

const rruleOf = (s) =>
  s.ordinals
    ? `FREQ=MONTHLY;BYDAY=${s.ordinals.map((o) => `${o}${ICS_DAYS[s.weekday]}`).join(',')}`
    : `FREQ=WEEKLY;BYDAY=${ICS_DAYS[s.weekday]}`;

function seriesHits(s, date) {
  if (date.getUTCDay() !== s.weekday) return false;
  if (!s.ordinals) return true;
  const { nth, count } = weekOfMonth(date);
  return s.ordinals.some((o) => hits(o, nth, count));
}

/* ───────────────────────────── Calendario ────────────────────────────── */

/** Descripción de un evento: la de `CalendarService.buildDescription`, con saltos de línea reales. */
export function describeEvent(ev, texts) {
  const parts = [];
  if (ev.description) parts.push(ev.description);
  if (ev.preacher) parts.push('', `${texts.preacher}: ${ev.preacher}`);
  if (ev.worshipLead) parts.push(`${texts.worship}: ${ev.worshipLead}`);
  if (ev.verse) parts.push('', ev.verse);
  return parts.join('\n').trim();
}

/**
 * El `.ics` completo (CRLF, plegado a 75 octetos).
 *
 * @param {object} input
 * @param {readonly object[]} input.upcomingEvents  `ChurchConfig.upcomingEvents`
 * @param {readonly object[]} input.weeklyProgram   `ChurchConfig.weeklyProgram`
 * @param {{ calendarName: string, calendarDescription: string, place: string, preacher: string, worship: string }} input.texts
 * @param {{ address?: string, mapsQuery?: string }} [input.location]  `ChurchConfig.location`
 * @param {{ events: string, program: string, feed: string }} input.urls  Páginas públicas y el propio feed
 * @param {string} [input.since]  Primer día del programa semanal (`PROGRAM_SINCE`)
 * @param {(message: string) => void} [input.warn]
 */
export function buildEventsCalendar({
  upcomingEvents = [],
  weeklyProgram = [],
  texts,
  location,
  urls,
  since = PROGRAM_SINCE,
  warn = console.warn,
}) {
  const first = parseDay(since, 'PROGRAM_SINCE');
  const place = escapeIcs([texts.place, location?.mapsQuery ?? location?.address].filter(Boolean).join(', '));
  const uids = new Set();
  const uid = (value, what) => {
    if (uids.has(value)) throw new Error(`UID repetido «${value}»: ${what}`);
    uids.add(value);
    return `UID:${value}`;
  };

  const events = upcomingEvents
    .map((ev) => ({ ev, date: parseDay(ev.date, `upcomingEvents «${ev.id}»`), times: timesOf(ev.time) }))
    .sort((a, b) => a.date - b.date || minutesOf(a.times[0]) - minutesOf(b.times[0]) || compare(a.ev.id, b.ev.id));
  // Cada hora con evento: si es la de un culto, el culto no sale ese día.
  const slots = events.flatMap(({ date, times }) => times.map((time) => ({ date, time })));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(texts.calendarName)}`,
    `X-WR-CALDESC:${escapeIcs(texts.calendarDescription)}`,
    `X-WR-TIMEZONE:${TZID}`,
    'X-PUBLISHED-TTL:PT6H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    `SOURCE;VALUE=URI:${urls.feed}`,
    `URL:${urls.events}`,
    ...VTIMEZONE,
  ];

  for (const s of programSeries(weeklyProgram, warn)) {
    const start = Array.from({ length: 400 }, (_, i) => addDays(first, i)).find((d) => seriesHits(s, d));
    if (!start) continue;
    const exdates = slots
      .filter((x) => x.time === s.time && x.date >= start && seriesHits(s, x.date))
      .map((x) => `EXDATE;TZID=${TZID}:${icsLocal(x.date, x.time)}`);
    lines.push(
      'BEGIN:VEVENT',
      uid(s.uid, `weeklyProgram «${s.source}» (dos cultos con el mismo id y hora)`),
      `DTSTAMP:${DTSTAMP}`,
      `DTSTART;TZID=${TZID}:${icsLocal(start, s.time)}`,
      `DTEND;TZID=${TZID}:${icsLocal(start, s.time, DURATION_MIN)}`,
      `RRULE:${rruleOf(s)}`,
      ...new Set(exdates),
      `SUMMARY:${escapeIcs(s.title)}`,
      ...(s.description ? [`DESCRIPTION:${escapeIcs(s.description)}`] : []),
      `LOCATION:${place}`,
      `URL:${urls.program}`,
      'STATUS:CONFIRMED',
      // Informativo: el programa no marca «ocupado» a quien se suscribe.
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  for (const { ev, date, times } of events) {
    const base = `${slug(ev.id)}-${icsDate(date)}`; // = CalendarService.buildUid
    const description = describeEvent(ev, texts);
    const body = [
      `SUMMARY:${escapeIcs(ev.title)}`,
      ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
      `LOCATION:${place}`,
      `URL:${urls.events}#ev-${encodeURIComponent(ev.id)}`, // la tarjeta del evento (`[id]="'ev-' + id"`)
      'STATUS:CONFIRMED',
    ];
    const alarm = (trigger) => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(ev.title)}`,
      `TRIGGER:${trigger}`,
      'END:VALARM',
    ];
    const what = `upcomingEvents «${ev.id}» (dos eventos con el mismo id y fecha)`;
    if (!times.length) {
      // Sin hora todavía: de día completo, no a las 00:00. Cuando se le ponga hora,
      // el mismo UID pasa a tenerla en el calendario de quien se suscribió.
      lines.push(
        'BEGIN:VEVENT',
        uid(`${base}@elim-arganda`, what),
        `DTSTAMP:${DTSTAMP}`,
        `DTSTART;VALUE=DATE:${icsDate(date)}`,
        `DTEND;VALUE=DATE:${icsDate(addDays(date, 1))}`, // exclusivo (RFC 5545 §3.6.1)
        ...body,
        'TRANSP:TRANSPARENT',
        ...alarm('-PT6H'), // la víspera a las 18:00, como `downloadAllDay`
        'END:VEVENT',
      );
      continue;
    }
    times.forEach((time, i) => {
      lines.push(
        'BEGIN:VEVENT',
        uid(`${i === 0 ? base : `${base}-${time.replace(':', '')}`}@elim-arganda`, what),
        `DTSTAMP:${DTSTAMP}`,
        `DTSTART;TZID=${TZID}:${icsLocal(date, time)}`,
        `DTEND;TZID=${TZID}:${icsLocal(date, time, DURATION_MIN)}`,
        ...body,
        'TRANSP:OPAQUE',
        ...alarm('-PT12H'), // como las descargas de `CalendarService`
        'END:VEVENT',
      );
    });
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Textos de `ro.json` (los de `CalendarService`), con su respaldo si falta la clave. */
export function textsFrom(ro) {
  const t = (key, fallback) => key.split('.').reduce((node, part) => node?.[part], ro) || fallback;
  return {
    calendarName: t('calendar.calendar_name', 'Biserica Elim Arganda · Evenimente'),
    calendarDescription: t('calendar.calendar_description', 'Programare și evenimente Biserica Elim Arganda'),
    place: t('calendar.location_default', 'Biserica Elim Arganda del Rey'),
    preacher: t('upcoming.preacher', 'Cuvânt'),
    worship: t('upcoming.worship', 'Închinare'),
  };
}

/** El calendario del repo tal cual: config, rutas y textos de ahora mismo. */
export async function buildRepoCalendar({ warn = console.warn } = {}) {
  const { DEFAULT_CHURCH_CONFIG: config } = loadTsModule(CONFIG_FILE);
  const { blockPath } = loadTsModule(PATHS_FILE);
  const ro = JSON.parse(await readFile(I18N_FILE, 'utf8'));
  const page = (path) => new URL(path.replace(/^\//, ''), config.publicUrl).href;
  return buildEventsCalendar({
    upcomingEvents: config.upcomingEvents,
    weeklyProgram: config.weeklyProgram,
    texts: textsFrom(ro),
    location: config.location,
    urls: { events: page(blockPath('upcoming')), program: page(blockPath('weekly')), feed: page(FEED_PATH) },
    warn,
  });
}

async function main() {
  const ics = await buildRepoCalendar();
  const previous = await readFile(OUT_FILE, 'utf8').catch(() => null);
  if (previous !== ics) {
    await mkdir(dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, ics);
  }
  const series = ics.match(/^RRULE:FREQ=(?:WEEKLY|MONTHLY)/gm)?.length ?? 0;
  const entries = (ics.match(/^BEGIN:VEVENT/gm)?.length ?? 0) - series;
  console.log(
    `✓ src/${FEED_PATH}: ${series} series del programa + ${entries} eventos${previous === ics ? ' (sin cambios)' : ''}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`✗ calendario: ${err.message}`);
    process.exit(1);
  });
}
