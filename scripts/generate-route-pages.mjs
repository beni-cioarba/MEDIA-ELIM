/**
 * Páginas estáticas por ruta, sitemap, robots y datos estructurados para
 * GitHub Pages.
 *
 * GitHub Pages no tiene rutas: un enlace profundo se sirve con `404.html`
 * (copia de `index.html`) **y estado HTTP 404**. Google no indexa una página
 * que responde 404 (por mucho que Angular la pinte después), las vistas previas
 * de un QR lo tratan como error y la tarjeta de WhatsApp lee el HTML estático
 * sin ejecutar Angular.
 *
 * Este script, tras `ng build`:
 *  1. Escribe `<ruta>/index.html` para cada página pública: copia de
 *     `index.html` con su título, descripción, Open Graph y canónica (o
 *     `noindex`). GitHub Pages sirve `/<ruta>/` con 200 (y `/<ruta>` con 301
 *     hacia ella); Angular arranca igual (`base href` = `/` y el router quita
 *     la barra final).
 *  2. Afina la portada (`index.html`): título, canónica y JSON-LD de la
 *     iglesia (`WebSite` + `Church`/`Organization`).
 *  3. Escribe `sitemap.xml` (las páginas indexables) y `robots.txt`.
 *  4. Escribe también una página por cada **URL con datos** (`dataPages`):
 *     cada anuncio, cada perfil de la conducere, cada día de Proiectul
 *     Împreună, cada botez y candidato, cada semana de familias. Son los
 *     enlaces que más se comparten y, sin página propia, respondían 404 (131
 *     de los 163 enlaces internos de la web el 16/11/2026).
 *
 * Textos: los mismos que pone `SeoService` en la SPA (claves de `data.seo` de
 * cada ruta, del rumano —idioma por defecto— salvo que la página diga otro),
 * así que no pueden discrepar. Datos de la iglesia: `church.config.ts`.
 *
 * Uso (lo ejecuta el despliegue tras `ng build` y la copia a `404.html`):
 *   node scripts/generate-route-pages.mjs --dist dist/iglesia-redes/browser
 */

import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadTsModule } from './lib/load-ts-module.mjs';

/**
 * Páginas de los módulos (`src/app/features/*`/`*.pages.ts`), la misma fuente
 * que usan las rutas de la app: lo que declara un módulo es lo que se publica.
 * Antes esta lista se copiaba a mano y se desincronizaba de `app.routes.ts`.
 *
 * Reglas (ver `core/modules/module.model.ts`):
 *  · herramienta (`tool`) → sin página estática y fuera de `robots.txt`;
 *  · `staticPage: false` → sin página (la portada es el propio `index.html`);
 *  · ruta con parámetros → sólo sus `expand` (las de datos: `dataPages`);
 *  · el resto → una página; `noindex` la deja fuera del sitemap.
 */
export function modulePages(featuresDir = 'src/app/features') {
  const pages = [];
  for (const feature of readdirSync(featuresDir).sort()) {
    const dir = join(featuresDir, feature);
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.pages.ts')).sort()) {
      const exports = loadTsModule(join(dir, file));
      for (const group of Object.values(exports)) {
        if (group && typeof group === 'object') pages.push(...Object.values(group));
      }
    }
  }
  return pages;
}

/** Una página de módulo → entradas del script (`{ path, title, description, … }`). */
export function staticEntries(page) {
  if (page.tool || page.staticPage === false || page.path === '') return [];
  const options = page.staticPage ?? {};
  const entry = (path, seo) => ({
    path,
    title: seo.titleKey,
    description: seo.descriptionKey,
    ...(seo.noindex ? { noindex: true } : {}),
    ...(options.lang ? { lang: options.lang } : {}),
    ...(options.image ? { image: options.image } : {}),
  });
  if (page.path.includes(':')) return (options.expand ?? []).map((one) => entry(one.path, one.seo));
  return [entry(page.path, page.seo)];
}

const MODULE_PAGES = modulePages();

/** Rutas con página estática (derivadas de los módulos). */
export const ROUTE_PAGES = MODULE_PAGES.flatMap(staticEntries);

/**
 * Rutas que no deben rastrearse: las herramientas del operador. Las páginas
 * con datos personales **no** van aquí: Google tiene que poder leer su
 * `noindex` (bloqueadas, podrían salir como URL sin texto).
 */
