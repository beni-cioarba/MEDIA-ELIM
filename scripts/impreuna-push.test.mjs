// Pruebas de scripts/impreuna-push.mjs (sin red): `npm run test:scripts`.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  IDEMPOTENCY_NAMESPACE,
  TTL_S,
  WEB_PUSH_TOPIC,
  buildMessage,
  buildBibleMessage,
  tagIs,
  tagExists,
  tagMissing,
  chooseThumbnail,
  decide,
  findMedia,
  interpolate,
  main,
  parseArgs,
  sendNotification,
  uuidV5,
} from './impreuna-push.mjs';
import { loadTsModule } from './lib/load-ts-module.mjs';

const plan = loadTsModule('src/app/core/impreuna/impreuna-plan.ts');
const copy = (lang) =>
  readFile(new URL(`../src/assets/i18n/impreuna.${lang}.json`, import.meta.url), 'utf8').then((s) => JSON.parse(s).impreuna.push);

const AT = Date.parse('2026-11-13T07:00:00Z'); // 08:00 en Madrid (invierno)
const MIN = 60_000;

test('decide: espera hasta 65 min antes, envía hasta 3 h tarde; fuera de eso, nada', () => {
  assert.equal(decide(AT - 66 * MIN, AT), 'early');
  assert.equal(decide(AT - 55 * MIN, AT), 'wait');
  assert.equal(decide(AT, AT), 'send');
  assert.equal(decide(AT + 25 * MIN, AT), 'send'); // la ejecución de respaldo
  assert.equal(decide(AT + 181 * MIN, AT), 'late');
});

test('los cuatro horarios de la Action cubren verano e invierno con respaldo', () => {
  const summer = Date.parse('2026-07-01T06:00:00Z');
  const winter = Date.parse('2026-11-13T07:00:00Z');
  const run = (target, hh, mm) => decide(Date.parse(new Date(target).toISOString().slice(0, 11) + `${hh}:${mm}:00Z`), target);
  assert.deepEqual([run(summer, '05', '05'), run(summer, '05', '35'), run(summer, '06', '05'), run(summer, '06', '35')], [
    'wait',
    'wait',
    'send',
    'send',
  ]);
  assert.deepEqual([run(winter, '05', '05'), run(winter, '05', '35'), run(winter, '06', '05'), run(winter, '06', '35')], [
    'early',
    'early',
    'wait',
    'wait',
  ]);
});

