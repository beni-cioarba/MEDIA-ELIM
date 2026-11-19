/**
 * Validación del **contenido** (los `*.config.ts` de `core/`) antes de publicar.
 *
 * El compilador ya comprueba la forma (tipos); esto comprueba lo que los
 * tipos no ven y que hasta ahora se descubría en el templo:
 *   · fechas que no son fechas (`2026-02-30`) o un anuncio que caduca antes
 *     de publicarse;
 *   · identificadores repetidos (dos anuncios con el mismo `id` comparten URL);
 *   · un fichero referenciado que no existe —una foto, un cartel, su
 *     miniatura— o que pesa más de lo que su tamaño justifica;
 *   · una clave de traducción citada por los datos que no está en `ro`/`es`.
 *
 * Los **avisos** no bloquean: contenido caducado que sigue en el código (se
 * puede archivar) e imágenes pesadas heredadas.
 *
 * Uso: node scripts/check-content.mjs   (dentro de `npm run check`)
 *      node scripts/check-content.mjs --today 2027-01-15   (probar otra fecha)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { imageBudgetKb } from './lib/image-budget.mjs';
import { loadTsModule } from './lib/load-ts-module.mjs';

const SRC = 'src';
const argToday = process.argv.indexOf('--today');
const TODAY = argToday >= 0 ? process.argv[argToday + 1] : new Date().toISOString().slice(0, 10);

/**
 * Un anuncio caducado sigue en el archivo de `/anunturi` (y su enlace
 * compartido sigue abriendo) durante `PAST_WINDOW_DAYS` = 90 días
 * (`AnnouncementsService`). Pasado eso ya no lo ve nadie: aviso para retirarlo.
 */
const STALE_DAYS = 90;

const errors = [];
const warnings = [];
const error = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

// ── Utilidades ──────────────────────────────────────────────────────────
const isDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

function unique(where, items, key = 'id') {
  const seen = new Set();
  for (const item of items) {
    const value = item?.[key];
    if (value === undefined || value === null || value === '') error(where, `elemento sin «${key}»`);
    else if (seen.has(value)) error(where, `«${key}» repetido: ${value}`);
    seen.add(value);
  }
}

function date(where, value, { optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return;
  if (!isDate(value)) error(where, `fecha no válida: ${JSON.stringify(value)} (se espera YYYY-MM-DD)`);
}

const checkedAssets = new Set();
function asset(where, path) {
  if (typeof path !== 'string' || !path.startsWith('assets/')) return;
  const file = join(SRC, path);
  if (!existsSync(file)) {
    error(where, `no existe ${path}`);
    return;
  }
  if (checkedAssets.has(path)) return;
  checkedAssets.add(path);
  const budget = imageBudgetKb(path);
  if (budget === null) return;
  const kb = Math.round(statSync(file).size / 1024);
  if (kb > budget) warn(where, `${path} pesa ${kb} kB (presupuesto ${budget} kB): npm run images:budget`);
}

/** Todas las rutas `assets/…` que aparezcan en un dato, a cualquier profundidad. */
function assetsIn(where, value) {
  if (typeof value === 'string') {
    if (/^assets\/.+\.[a-z0-9]{2,5}$/i.test(value)) asset(where, value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => assetsIn(where, item));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => assetsIn(where, item));
  }
}

const dictionaries = Object.fromEntries(
  ['ro', 'es'].map((lang) => [lang, JSON.parse(readFileSync(`src/assets/i18n/${lang}.json`, 'utf8'))]),
);
function i18n(where, key) {
  for (const [lang, dict] of Object.entries(dictionaries)) {
    const found = key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
    if (found === undefined) error(where, `falta la clave «${key}» en ${lang}.json`);
  }
}

// ── church.config.ts ────────────────────────────────────────────────────
const { DEFAULT_CHURCH_CONFIG: church } = loadTsModule('src/app/core/church.config.ts');

unique('announcements', church.announcements);
for (const item of church.announcements) {
  const where = `announcements[${item.id}]`;
  date(where, item.expiresOn);
  date(where, item.publishedOn, { optional: true });
  if (isDate(item.publishedOn) && isDate(item.expiresOn) && item.expiresOn < item.publishedOn) {
    error(where, `caduca (${item.expiresOn}) antes de publicarse (${item.publishedOn})`);
  }
  if (!item.title?.trim()) error(where, 'sin título');
  if (isDate(item.expiresOn) && daysBetween(item.expiresOn, TODAY) > STALE_DAYS) {
    warn(where, `caducó el ${item.expiresOn}: se puede retirar del código`);
  }
  assetsIn(where, item);
}

