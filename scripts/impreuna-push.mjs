#!/usr/bin/env node
/**
 * Proiectul Împreună — **amintire zilnică**: la notificación web push de las
 * 08:00 (hora de España) con el texto del día, la meditación en vídeo y el
 * ayuno del primer jueves. La manda OneSignal a quien activó el interruptor
 * de /impreuna. docs/ai/32-impreuna.md → Notificaciones.
 *
 *   node scripts/impreuna-push.mjs                 Envío del día (GitHub Action): si se lanza
 *                                                  antes de las 08:00, espera a la hora exacta
 *   node scripts/impreuna-push.mjs --dry-run       Compone el de hoy y lo enseña; no envía
 *   node scripts/impreuna-push.mjs --dry-run --date 2026-12-03 [--at 2026-12-03T06:10:00Z]
 *   node scripts/impreuna-push.mjs --now           Envía ya el de hoy (recuperar un fallo); nunca duplica
 *   node scripts/impreuna-push.mjs --test <id>     Sólo a una suscripción (OneSignal → Audience →
 *                                                  Subscriptions): probarlo en tu teléfono
 *
 * Entorno: `ONESIGNAL_API_KEY` (App API key, secreto de GitHub; sin ella no
 * envía nada) y, opcional, `YOUTUBE_API_KEY` (si no, la de church.config.ts).
 *
 * ── Por qué así ──────────────────────────────────────────────────────────
 *  · **Se envía en el momento, no se programa**: no consta que el plan
 *    gratuito de OneSignal incluya `send_after` ni la entrega por zona horaria
 *    («Time Delayed Sends» sale sin incluir en su tabla de precios). La Action
 *    arranca antes de las 08:00 y este script espera hasta la hora exacta.
 *  · **Nunca duplica**: cada día e idioma lleva una clave de idempotencia fija
 *    (UUID v5 de «impreuna/<fecha>/<idioma>»); si dos ejecuciones envían el
 *    mismo día, OneSignal devuelve el primero y no manda otro.
 *  · **Una sola fuente de verdad**: lecturas, ayunos, fechas y textos salen de
 *    la app (TypeScript cargado con `lib/load-ts-module.mjs`) y de sus packs
 *    de traducción (`impreuna.push.*`).
 *  · **El vídeo del día** sale de YouTube (lo suben a las 22:15 UTC de la
 *    víspera); si no, de la web del proyecto o de la instantánea del repo. Sin
 *    vídeo el aviso sale igual, con la lectura.
 */
import { randomUUID, createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTsModule } from './lib/load-ts-module.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (path) => resolve(ROOT, 'src', path);

/** Crear un mensaje (API REST de OneSignal). */
export const ONESIGNAL_API = 'https://api.onesignal.com/notifications?c=push';
/** Espacio de nombres de las claves de idempotencia (UUID v5). Fijo: no cambiar. */
export const IDEMPOTENCY_NAMESPACE = '5d4f2a7e-3c1b-4e8a-9f60-1b2c3d4e5f60';
/** Se espera como mucho esto a las 08:00; antes, la ejecución sale (otra la cubrirá). */
export const MAX_WAIT_MS = 65 * 60_000;
/** Pasadas las 08:00, aún se envía durante este margen (Action retrasada); después, no. */
export const LATE_MS = 3 * 3_600_000;
/** Si el teléfono está apagado, el aviso le llega hasta las 22:00; después ya no tiene sentido. */
export const TTL_S = 14 * 3_600;
/** Etiqueta del aviso en el navegador: el de hoy sustituye al de ayer si sigue ahí. */
export const WEB_PUSH_TOPIC = 'impreuna-zilnic';
const LANGS = /** @type {const} */ (['ro', 'es']);
const YT_UPLOADS = 'UUqKwJYXPbht3Oh0riWfT1bg';
const YT_REFERER = 'https://elimarganda.com/';
const WP_API = 'https://proiectulimpreuna.ro/wp-json/wp/v2/posts';
const FETCH_TIMEOUT_MS = 10_000;

// ── Piezas puras (pruebas: impreuna-push.test.mjs) ─────────────────────────

/**
 * Qué hacer según la hora: `early` (falta más de MAX_WAIT_MS: otra ejecución
 * lo hará), `wait` (esperar a la hora), `send` (ya es la hora, o se llega
 * tarde pero dentro del margen) o `late` (demasiado tarde: no se envía).
 */
export function decide(now, at, { maxWaitMs = MAX_WAIT_MS, lateMs = LATE_MS } = {}) {
  if (now < at - maxWaitMs) return 'early';
  if (now < at) return 'wait';
  if (now <= at + lateMs) return 'send';
  return 'late';
}