test('uuidV5: vector de la RFC y claves fijas por día e idioma', () => {
  assert.equal(uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
  const key = uuidV5('impreuna/2026-11-13/ro');
  assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(key, uuidV5('impreuna/2026-11-13/ro', IDEMPOTENCY_NAMESPACE));
  assert.notEqual(key, uuidV5('impreuna/2026-11-13/es'));
  assert.notEqual(key, uuidV5('impreuna/2026-11-14/ro'));
});

test('interpolate: como ngx-translate', () => {
  assert.equal(interpolate('Ziua {{day}} · {{ x }}', { day: 317, x: 'a' }), 'Ziua 317 · a');
});

const base = (lang, c) => ({
  lang,
  copy: c,
  day: 317,
  date: '2026-11-13',
  reading: lang === 'ro' ? 'Iacov 3' : 'Santiago 3',
  readUrl: `https://www.bible.com/bible/${lang === 'ro' ? '191/JAS.3.VDC' : '149/JAS.3.RVR1960'}`,
  site: 'https://elimarganda.com/',
  appId: 'app-id',
  topic: 'impreuna',
});

test('buildMessage: día normal con vídeo, comprimido y con todo a mano', async () => {
  const m = buildMessage({
    ...base('ro', await copy('ro')),
    video: 'IQjsyn26RTY',
    speaker: 'Paul Răducanu',
    image: 'https://i.ytimg.com/vi/IQjsyn26RTY/sddefault.jpg',
  });
  assert.deepEqual(m.headings, { en: 'Ziua 317 · Proiectul Împreună', ro: 'Ziua 317 · Proiectul Împreună' });
  assert.deepEqual(m.contents, { en: '📖 Iacov 3 · ▶ Paul Răducanu', ro: '📖 Iacov 3 · ▶ Paul Răducanu' });
  assert.deepEqual(m.filters, [{ field: 'tag', key: 'impreuna', relation: '=', value: 'ro' }]);
  assert.equal(m.url, 'https://elimarganda.com/impreuna/ziua/317');
  assert.deepEqual(
    m.web_buttons.map((b) => [b.id, b.text, b.url]),
    [
      ['read', '📖 Citește', 'https://www.bible.com/bible/191/JAS.3.VDC'],
      ['video', '▶ Video', 'https://www.youtube.com/watch?v=IQjsyn26RTY'],
    ],
  );
  assert.equal(m.chrome_web_image, 'https://i.ytimg.com/vi/IQjsyn26RTY/sddefault.jpg');
  assert.equal(m.chrome_web_icon, 'https://elimarganda.com/assets/pwa/shortcut-impreuna-192.png');
  assert.equal(m.chrome_web_badge, 'https://elimarganda.com/assets/pwa/badge-impreuna-96.png');
  assert.equal(m.idempotency_key, uuidV5('impreuna/2026-11-13/ro'));
  assert.equal(m.web_push_topic, WEB_PUSH_TOPIC);
  assert.equal(m.ttl, TTL_S);
  assert.equal(m.include_subscription_ids, undefined);
});

test('buildMessage: primer jueves con tema, víspera y sin vídeo (en español)', async () => {
  const c = await copy('es');
  const fast = buildMessage({ ...base('es', c), fasting: true, fastingTheme: 'Pentru familii', video: 'abcdefghijk' });
  assert.equal(fast.headings.es, 'Día 317 · Ayuno y oración');
  assert.equal(fast.contents.es, '📖 Santiago 3 · ▶ Meditación en vídeo\n🙏 Pentru familii');

  const eve = buildMessage({ ...base('es', c), eve: true });
  assert.equal(eve.contents.es, '📖 Santiago 3\n🙏 Mañana: día de ayuno y oración');
  assert.deepEqual(eve.web_buttons.map((b) => b.id), ['read']);
  assert.equal(eve.chrome_web_image, undefined);
  assert.deepEqual(eve.filters, [{ field: 'tag', key: 'impreuna', relation: '=', value: 'es' }]);
});

test('buildMessage: prueba a una suscripción, con clave nueva cada vez', async () => {
  const c = await copy('ro');
  const a = buildMessage({ ...base('ro', c), testSubscription: 'sub-1' });
  const b = buildMessage({ ...base('ro', c), testSubscription: 'sub-1' });
  assert.deepEqual(a.include_subscription_ids, ['sub-1']);
  assert.equal(a.filters, undefined);
  assert.notEqual(a.idempotency_key, b.idempotency_key);
  assert.notEqual(a.idempotency_key, uuidV5('impreuna/2026-11-13/ro'));
});

test('parseArgs: --date y --at sólo en seco; --test pide el id', () => {
  assert.deepEqual(parseArgs(['--dry-run', '--date', '2026-12-03']), {
    dryRun: true,
    now: false,
    test: null,
    date: '2026-12-03',
    at: null,
  });
  assert.throws(() => parseArgs(['--date', '2026-12-03']), /sólo valen con --dry-run/);
  assert.throws(() => parseArgs(['--test']), /Subscription ID/);
  assert.throws(() => parseArgs(['--dry-run', '--date', '3/12/2026']), /AAAA-MM-DD/);
});

/** `fetch` falso: responde por orden lo que se le da. */
function fakeFetch(...responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const { status = 200, body = {}, headers = {} } = next ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name) => headers[name.toLowerCase()] ?? null },
      json: async () => body,
    };
  };
  impl.calls = calls;
  return impl;
}
const noWait = async () => undefined;

test('sendNotification: enviado, repetido (idempotente) o sin suscriptores', async () => {
  const sent = fakeFetch({ body: { id: 'n-1' } });
  assert.deepEqual(await sendNotification({ a: 1 }, 'os_v2_app_x', { fetchImpl: sent }), { status: 'sent', id: 'n-1' });
  assert.equal(sent.calls[0].init.headers.Authorization, 'Key os_v2_app_x');
  assert.equal(sent.calls[0].url, 'https://api.onesignal.com/notifications?c=push');

  const replay = fakeFetch({ body: { id: 'n-1' }, headers: { 'idempotent-replayed': 'true' } });
  assert.equal((await sendNotification({}, 'k', { fetchImpl: replay })).status, 'replayed');

  const nobody = fakeFetch({ body: { id: '', errors: ['All included players are not subscribed'] } });
  assert.deepEqual(await sendNotification({}, 'k', { fetchImpl: nobody }), { status: 'nobody', id: null });
});