export const ROBOTS_DISALLOW = MODULE_PAGES.filter((page) => page.tool).map((page) => `/${page.path}`);

const argv = process.argv.slice(2);
const distArg = argv.indexOf('--dist');
const DIST = distArg >= 0 ? argv[distArg + 1] : 'dist/iglesia-redes/browser';

/** Escapa un valor para un atributo HTML entre comillas dobles. */
export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escapa texto para el contenido de `<title>` o de un nodo XML. */
function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


/** Claves de título y descripción de una entrada. */
export function pageKeys(page) {
  return { title: page.title, description: page.description };
}

/** Valor de una clave con puntos (`seo.block.citirea-bibliei.title`); `undefined` si falta. */
export function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** URL pública canónica, de `core/site.ts` (fuente única), con barra final. */
export function readPublicUrl(siteSource) {
  const match = /PUBLIC_URL\s*=\s*'([^']+)'/.exec(siteSource);
  if (!match) throw new Error('No se encontró PUBLIC_URL en src/app/core/site.ts');
  return match[1].endsWith('/') ? match[1] : `${match[1]}/`;
}

/**
 * Datos de la iglesia para el JSON-LD, leídos de `church.config.ts` sin
 * ejecutar TypeScript (el script corre con Node a secas).
 */
export function readChurchData(configSource) {
  const pick = (re, what) => {
    const match = re.exec(configSource);
    if (!match) throw new Error(`No se encontró ${what} en church.config.ts`);
    return match[1];
  };
  const socials = pick(/socials:\s*\[([\s\S]*?)\n {2}\],/, 'socials');
  // Perfiles de la iglesia (`*_main`), no los de un departamento (Instagram de tineret).
  const sameAs = [...socials.matchAll(/id:\s*'([^']+)'[\s\S]*?url:\s*'([^']+)'/g)]
    .filter(([, id]) => id.endsWith('_main'))
    .map(([, , url]) => url);
  return {
    address: pick(/location:\s*\{[\s\S]*?address:\s*'([^']+)'/, 'location.address'),
    region: pick(/location:\s*\{[\s\S]*?city:\s*'([^']+)'/, 'location.city'),
    mapsUrl: pick(/mapsShareUrl:\s*'([^']+)'/, 'location.mapsShareUrl'),
    email: pick(/contact:\s*\{[\s\S]*?email:\s*'([^']+)'/, 'contact.email'),
    phone: pick(/contact:\s*\{[\s\S]*?phone:\s*'([^']+)'/, 'contact.phone'),
    sameAs,
  };
}

/**
 * JSON-LD de la portada: `WebSite` (el nombre del sitio que Google pinta sobre
 * el resultado) y la iglesia como `Church` + `Organization` (logo, dirección,
 * contacto y redes: panel de conocimiento y resultados locales).
 */
export function churchJsonLd({ publicUrl, church, siteName, altNames, description }) {
  const parts = /^(.*?),\s*(\d{5})\s+(.+)$/.exec(church.address);
  const address = parts
    ? {
        '@type': 'PostalAddress',
        streetAddress: parts[1],
        postalCode: parts[2],
        addressLocality: parts[3],
        addressRegion: church.region,
        addressCountry: 'ES',
      }
    : { '@type': 'PostalAddress', streetAddress: church.address, addressCountry: 'ES' };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${publicUrl}#website`,
        url: publicUrl,
        name: siteName,
        alternateName: altNames,
        inLanguage: ['ro', 'es'],
        publisher: { '@id': `${publicUrl}#church` },
      },
      {
        '@type': ['Church', 'Organization'],
        '@id': `${publicUrl}#church`,
        name: siteName,
        alternateName: altNames,
        url: publicUrl,
        description,
        logo: {
          '@type': 'ImageObject',
          url: `${publicUrl}assets/pwa/icon-any-512.png`,
          width: 512,
          height: 512,
        },
        image: `${publicUrl}assets/pwa/og-image.jpg`,
        address,
        hasMap: church.mapsUrl,
        email: church.email,
        telephone: church.phone,
        sameAs: church.sameAs,
      },
    ],
  };
}

/** Inserta el JSON-LD antes de `</head>` (`<` escapado: no puede cerrar el `<script>`). */
export function injectJsonLd(html, data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace('</head>', `  <script type="application/ld+json">${json}</script>\n</head>`);
}