/** UUID v5 (RFC 9562): el mismo nombre da siempre la misma clave. */
export function uuidV5(name, namespace = IDEMPOTENCY_NAMESPACE) {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** `{{clave}}` → valor (el mismo formato que ngx-translate). */
export const interpolate = (text, params) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(params[key] ?? ''));

/**
 * El aviso de un día en un idioma, listo para la API de OneSignal.
 *
 * Diseño (comprimido, lo importante arriba): título = día + proyecto (o «Post
 * și rugăciune» el primer jueves); primera línea = lectura y ponente del vídeo
 * (Android con imagen sólo enseña esa línea); después el tema del ayuno y el
 * aviso de la víspera. Imagen = miniatura del vídeo; botones (Chrome/Edge):
 * leer en la Biblia y ver el vídeo; tocarlo abre la página del día.
 */
export function buildMessage({
  lang,
  copy,
  day,
  date,
  reading,
  readUrl,
  video = null,
  speaker = null,
  fasting = false,
  fastingTheme = null,
  eve = false,
  image = null,
  site,
  appId,
  topic,
  testSubscription = null,
}) {
  const title = interpolate(fasting ? copy.title_fast : copy.title, { day });
  const lines = [[`📖 ${reading}`, video ? `▶ ${speaker ?? copy.video}` : null].filter(Boolean).join(' · ')];
  if (fasting && fastingTheme) lines.push(`🙏 ${fastingTheme}`);
  if (eve) lines.push(`🙏 ${copy.eve}`);
  const body = lines.join('\n');
  const icon = new URL('assets/pwa/shortcut-impreuna-192.png', site).href;
  const buttons = [{ id: 'read', text: `📖 ${copy.read}`, url: readUrl }];
  if (video) buttons.push({ id: 'video', text: `▶ ${copy.watch}`, url: `https://www.youtube.com/watch?v=${video}` });

  return {
    app_id: appId,
    name: `Împreună · ${date} · ziua ${day} · ${lang}${testSubscription ? ' · prueba' : ''}`,
    // Prueba: clave nueva cada vez (no puede bloquear el envío real del día).
    idempotency_key: testSubscription ? randomUUID() : uuidV5(`impreuna/${date}/${lang}`),
    ...(testSubscription
      ? { include_subscription_ids: [testSubscription] }
      : { filters: [{ field: 'tag', key: topic, relation: '=', value: lang }] }),
    headings: { en: title, [lang]: title },
    contents: { en: body, [lang]: body },
    url: new URL(`impreuna/ziua/${day}`, site).href,
    web_buttons: buttons,
    chrome_web_icon: icon,
    firefox_icon: icon,
    chrome_web_badge: new URL('assets/pwa/badge-impreuna-96.png', site).href,
    ...(image ? { chrome_web_image: image } : {}),
    web_push_topic: WEB_PUSH_TOPIC,
    ttl: TTL_S,
    priority: 10,
  };
}

/** Argumentos de la línea de órdenes. */
export function parseArgs(argv) {
  const value = (flag) => {
    const at = argv.indexOf(flag);
    return at >= 0 && argv[at + 1] && !argv[at + 1].startsWith('--') ? argv[at + 1] : null;
  };
  const args = {
    dryRun: argv.includes('--dry-run'),
    now: argv.includes('--now'),
    test: argv.includes('--test') ? value('--test') ?? '' : null,
    date: value('--date'),
    at: value('--at'),
  };
  if (args.test === '') throw new Error('--test necesita el Subscription ID de OneSignal');
  if ((args.date || args.at) && !args.dryRun) throw new Error('--date y --at sólo valen con --dry-run');
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error(`--date ${args.date}: formato AAAA-MM-DD`);
  if (args.at && Number.isNaN(Date.parse(args.at))) throw new Error(`--at ${args.at}: no es una fecha ISO`);
  return args;
}

// ── Red ────────────────────────────────────────────────────────────────────