test('sendNotification: reintenta 503 / 429 / sin red y falla en seco con 400', async () => {
  const flaky = fakeFetch(new Error('ECONNRESET'), { status: 503 }, { status: 429, headers: { 'retry-after': '2' } }, { body: { id: 'n-2' } });
  const waits = [];
  const result = await sendNotification({}, 'k', { fetchImpl: flaky, wait: async (ms) => waits.push(ms) });
  assert.deepEqual(result, { status: 'sent', id: 'n-2' });
  assert.deepEqual(waits, [2000, 4000, 2000]);

  const bad = fakeFetch({ status: 400, body: { errors: ['Message Notifications must have English language content'] } });
  await assert.rejects(sendNotification({}, 'k', { fetchImpl: bad, wait: noWait }), /HTTP 400/);
});

const SNAPSHOT = { wpCategory: 41, days: Object.assign([], { 316: ['ZZZZZZZZZZZ', 'De la instantánea', null] }) };
const upload = (title, video, publishedAt = '2026-11-12T22:15:00Z') => ({
  snippet: { title, publishedAt, resourceId: { videoId: video } },
});
const media = (fetchImpl) =>
  findMedia({ day: 317, date: '2026-11-13', year: 2026, plan, snapshot: SNAPSHOT, youtubeKey: 'k', fetchImpl, log: () => {} });

test('findMedia: YouTube primero, con el Referer de la web', async () => {
  const f = fakeFetch({ body: { items: [upload('Ziua 317 Paul Răducanu', 'IQjsyn26RTY'), upload('Gala', 'aaaaaaaaaaa')] } });
  assert.deepEqual(await media(f), { video: 'IQjsyn26RTY', speaker: 'Paul Răducanu', source: 'YouTube' });
  assert.equal(f.calls[0].init.headers.Referer, 'https://elimarganda.com/');
});

test('findMedia: si YouTube falla, la web del proyecto; si todo falla, la instantánea o nada', async () => {
  const post = {
    id: 9,
    title: { rendered: 'Ziua 317 &#8211; Ana Pop &#8211; 13 Noiembrie 2026' },
    content: { rendered: '<iframe src="https://www.youtube.com/embed/bbbbbbbbbbb"></iframe>' },
  };
  assert.deepEqual(await media(fakeFetch({ status: 403 }, { body: [post] })), {
    video: 'bbbbbbbbbbb',
    speaker: 'Ana Pop',
    source: 'proiectulimpreuna.ro',
  });
  assert.deepEqual(await media(fakeFetch({ body: { items: [] } }, new Error('caída'))), {
    video: 'ZZZZZZZZZZZ',
    speaker: 'De la instantánea',
    source: 'instantánea del repo',
  });
  const none = await findMedia({
    day: 318,
    date: '2026-11-14',
    year: 2026,
    plan,
    snapshot: { wpCategory: 41, days: [] },
    youtubeKey: '',
    fetchImpl: fakeFetch({ body: [] }),
    log: () => {},
  });
  assert.deepEqual(none, { video: null, speaker: null, source: null });
});

