// Pruebas de scripts/generate-events-calendar.mjs (sin red): `npm run test:scripts`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './lib/load-ts-module.mjs';
import {
  FEED_PATH,
  buildEventsCalendar,
  buildRepoCalendar,
  escapeIcs,
  foldLine,
  ordinalsFor,
  programSeries,
  slug,
  timesOf,
} from './generate-events-calendar.mjs';

const TEXTS = {
  calendarName: 'Biserica Elim Arganda · Evenimente',
  calendarDescription: 'Programare și evenimente Biserica Elim Arganda',
  place: 'Biserica Elim Arganda del Rey',
  preacher: 'Cuvânt',
  worship: 'Închinare',
};
const URLS = {
  events: 'https://elimarganda.com/media/evenimente',
  program: 'https://elimarganda.com/media/program',
  feed: `https://elimarganda.com/${FEED_PATH}`,
};
const LOCATION = { mapsQuery: 'Av. de Madrid, 30, 28500 Arganda del Rey, Madrid' };
const SINCE = '2026-09-01'; // martes

const build = (input) =>
  buildEventsCalendar({ texts: TEXTS, urls: URLS, location: LOCATION, since: SINCE, warn: () => {}, ...input });

const event = (over) => ({
  id: 'botez_2026_11_22',
  date: '2026-11-22',
  time: '10:00',
  title: 'Botez nou-testamental',
  description: '',
  verse: '',
  preacher: '',
  worshipLead: '',
  ...over,
});

/** El domingo del config: dos horas y el primer domingo con otro nombre. */
const SUNDAY = {
  id: 'duminica',
  day: 0,
  dayLabel: 'Duminică',
  time: '10:00 & 18:00',
  title: 'Închinare și învățătură',
  description: '',
  monthly: [
    { rule: { weekday: 0, nth: 1 }, time: '10:00', title: 'Cina Domnului' },
    { rule: { weekday: 0, nth: 1 }, time: '18:00', title: 'Seară de tineret', departments: ['youth'] },
  ],
};

/** Líneas desplegadas (RFC 5545 §3.1). */
const unfold = (ics) => ics.replace(/\r\n /g, '').split('\r\n');

/** Cada VEVENT como { PROPIEDAD: línea entera }; `EXDATE` en lista y el `TRIGGER` de su alarma. */
function vevents(ics) {
  const out = [];
  let current = null;
  let depth = 0;
  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') current = { EXDATE: [] };
    else if (line === 'END:VEVENT') out.push(current), (current = null);
    else if (!current) continue;
    else if (line.startsWith('BEGIN:')) depth++;
    else if (line.startsWith('END:')) depth--;
    else if (depth) {
      if (line.startsWith('TRIGGER:')) current.TRIGGER = line.slice('TRIGGER:'.length);
    } else {
      const name = line.match(/^[A-Z-]+/)[0];
      if (name === 'EXDATE') current.EXDATE.push(line);
      else current[name] = line;
    }
  }
  return out;
}
const byUid = (ics, uid) => vevents(ics).find((e) => e.UID === `UID:${uid}`);

/* ─────────────────────────────── Formato ─────────────────────────────── */