const getJson = async (url, headers = {}, fetchImpl = fetch) => {
  const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`);
  return res.json();
};

/**
 * El vídeo y el ponente del día: YouTube (fuente principal), la web del
 * proyecto o la instantánea del repo, en ese orden. Nunca lanza.
 */
export async function findMedia({ day, date, year, plan, snapshot, youtubeKey, fetchImpl = fetch, log = console.log }) {
  if (youtubeKey) {
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${YT_UPLOADS}` +
        `&fields=items(snippet(publishedAt,title,resourceId/videoId))&key=${encodeURIComponent(youtubeKey)}`;
      const json = await getJson(url, { Referer: YT_REFERER }, fetchImpl);
      const hit = (json.items ?? []).map((item) => plan.parseYoutubeUpload(item, year)).find((up) => up?.day === day);
      if (hit?.video) return { video: hit.video, speaker: hit.speaker, source: 'YouTube' };
    } catch (err) {
      log(`YouTube no disponible (${err.message}).`);
    }
  }
  try {
    const after = new Date(Date.parse(`${date}T00:00:00Z`) - 3 * 86_400_000).toISOString().slice(0, 19);
    const url =
      `${WP_API}?categories=${snapshot.wpCategory}&after=${after}&per_page=10&orderby=date&order=desc` +
      '&_fields=id,title,content';
    const posts = await getJson(url, {}, fetchImpl);
    const hit = posts.map((post) => plan.parseWpPost(post)).find((p) => p?.day === day && p.video);
    if (hit) return { video: hit.video, speaker: hit.speaker, source: 'proiectulimpreuna.ro' };
  } catch (err) {
    log(`La web del proyecto no responde (${err.message}).`);
  }
  const row = snapshot.days?.[day - 1];
  if (row?.[0]) return { video: row[0], speaker: row[1] ?? null, source: 'instantánea del repo' };
  return { video: null, speaker: null, source: null };
}

/**
 * Miniatura para la imagen grande del aviso: `sddefault` (640 × 480; sus
 * franjas negras caen fuera del recorte 2:1 de Android y Windows) o, si no
 * existe, `mqdefault` (siempre). El 404 de YouTube trae una imagen gris: se
 * mira el estado HTTP, no el cuerpo. Este canal no tiene `maxresdefault`.
 */
export async function chooseThumbnail(video, fetchImpl = fetch) {
  const sd = `https://i.ytimg.com/vi/${video}/sddefault.jpg`;
  try {
    const res = await fetchImpl(sd, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) return sd;
  } catch {
    // sin red: la de siempre
  }
  return `https://i.ytimg.com/vi/${video}/mqdefault.jpg`;
}

/**
 * Crea el mensaje en OneSignal. Reintenta (4 veces, con espera creciente o la
 * que pida `Retry-After`) si no responde, con 429 o con 5xx; la clave de
 * idempotencia hace seguros los reintentos.
 */