test('chooseThumbnail: sddefault si existe; si no (404), mqdefault', async () => {
  assert.equal(await chooseThumbnail('abcdefghijk', fakeFetch({ status: 200 })), 'https://i.ytimg.com/vi/abcdefghijk/sddefault.jpg');
  assert.equal(await chooseThumbnail('abcdefghijk', fakeFetch({ status: 404 })), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
});

test('main: en seco compone los dos idiomas sin clave; sin clave no envía nada', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'impreuna-push-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const summaryFile = join(dir, 'summary.md');
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch(
    { body: { items: [upload('Ziua 317 Paul Răducanu', 'IQjsyn26RTY')] } },
    { status: 200 }, // HEAD de la miniatura
  );
  const log = console.log;
  const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try {
    const code = await main(['--dry-run', '--date', '2026-11-13', '--at', '2026-11-13T06:05:00Z'], {
      GITHUB_STEP_SUMMARY: summaryFile,
    });
    assert.equal(code, 0);
    const out = lines.join('\n');
    assert.match(out, /la Action: wait/);
    assert.match(out, /\[ro\] Ziua 317 · Proiectul Împreună — 📖 Iacov 3 · ▶ Paul Răducanu/);
    assert.match(out, /\[es\] Día 317 · Proiectul Împreună — 📖 Santiago 3 · ▶ Paul Răducanu/);
    assert.match(await readFile(summaryFile, "utf8"), /2026-11-13 · Proiectul Împreună ziua 317/);

    // Envío real sin ONESIGNAL_API_KEY: aviso y salida limpia, sin red.
    globalThis.fetch = fakeFetch();
    assert.equal(await main(['--now'], {}), 0);
    assert.equal(globalThis.fetch.calls.length, 0);
  } finally {
    console.log = log;
    globalThis.fetch = realFetch;
  }
});

test('buildBibleMessage: Citirea Bibliei sola, con leer y escuchar y su propia clave', () => {
  const m = buildBibleMessage({
    lang: 'ro',
    copy: { title: 'Citirea Bibliei · ziua {{day}} din {{days}}', read: 'Citește', listen: 'Ascultă' },
    date: '2026-11-13',
    church: { passage: 'Ezechiel 40–41', week: 98, summary: 'Ezechiel 32–45', day: 5, days: 7 },
    detail: '75 de versete · ≈ 14 min',
    readUrl: 'https://www.bible.com/bible/191/EZK.40.VDC',
    audioUrl: 'https://www.bible.com/audio-bible/191/EZK.40.VDC',
    site: 'https://elimarganda.com/',
    appId: 'app-id',
    filters: [tagIs('biblia', 'ro'), tagMissing('impreuna')],
  });
  assert.equal(m.headings.ro, 'Citirea Bibliei · ziua 5 din 7');
  assert.equal(m.contents.ro, '📖 Ezechiel 40–41 · 75 de versete · ≈ 14 min');
  assert.equal(m.url, 'https://elimarganda.com/media/citirea-bibliei');
  assert.deepEqual(m.web_buttons.map((b) => b.id), ['read', 'listen']);
  assert.equal(m.idempotency_key, uuidV5('biblia/2026-11-13/ro'));
  assert.deepEqual(m.filters, [
    { field: 'tag', key: 'biblia', relation: '=', value: 'ro' },
    { field: 'tag', key: 'impreuna', relation: 'not_exists' },
  ]);
});

test('buildMessage: con los dos temas, un solo aviso con la línea del plan', async () => {
  const m = buildMessage({
    ...base('ro', await copy('ro')),
    extraLine: '📘 Citirea Bibliei: Ezechiel 40–41',
    filters: [tagIs('impreuna', 'ro'), tagExists('biblia')],
    idempotencyName: 'impreuna+biblia/2026-11-13/ro',
  });
  assert.equal(m.contents.ro, '📖 Iacov 3\n📘 Citirea Bibliei: Ezechiel 40–41');
  assert.equal(m.idempotency_key, uuidV5('impreuna+biblia/2026-11-13/ro'));
  assert.deepEqual(m.filters[1], { field: 'tag', key: 'biblia', relation: 'exists' });
});

test('main: tres audiencias que no se solapan (sólo Împreună · las dos · sólo Biblia)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch({ body: { items: [] } }, { body: [] });
  const log = console.log;
  const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try {
    assert.equal(await main(['--dry-run', '--date', '2026-11-13', '--at', '2026-11-13T06:05:00Z'], {}), 0);
    const out = lines.join('\n');
    assert.equal(out.match(/^\[ro\] /gm)?.length, 3);
    assert.match(out, /\[ro\] Ziua 317 · Proiectul Împreună — 📖 Iacov 3.* \/ 📘 Citirea Bibliei: Ezechiel 40–41/);
    assert.match(out, /\[ro\] Citirea Bibliei · ziua 5 din 7 — 📖 Ezechiel 40–41 · 75 de versete · ≈ 14 min/);
    assert.match(out, /\[es\] Lectura bíblica · día 5 de 7 — 📖 Ezechiel 40–41 · 75 versículos/);
  } finally {
    console.log = log;
    globalThis.fetch = realFetch;
  }
});