test('foldLine: ≤ 75 octetos por línea, sin partir caracteres, y se despliega igual', () => {
  const line = `SUMMARY:${'Rugăciune și stăruință după Duhul Sfânt 🙏 · '.repeat(5)}`;
  const folded = foldLine(line);
  for (const part of folded.split('\r\n')) assert.ok(Buffer.byteLength(part) <= 75, part);
  assert.doesNotMatch(folded, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  assert.equal(folded.replace(/\r\n /g, ''), line);
  assert.equal(foldLine('VERSION:2.0'), 'VERSION:2.0');
});

test('escapeIcs: barra, punto y coma, coma y saltos de línea', () => {
  assert.equal(escapeIcs('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');
});

test('slug y timesOf: los de CalendarService y ScheduleService', () => {
  assert.equal(slug('evanghelizare_apc_2026_11_08'), 'evanghelizare-apc-2026-11-08');
  assert.deepEqual(timesOf('10:00 & 18:00'), ['10:00', '18:00']);
  assert.deepEqual(timesOf('9:30'), ['09:30']);
  assert.deepEqual(timesOf('10:00 & 10:00'), ['10:00']);
  assert.deepEqual(timesOf(''), []);
  assert.deepEqual(timesOf('Sâmbătă seara'), []);
});

/* ─────────────────────────────── Eventos ─────────────────────────────── */

test('evento con hora: en hora de Madrid, 2 h, UID de las descargas, alarma 12 h antes', () => {
  const ics = build({
    upcomingEvents: [event({ description: 'Mesaj: "De ce?"', preacher: 'Ioan Szaz', verse: 'Fapte 2:38' })],
  });
  const e = byUid(ics, 'botez-2026-11-22-20261122@elim-arganda');
  assert.ok(e, 'el UID es el de CalendarService.buildUid');
  assert.equal(e.DTSTART, 'DTSTART;TZID=Europe/Madrid:20261122T100000');
  assert.equal(e.DTEND, 'DTEND;TZID=Europe/Madrid:20261122T120000');
  assert.equal(e.DESCRIPTION, 'DESCRIPTION:Mesaj: "De ce?"\\n\\nCuvânt: Ioan Szaz\\n\\nFapte 2:38');
  assert.equal(e.LOCATION, 'LOCATION:Biserica Elim Arganda del Rey\\, Av. de Madrid\\, 30\\, 28500 Arganda del Rey\\, Madrid');
  assert.equal(e.URL, 'URL:https://elimarganda.com/media/evenimente#ev-botez_2026_11_22');
  assert.equal(e.TRANSP, 'TRANSP:OPAQUE');
  assert.equal(e.TRIGGER, '-PT12H');
});

test('evento con dos horas: dos entradas; la primera conserva el UID', () => {
  const ics = build({ upcomingEvents: [event({ id: 'evanghelizare_2026_09_27', date: '2026-09-27', time: '10:00 & 18:00' })] });
  const [morning, evening] = vevents(ics);
  assert.equal(morning.UID, 'UID:evanghelizare-2026-09-27-20260927@elim-arganda');
  assert.equal(morning.DTSTART, 'DTSTART;TZID=Europe/Madrid:20260927T100000');
  assert.equal(evening.UID, 'UID:evanghelizare-2026-09-27-20260927-1800@elim-arganda');
  assert.equal(evening.DTSTART, 'DTSTART;TZID=Europe/Madrid:20260927T180000');
});

test('evento sin hora: de día completo (no a las 00:00), libre, aviso la víspera', () => {
  const ics = build({ upcomingEvents: [event({ id: 'fanfara_castellon_2026_11_29', date: '2026-11-29', time: '' })] });
  const [e] = vevents(ics);
  assert.equal(e.DTSTART, 'DTSTART;VALUE=DATE:20261129');
  assert.equal(e.DTEND, 'DTEND;VALUE=DATE:20261130');
  assert.equal(e.TRANSP, 'TRANSP:TRANSPARENT');
  assert.equal(e.TRIGGER, '-PT6H');
});

test('un evento tarde acaba al día siguiente; sin descripción no hay DESCRIPTION', () => {
  const [e] = vevents(build({ upcomingEvents: [event({ date: '2026-12-31', time: '23:30' })] }));
  assert.equal(e.DTEND, 'DTEND;TZID=Europe/Madrid:20270101T013000');
  assert.equal(e.DESCRIPTION, undefined);
});

test('fecha mal escrita o id repetido en la misma fecha: falla diciendo cuál', () => {
  assert.throws(() => build({ upcomingEvents: [event({ id: 'x', date: '2026-02-31' })] }), /«x».*2026-02-31/);
  assert.throws(() => build({ upcomingEvents: [event(), event()] }), /UID repetido.*botez_2026_11_22/);
});

/* ─────────────────────────── Programa semanal ─────────────────────────── */

test('culto semanal: RRULE semanal desde su primera vez, informativo (no ocupa)', () => {
  const ics = build({
    weeklyProgram: [{ id: 'luni', day: 1, dayLabel: 'Luni', time: '20:30', title: 'Rugăciune', description: '' }],
  });
  const s = byUid(ics, 'program-luni-2030-recurring@elim-arganda');
  assert.equal(s.DTSTART, 'DTSTART;TZID=Europe/Madrid:20260907T203000'); // primer lunes desde el martes 1
  assert.equal(s.DTEND, 'DTEND;TZID=Europe/Madrid:20260907T223000');
  assert.equal(s.RRULE, 'RRULE:FREQ=WEEKLY;BYDAY=MO');
  assert.equal(s.URL, 'URL:https://elimarganda.com/media/program');
  assert.equal(s.TRANSP, 'TRANSP:TRANSPARENT');
  assert.equal(s.TRIGGER, undefined, 'el programa no avisa: serían siete alarmas por semana');
});

test('domingo: una serie por hora, y el primer domingo con su propio nombre', () => {
  const ics = build({ weeklyProgram: [SUNDAY] });
  const base = byUid(ics, 'program-duminica-1000-recurring@elim-arganda');
  assert.equal(base.RRULE, 'RRULE:FREQ=MONTHLY;BYDAY=2SU,3SU,4SU,5SU');
  assert.equal(base.DTSTART, 'DTSTART;TZID=Europe/Madrid:20260913T100000');
  assert.equal(base.SUMMARY, 'SUMMARY:Închinare și învățătură');
  const cina = byUid(ics, 'program-duminica-1000-1su-recurring@elim-arganda');
  assert.equal(cina.RRULE, 'RRULE:FREQ=MONTHLY;BYDAY=1SU');
  assert.equal(cina.DTSTART, 'DTSTART;TZID=Europe/Madrid:20260906T100000');
  assert.equal(cina.SUMMARY, 'SUMMARY:Cina Domnului');
  assert.equal(byUid(ics, 'program-duminica-1800-1su-recurring@elim-arganda').SUMMARY, 'SUMMARY:Seară de tineret');
  assert.equal(vevents(ics).length, 4);
});

test('un evento a la hora de un culto lo sustituye ese día (EXDATE), sólo a esa hora', () => {
  const ics = build({
    weeklyProgram: [SUNDAY],
    upcomingEvents: [
      event(), // domingo 22/11, 10:00
      event({ id: 'tineret_2026_12_06', date: '2026-12-06', time: '18:00' }), // primer domingo, 18:00
      event({ id: 'sin_hora', date: '2026-11-29', time: '' }), // sin hora: no quita nada
    ],
  });
  assert.deepEqual(byUid(ics, 'program-duminica-1000-recurring@elim-arganda').EXDATE, [
    'EXDATE;TZID=Europe/Madrid:20261122T100000',
  ]);
  assert.deepEqual(byUid(ics, 'program-duminica-1800-recurring@elim-arganda').EXDATE, []);
  assert.deepEqual(byUid(ics, 'program-duminica-1800-1su-recurring@elim-arganda').EXDATE, [
    'EXDATE;TZID=Europe/Madrid:20261206T180000',
  ]);
});

test('ordinalsFor: el conjunto BYDAY exacto (meses de 4 y de 5 domingos)', () => {
  assert.deepEqual(ordinalsFor((nth) => nth !== 1), [2, 3, 4, 5]);
  assert.deepEqual(ordinalsFor((nth) => nth === 1), [1]);
  assert.deepEqual(ordinalsFor((nth, count) => nth === count), [-1]);
  assert.deepEqual(ordinalsFor((nth, count) => nth !== count), [1, 2, 3, -2]);
  // «el último, salvo si ya es el 4.º» (otra regla del 4.º manda): sólo hay 5.º.
  assert.deepEqual(ordinalsFor((nth, count) => nth === count && nth !== 4), [5]);
  // Ni el 3.º ni el último: el 4.º sólo cuando hay 5 → no cabe en BYDAY.
  assert.equal(ordinalsFor((nth, count) => nth !== 3 && nth !== count), null);
});

test('reglas que no caben en una RRULE: avisa y sale de más, nunca de menos', () => {
  const warnings = [];
  const series = programSeries(
    [
      {
        ...SUNDAY,
        time: '10:00',
        monthly: [
          { rule: { weekday: 0, nth: 3 }, time: '10:00', title: 'Misiune' },
          { rule: { weekday: 0, nth: -1 }, time: '10:00', title: 'Tineret' },
        ],
      },
    ],
    (message) => warnings.push(message),
  );
  const base = series.find((s) => s.uid === 'program-duminica-1000-recurring@elim-arganda');
  assert.equal(base.ordinals, null, 'la normal sale semanal');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /duminica.*no caben/);
});

test('una regla mensual de otro día u otra hora no renombra nada', () => {
  const series = programSeries([
    { ...SUNDAY, time: '10:00', monthly: [{ rule: { weekday: 6, nth: 1 }, time: '10:00', title: 'X' }, { rule: { weekday: 0, nth: 1 }, time: '12:00', title: 'Y' }] },
  ]);
  assert.deepEqual(series.map((s) => [s.uid, s.ordinals]), [['program-duminica-1000-recurring@elim-arganda', null]]);
});

/* ─────────────────────────────── Fichero ─────────────────────────────── */

test('cabecera de suscripción, huso de Madrid, CRLF y líneas ≤ 75 octetos', () => {
  const ics = build({ weeklyProgram: [SUNDAY], upcomingEvents: [event({ verse: 'Semănați potrivit cu neprihănirea, și veți secera potrivit cu îndurarea. '.repeat(3) })] });
  const lines = unfold(ics);
  for (const header of [
    'BEGIN:VCALENDAR',
    'PRODID:-//Biserica Elim Arganda//Eventos//RO',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Biserica Elim Arganda · Evenimente',
    'X-WR-TIMEZONE:Europe/Madrid',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    `SOURCE;VALUE=URI:${URLS.feed}`,
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
  ]) {
    assert.ok(lines.includes(header), header);
  }
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.doesNotMatch(ics.replace(/\r\n/g, ''), /[\r\n]/, 'sólo CRLF');
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
});

test('determinista: el mismo config da el mismo fichero', () => {
  const input = { weeklyProgram: [SUNDAY], upcomingEvents: [event(), event({ id: 'otro', time: '' })] };
  assert.equal(build(input), build(input));
  assert.equal(build(input), build({ ...input, upcomingEvents: [...input.upcomingEvents].reverse() }));
});

/* ──────────────────────────── Datos del repo ──────────────────────────── */

test('church.config.ts de verdad: genera, UID únicos y todos los eventos dentro', async (t) => {
  // Un aviso (p. ej. un culto sin hora) se cuenta en la salida, pero no para el deploy.
  const ics = await buildRepoCalendar({ warn: (m) => t.diagnostic(m) });
  const uids = vevents(ics).map((e) => e.UID);
  assert.equal(new Set(uids).size, uids.length);
  const { DEFAULT_CHURCH_CONFIG: config } = loadTsModule(
    fileURLToPath(new URL('../src/app/core/church.config.ts', import.meta.url)),
  );
  for (const ev of config.upcomingEvents) {
    assert.ok(uids.includes(`UID:${slug(ev.id)}-${ev.date.replace(/-/g, '')}@elim-arganda`), ev.id);
  }
  assert.ok(uids.some((u) => u.startsWith('UID:program-')), 'lleva el programa semanal');
});

test('la URL del fichero es la que abre el botón (CalendarService.webcalUrlForAll)', async () => {
  const service = await readFile(new URL('../src/app/core/services/calendar.service.ts', import.meta.url), 'utf8');
  const [dir, file] = [FEED_PATH.slice(0, FEED_PATH.lastIndexOf('/') + 1), FEED_PATH.slice(FEED_PATH.lastIndexOf('/') + 1)];
  assert.ok(service.includes(`buildWebcalUrl('${file}')`), `webcalUrlForAll pide ${file}`);
  assert.ok(service.includes(`${dir}\${filename}`), `buildWebcalUrl sirve desde ${dir}`);
});