unique('upcomingEvents', church.upcomingEvents);
for (const event of church.upcomingEvents) {
  const where = `upcomingEvents[${event.id}]`;
  date(where, event.date);
  if (event.time && !/^\d{1,2}:\d{2}(\s*&\s*\d{1,2}:\d{2})*$/.test(event.time)) error(where, `hora no válida: «${event.time}»`);
  if (!event.title?.trim()) error(where, 'sin título');
  assetsIn(where, event);
  // El cartel va también en pequeño en la agenda (ver core/util/poster-thumb.ts).
  if (typeof event.poster === 'string' && event.poster.endsWith('.webp')) {
    const thumb = event.poster.replace(/\.webp$/i, '-thumb.webp');
    if (!existsSync(join(SRC, thumb))) error(where, `falta la miniatura ${thumb} (npm run posters)`);
  }
  if (isDate(event.date) && daysBetween(event.date, TODAY) > STALE_DAYS * 2) {
    warn(where, `fue el ${event.date}: se puede retirar del código`);
  }
}

unique('weeklyProgram', church.weeklyProgram);
for (const service of church.weeklyProgram) {
  const where = `weeklyProgram[${service.id}]`;
  if (!Number.isInteger(service.day) || service.day < 0 || service.day > 6) error(where, `día fuera de 0-6: ${service.day}`);
  if (!/^\d{1,2}:\d{2}(\s*&\s*\d{1,2}:\d{2})*$/.test(service.time ?? '')) error(where, `hora no válida: «${service.time}»`);
}

unique('heroSlides', church.heroSlides);
for (const slide of church.heroSlides) {
  assetsIn(`heroSlides[${slide.id}]`, slide);
  i18n(`heroSlides[${slide.id}]`, `home.hero.slides.${slide.i18nKey}`);
}

unique('mediaEvents', church.mediaEvents);
for (const album of church.mediaEvents) {
  const where = `mediaEvents[${album.id}]`;
  date(where, album.date, { optional: true });
  assetsIn(where, album);
  i18n(where, `gallery.events.${album.i18nKey}.name`);
}

unique('socials', church.socials);
assetsIn('church.config', { aboutImage: church.aboutImage });

// La primera diapositiva del hero se precarga a mano en index.html: tienen que coincidir.
const indexHtml = readFileSync('src/index.html', 'utf8');
const firstHero = church.heroSlides[0]?.image;
if (firstHero && !indexHtml.includes(`href="${firstHero}"`)) {
  error('index.html', `la precarga del hero no coincide con heroSlides[0].image (${firstHero})`);
}

// ── Familias ────────────────────────────────────────────────────────────
const { FAMILY_PRAYER_WEEKS } = loadTsModule('src/app/core/family-prayer.config.ts');
unique('FAMILY_PRAYER_WEEKS', FAMILY_PRAYER_WEEKS, 'presentedOn');
for (const week of FAMILY_PRAYER_WEEKS) {
  const where = `family-prayer[${week.presentedOn}]`;
  date(where, week.presentedOn);
  if (isDate(week.presentedOn) && new Date(`${week.presentedOn}T00:00:00Z`).getUTCDay() !== 0) {
    error(where, 'presentedOn no es domingo');
  }
  unique(where, week.families ?? []);
}

// ── Bautismos ───────────────────────────────────────────────────────────
const { BAPTISMS } = loadTsModule('src/app/core/baptisms.config.ts');
unique('BAPTISMS', BAPTISMS, 'date');
for (const baptism of BAPTISMS) {
  const where = `baptisms[${baptism.date}]`;
  date(where, baptism.date);
  unique(where, baptism.candidates ?? []);
}

// ── Causas de oración y perfiles ────────────────────────────────────────
const { PRAYER_CAUSES } = loadTsModule('src/app/core/prayer-causes.config.ts');
date('PRAYER_CAUSES.updatedOn', PRAYER_CAUSES.updatedOn);
unique('PRAYER_CAUSES', PRAYER_CAUSES.causes);

const { PERSON_PROFILES } = loadTsModule('src/app/core/leadership-profiles.config.ts');
const { PEOPLE_INDEX } = loadTsModule('src/app/core/leadership.config.ts');
for (const id of Object.keys(PERSON_PROFILES)) {
  if (!PEOPLE_INDEX.has(id)) error('PERSON_PROFILES', `«${id}» no existe en leadership.config.ts`);
}

const { LEGAL_INFO } = loadTsModule('src/app/core/legal.config.ts');
date('LEGAL_INFO.updatedOn', LEGAL_INFO.updatedOn);

// ── Resultado ───────────────────────────────────────────────────────────
for (const message of warnings) console.warn(`⚠ ${message}`);
if (errors.length > 0) {
  for (const message of errors) console.error(`✗ ${message}`);
  console.error(`\n${errors.length} error(es) de contenido.`);
  process.exit(1);
}
console.log(`✓ Contenido: ${church.announcements.length} anuncios, ${church.upcomingEvents.length} eventos, ${FAMILY_PRAYER_WEEKS.length} semanas de familias, ${BAPTISMS.length} botezuri, ${checkedAssets.size} ficheros comprobados${warnings.length ? ` (${warnings.length} avisos)` : ''}.`);