export async function sendNotification(payload, apiKey, { fetchImpl = fetch, wait = sleep, attempts = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(ONESIGNAL_API, {
        method: 'POST',
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      if (attempt >= attempts) throw new Error(`OneSignal no responde: ${err.message}`);
      await wait(2_000 * 2 ** (attempt - 1));
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const replayed = res.headers.get('idempotent-replayed') === 'true';
      if (body.id) return { status: replayed ? 'replayed' : 'sent', id: body.id };
      const errors = [].concat(body.errors ?? []).join('; ');
      // HTTP 200 sin id: nadie con la etiqueta (aún nadie lo ha activado en ese idioma).
      if (/not subscribed/i.test(errors)) return { status: replayed ? 'replayed' : 'nobody', id: null };
      throw new Error(`OneSignal no creó el aviso: ${errors || JSON.stringify(body)}`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 2_000 * 2 ** (attempt - 1));
      continue;
    }
    throw new Error(`OneSignal HTTP ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  }
}

// ── Orquestación ──────────────────────────────────────────────────────────

const hhmm = (ms, timeZone) =>
  new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ms);

/** Resumen en la página de la ejecución de GitHub (si existe). */
async function summary(env, markdown) {
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

const notice = (message) => console.log(process.env.GITHUB_ACTIONS ? `::notice::${message}` : message);

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const { IMPREUNA_REMINDER: reminder, IMPREUNA_FASTING_THEMES } = loadTsModule(src('app/core/impreuna/impreuna.config.ts'));
  const { IMPREUNA_EDITION: edition, planDay } = loadTsModule(src('app/core/impreuna/impreuna-edition.ts'));
  const plan = loadTsModule(src('app/core/impreuna/impreuna-plan.ts'));
  const { zonedDate, zonedInstant, dayOfYear } = loadTsModule(src('app/core/push/push-schedule.ts'));
  const { DEFAULT_CHURCH_CONFIG: config } = loadTsModule(src('app/core/church.config.ts'));
  const { timeZone, hour, topic } = reminder;

  const now = args.at ? Date.parse(args.at) : Date.now();
  const date = args.date ?? zonedDate(now, timeZone);
  const at = zonedInstant(date, hour, timeZone);
  const day = Number(date.slice(0, 4)) === edition.year ? dayOfYear(date) : 0;
  const entry = planDay(day);
  const when = `${date} · ${String(hour).padStart(2, '0')}:00 en ${timeZone} = ${new Date(at).toISOString()}`;

  if (!entry) {
    notice(`${date}: fuera de la edición ${edition.year}; no hay aviso.`);
    return 0;
  }
  // En seco, `--now` y `--test` no esperan; aun así se dice qué haría la Action a esa hora.
  const scheduled = decide(now, at);
  const decision = args.dryRun || args.now || args.test ? 'send' : scheduled;
  console.log(
    `Día ${day} (${when}). Ahora ${new Date(now).toISOString()} → ${args.dryRun ? `en seco (la Action: ${scheduled})` : decision}.`,
  );
  if (decision === 'early' || decision === 'late') {
    notice(
      decision === 'early'
        ? `Aún falta más de ${MAX_WAIT_MS / 60_000} min para las ${hour}:00 de España: lo enviará la ejecución siguiente.`
        : `Pasadas las ${hour}:00 de España en más de ${LATE_MS / 3_600_000} h: el aviso de hoy ya no se envía.`,
    );
    await summary(env, `### Proiectul Împreună · ${date}\n\n${decision === 'early' ? 'Demasiado pronto' : 'Demasiado tarde'}: sin envío.`);
    return 0;
  }

  const apiKey = env.ONESIGNAL_API_KEY ?? '';
  if (!args.dryRun && (!apiKey || !config.oneSignalAppId)) {
    const missing = [
      !config.oneSignalAppId && 'el App ID (church.config.ts → oneSignalAppId)',
      !apiKey && 'el secreto ONESIGNAL_API_KEY',
    ]
      .filter(Boolean)
      .join(' y ');
    notice(`Amintire desactivada: falta ${missing}. No se envía nada.`);
    await summary(env, `### Proiectul Împreună · ${date}\n\nDesactivado: falta ${missing}.`);
    return 0;
  }

  // Contenido antes de esperar: si la red tarda, no retrasa las 08:00.
  const snapshot = JSON.parse(await readFile(src(`app/core/impreuna/data/${edition.year}.media.json`), 'utf8'));
  const lookup = () =>
    findMedia({ day, date, year: edition.year, plan, snapshot, youtubeKey: env.YOUTUBE_API_KEY || config.youtubeApiKey });
  let media = await lookup();
  if (decision === 'wait') {
    const ms = Math.max(0, at - Date.now());
    console.log(`Esperando ${Math.round(ms / 60_000)} min, hasta las ${hhmm(at, timeZone)} de España…`);
    await sleep(ms);
    if (!media.video) media = await lookup(); // por si lo han subido tarde
  }
  const image = media.video ? await chooseThumbnail(media.video) : null;

  const fasting = plan.isFastingDay(edition.year, day);
  const eve = day < edition.total && plan.isFastingDay(edition.year, day + 1);
  const fastingTheme = IMPREUNA_FASTING_THEMES.find((t) => t.date === date)?.theme ?? null;
  const messages = [];
  for (const lang of LANGS) {
    const pack = JSON.parse(await readFile(src(`assets/i18n/impreuna.${lang}.json`), 'utf8'));
    messages.push(
      buildMessage({
        lang,
        copy: pack.impreuna.push,
        day,
        date,
        reading: plan.formatReading(entry.refs, lang),
        readUrl: plan.bibleUrl(entry.refs[0], lang),
        video: media.video,
        speaker: media.speaker,
        fasting,
        fastingTheme,
        eve,
        image,
        site: config.publicUrl,
        appId: config.oneSignalAppId || '(sin App ID)',
        topic,
        testSubscription: args.test,
      }),
    );
  }

  const rows = [];
  let failed = false;
  for (const message of messages) {
    const lang = Object.keys(message.contents).find((k) => k !== 'en');
    const preview = `${message.headings.en} — ${message.contents.en.replace(/\n/g, ' / ')}`;
    if (args.dryRun) {
      console.log(`\n[${lang}] ${preview}\n${JSON.stringify(message, null, 2)}`);
      rows.push(`| ${lang} | ${preview} | (prueba en seco) |`);
      continue;
    }
    try {
      const result = await sendNotification(message, apiKey);
      const label = { sent: 'enviado', replayed: 'ya enviado antes (no se repite)', nobody: 'nadie suscrito' }[result.status];
      console.log(`[${lang}] ${label}${result.id ? ` · ${result.id}` : ''} · ${preview}`);
      rows.push(`| ${lang} | ${preview} | ${label} |`);
    } catch (err) {
      failed = true;
      console.error(`[${lang}] ERROR: ${err.message}`);
      rows.push(`| ${lang} | ${preview} | ❌ ${err.message} |`);
    }
  }
  await summary(
    env,
    [
      `### Proiectul Împreună · ziua ${day} · ${date}`,
      '',
      `Vídeo: ${media.video ? `${media.speaker ?? '—'} (${media.source})` : 'aún no publicado'}${fasting ? ' · post și rugăciune' : ''}`,
      '',
      '| Idioma | Aviso | Resultado |',
      '| --- | --- | --- |',
      ...rows,
    ].join('\n'),
  );
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    },
  );
}