/** `sitemap.xml` con las URL indexables. */
export function renderSitemap(urls, lastmod) {
  const items = urls
    .map((loc) => `  <url>\n    <loc>${escapeText(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

/** `robots.txt`: todo rastreable salvo las herramientas; apunta al sitemap. */
export function renderRobots(publicUrl, disallow) {
  return ['User-agent: *', ...disallow.map((path) => `Disallow: ${path}`), '', `Sitemap: ${publicUrl}sitemap.xml`, ''].join(
    '\n',
  );
}

/**
 * Sustituye (o añade) una etiqueta `<meta>` identificada por `name`/`property`.
 * Si no existe, la inserta justo antes de `</head>`.
 */
export function upsertMeta(html, attr, key, content) {
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}">`;
  const pattern = new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

/** Sustituye (o añade) `<link rel="canonical">`; con `null` lo quita. */
export function upsertCanonical(html, url) {
  const pattern = /<link\s+rel="canonical"[^>]*>/i;
  if (!url) return html.replace(pattern, '');
  const tag = `<link rel="canonical" href="${escapeAttr(url)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

/** HTML de una ruta a partir del `index.html` compilado. */
export function renderRoutePage(indexHtml, { title, description, url, noindex, image, lang }) {
  let html = indexHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeText(title)}</title>`);
  if (lang) {
    html = html.replace(/<html([^>]*?)\slang="[^"]*"/i, `<html$1 lang="${escapeAttr(lang)}"`);
    html = upsertMeta(html, 'property', 'og:locale', lang === 'es' ? 'es_ES' : 'ro_RO');
  }
  html = upsertMeta(html, 'name', 'description', description);
  html = upsertMeta(html, 'property', 'og:title', title);
  html = upsertMeta(html, 'property', 'og:description', description);
  html = upsertMeta(html, 'property', 'og:url', url);
  if (image) {
    html = upsertMeta(html, 'property', 'og:image', image.url);
    html = upsertMeta(html, 'property', 'og:image:width', '1200');
    html = upsertMeta(html, 'property', 'og:image:height', '630');
    html = upsertMeta(html, 'property', 'og:image:alt', image.alt);
    html = upsertMeta(html, 'name', 'twitter:image', image.url);
  }
  if (noindex) html = upsertMeta(html, 'name', 'robots', 'noindex, noimageindex');
  // Canónica = la URL que se sirve con 200 (con barra final). Una página
  // noindex no lleva: serían señales contradictorias.
  return upsertCanonical(html, noindex ? null : url);
}

/**
 * Fusión profunda de un paquete de traducciones sobre el diccionario (como
 * hace ngx-translate al añadirlo): `departments.youth.intro` del paquete no
 * borra `departments.youth.name` del principal.
 */
export function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    const isObject = value && typeof value === 'object' && !Array.isArray(value);
    target[key] = isObject && target[key] && typeof target[key] === 'object' ? deepMerge(target[key], value) : value;
  }
  return target;
}

/** Google corta la descripción hacia los 160 caracteres: se corta antes, por palabra. */
export function clip(text, max = 158) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/**
 * Páginas de las **URL con datos**, ya resueltas (título y descripción en
 * texto, no en claves): salen de los mismos ficheros de datos que lee la app.
 *
 * `noindex`: datos personales (bautismos, familias) y anuncios ya caducados.
 * `sitemap: false`: indexable, pero no se anuncia en el mapa del sitio (los
 * 365 días de Proiectul Împreună: se llega a ellos desde su plan).
 *
 * @param {{ texts: object, today: string }} context `texts`: diccionario rumano.
 */
export function dataPages({ texts, today }) {
  const pages = [];
  const seo = (key) => lookup(texts, `seo.${key}`);

  const { DEFAULT_CHURCH_CONFIG: church } = loadTsModule('src/app/core/church.config.ts');
  for (const item of church.announcements ?? []) {
    const active = (!item.publishedOn || item.publishedOn <= today) && item.expiresOn >= today;
    pages.push({
      path: `anunturi/${item.id}`,
      title: item.title,
      description: clip(item.lead ?? seo('announcements.description')),
      noindex: !active,
    });
  }

  const { PERSON_PROFILES } = loadTsModule('src/app/core/leadership-profiles.config.ts');
  const { PEOPLE_INDEX } = loadTsModule('src/app/core/leadership.config.ts');
  for (const id of Object.keys(PERSON_PROFILES)) {
    const person = PEOPLE_INDEX.get(id);
    if (!person) continue;
    pages.push({ path: `conducere/${id}`, title: person.name, description: seo('leadership.description') });
  }

  const { BAPTISMS } = loadTsModule('src/app/core/baptisms.config.ts');
  for (const baptism of BAPTISMS) {
    const base = `botezuri/${baptism.date}`;
    pages.push({ path: base, title: seo('baptisms.title'), description: seo('baptisms.description'), noindex: true });
    for (const candidate of baptism.candidates ?? []) {
      pages.push({
        path: `${base}/${candidate.id}`,
        title: candidate.name,
        description: seo('baptisms.description'),
        noindex: true,
      });
    }
  }

  const { FAMILY_PRAYER_WEEKS } = loadTsModule('src/app/core/family-prayer.config.ts');
  for (const week of FAMILY_PRAYER_WEEKS) {
    pages.push({
      path: `rugaciune-pentru-familii/${week.presentedOn}`,
      title: seo('family_prayer.title'),
      description: seo('family_prayer.description'),
      noindex: true,
    });
  }

  return pages;
}

/** Un día de Proiectul Împreună por cada lectura del plan del año. */
export function impreunaDayPages({ texts, plan }) {
  const title = lookup(texts, 'seo.impreuna.title');
  const description = lookup(texts, 'seo.impreuna.description');
  return plan.readings.map((_, index) => ({
    path: `impreuna/ziua/${index + 1}`,
    title: `Ziua ${index + 1} · ${title}`,
    description,
    sitemap: false,
  }));
}

/** Diccionario de un idioma: el principal más el paquete diferido de departamentos. */
async function readDictionary(lang) {
  const dict = JSON.parse(await readFile(`src/assets/i18n/${lang}.json`, 'utf8'));
  const pack = JSON.parse(await readFile(`src/assets/i18n/departments.${lang}.json`, 'utf8'));
  return deepMerge(dict, pack);
}

/**
 * `index.html` cambia después de `ng build`: hay que poner su SHA-1 nuevo en
 * `ngsw.json`. Si no, el service worker de Angular lo descarga, ve que el hash
 * no cuadra y deja de servir la app desde caché (modo degradado: adiós al
 * arranque sin red y a las actualizaciones limpias).
 */
export function updateNgswHash(manifest, path, content) {
  if (!manifest?.hashTable || !(path in manifest.hashTable)) {
    throw new Error(`ngsw.json no tiene ${path} en hashTable`);
  }
  manifest.hashTable[path] = createHash('sha1').update(content).digest('hex');
  return manifest;
}

async function refreshServiceWorkerHash(indexHtml) {
  const file = join(DIST, 'ngsw.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return; // Compilación sin service worker.
  }
  // Con prerender, el service worker cachea el shell (`index.csr.html`, que
  // este script no toca) y `index.html` —la portada ya pintada— no está en
  // su tabla: nada que actualizar.
  if (!manifest?.hashTable || !('/index.html' in manifest.hashTable)) return;
  await writeFile(file, JSON.stringify(updateNgswHash(manifest, '/index.html', indexHtml), null, 2));
}

/**
 * Base de cada página: su HTML **prerenderizado** si el build lo escribió
 * (`<ruta>/index.html`, con el contenido ya pintado; ver
 * `src/app/app.routes.server.ts`) o, si no, el shell. En los dos casos se le
 * ponen encima el título, la descripción, Open Graph y la canónica.
 */
async function pageBase(dir, shell) {
  return readFile(join(dir, 'index.html'), 'utf8').catch(() => shell);
}

async function main() {
  const configSource = await readFile('src/app/core/church.config.ts', 'utf8');
  const appPathsSource = await readFile('src/app/core/navigation/app-paths.ts', 'utf8');
  const publicUrl = readPublicUrl(await readFile('src/app/core/site.ts', 'utf8'));
  const dictionaries = new Map();
  const dict = async (lang) => {
    if (!dictionaries.has(lang)) dictionaries.set(lang, await readDictionary(lang));
    return dictionaries.get(lang);
  };
  const ro = await dict('ro');
  const es = await dict('es');
  const siteNameOf = (texts) => lookup(texts, 'seo.site_name') ?? lookup(texts, 'brand.name');

  // ── Portada: título, descripción, canónica y JSON-LD ─────────────────
  // Mismo formato que SeoService en la portada: «<sitio> · <lema>».
  const homeDescription = lookup(ro, 'seo.home.description');
  // El shell (sin contenido): con prerender, `index.csr.html`; sin él, el
  // propio `index.html`. Es la base de las páginas que no se prerenderizan.
  const shellFile = join(DIST, 'index.csr.html');
  const shell = await readFile(shellFile, 'utf8').catch(() => null);
  const indexHtml = renderRoutePage(await readFile(join(DIST, 'index.html'), 'utf8'), {
    title: `${siteNameOf(ro)} · ${lookup(ro, 'seo.home.title')}`,
    description: homeDescription,
    url: publicUrl,
  });
  const jsonLd = churchJsonLd({
    publicUrl,
    church: readChurchData(configSource),
    siteName: siteNameOf(ro),
    altNames: [siteNameOf(es), 'Biserica Elim', 'Elim Arganda'],
    description: homeDescription,
  });
  const rootHtml = injectJsonLd(indexHtml, jsonLd);
  await writeFile(join(DIST, 'index.html'), rootHtml);
  await refreshServiceWorkerHash(rootHtml);
  console.log('✓ index.html (canónica + JSON-LD; hash del service worker al día)');
  // Base de las páginas sin prerender: el shell con los datos de la portada
  // (se sobrescriben por página).
  const shellHtml = shell === null ? indexHtml : renderRoutePage(shell, { title: `${siteNameOf(ro)} · ${lookup(ro, 'seo.home.title')}`, description: homeDescription, url: publicUrl });

  // ── Una página por ruta ──────────────────────────────────────────────
  const indexable = [publicUrl];
  for (const page of ROUTE_PAGES) {
    const lang = page.lang ?? 'ro';
    const texts = await dict(lang);
    const keys = pageKeys(page);
    const pageTitle = lookup(texts, keys.title);
    const description = lookup(texts, keys.description);
    if (typeof pageTitle !== 'string' || typeof description !== 'string') {
      throw new Error(`Faltan ${keys.title} / ${keys.description} en ${lang}`);
    }
    const url = `${publicUrl}${page.path}/`;
    const dir = join(DIST, page.path);
    const html = renderRoutePage(await pageBase(dir, shellHtml), {
      lang: page.lang,
      // Mismo formato que SeoService: «<página> · <sitio>».
      title: `${pageTitle} · ${siteNameOf(texts)}`,
      description,
      url,
      noindex: page.noindex,
      image: page.image && { url: `${publicUrl}${page.image.path}`, alt: page.image.alt },
    });
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    if (!page.noindex) indexable.push(url);
    console.log(`✓ ${page.path}/index.html${page.noindex ? ' (noindex)' : ''}`);
  }

  // ── Una página por URL con datos ─────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const plan = JSON.parse(await readFile(`src/app/core/impreuna/data/${today.slice(0, 4)}.plan.json`, 'utf8').catch(() => '{"readings":[]}'));
  const extra = [...dataPages({ texts: ro, today }), ...impreunaDayPages({ texts: ro, plan })];
  for (const page of extra) {
    const url = `${publicUrl}${page.path}/`;
    const dir = join(DIST, page.path);
    const html = renderRoutePage(await pageBase(dir, shellHtml), {
      title: `${page.title} · ${siteNameOf(ro)}`,
      description: page.description,
      url,
      noindex: page.noindex,
    });
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    if (!page.noindex && page.sitemap !== false) indexable.push(url);
  }
  console.log(`✓ ${extra.length} páginas de URL con datos (anuncios, perfiles, días, botezuri, familias)`);

  // ── sitemap.xml y robots.txt ─────────────────────────────────────────
  await writeFile(join(DIST, 'sitemap.xml'), renderSitemap(indexable, today));
  await writeFile(join(DIST, 'robots.txt'), renderRobots(publicUrl, ROBOTS_DISALLOW));
  console.log(`✓ sitemap.xml (${indexable.length} URL) y robots.txt`);
}

// Sólo al ejecutarse como script (los tests importan las funciones).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/generate-route-pages.mjs')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
