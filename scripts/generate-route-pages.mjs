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
 *
 * Textos: los mismos que pone `SeoService` en la SPA (claves de `data.seo` de
 * cada ruta, del rumano —idioma por defecto— salvo que la página diga otro),
 * así que no pueden discrepar. Datos de la iglesia: `church.config.ts`.
 *
 * Uso (lo ejecuta el despliegue tras `ng build` y la copia a `404.html`):
 *   node scripts/generate-route-pages.mjs --dist dist/iglesia-redes/browser
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Rutas con página estática. `seo` = clave bajo `seo.*` (atajo de
 * `title: 'seo.<x>.title'` + `description: 'seo.<x>.description'`);
 * `title` / `description` = claves i18n completas. Deben ser las mismas que
 * `data.seo` de la ruta en `app.routes.ts`: si no, Google y WhatsApp dicen una
 * cosa y la pestaña otra.
 * `image` (opcional): tarjeta propia al compartir (1200 × 630, ruta bajo la
 * raíz publicada); sin ella queda la genérica de `index.html`.
 * `noindex`: la página existe (200, tarjeta al compartir) pero no va a los
 * buscadores ni al sitemap. Sin `noindex` entra en `sitemap.xml`.
 *
 * **Toda página pública debe estar aquí** (las de departamento salen solas de
 * `DEPARTMENT_SLUGS`). Sin ella responde 404 y Google no la indexa nunca: el
 * 14/11/2026 sólo la portada y `/impreuna` estaban en el índice.
 */
export const ROUTE_PAGES = [
  // ── Iglesia ───────────────────────────────────────────────────────────
  { path: 'biserica', title: 'nav.about', description: 'nav.about_desc' },
  { path: 'despre-noi', seo: 'about' },
  { path: 'marturisirea-de-credinta', seo: 'credo' },
  { path: 'conducere', seo: 'leadership' },
  // ── Program ───────────────────────────────────────────────────────────
  { path: 'program', title: 'nav.program', description: 'nav.program_desc' },
  { path: 'anunturi', seo: 'announcements' },
  { path: 'media/program', seo: 'block.program' },
  { path: 'media/evenimente', seo: 'block.evenimente' },
  { path: 'media/citirea-bibliei', seo: 'block.citirea-bibliei' },
  // Proiectul Împreună: el enlace que más se comparte (grupos de WhatsApp,
  // QR de la hoja impresa). La imagen es la genérica de la web.
  { path: 'impreuna', seo: 'impreuna' },
  { path: 'impreuna/plan', seo: 'impreuna_plan' },
  { path: 'talantul-in-negot', seo: 'talent_contest' },
  // Con datos personales (familias, enfermos, menores): se comparten por
  // enlace, nunca en buscadores.
  { path: 'rugaciune-pentru-familii', seo: 'family_prayer', noindex: true },
  { path: 'cauze-de-rugaciune', seo: 'prayer_causes', noindex: true },
  { path: 'botezuri', seo: 'baptisms', noindex: true },
  // ── Departamente (cada departamento: `departmentPages`) ──────────────
  { path: 'departamente', title: 'nav.departments', description: 'nav.departments_desc' },
  // ── Media ─────────────────────────────────────────────────────────────
  { path: 'multimedia', title: 'nav.media', description: 'nav.media_desc' },
  { path: 'media', seo: 'media' },
  { path: 'media/galerie', seo: 'block.galerie' },
  { path: 'media/retele', seo: 'block.retele' },
  { path: 'media/transmisiuni', seo: 'block.transmisiuni' },
  { path: 'media/locatie', seo: 'block.locatie' },
  // ── Contacto y donativos ─────────────────────────────────────────────
  { path: 'contact', seo: 'contact' },
  { path: 'doneaza', seo: 'donate' },
  // Invitați: destino del QR de bienvenida. Oculta → noindex.
  {
    path: 'invitati',
    seo: 'guests',
    noindex: true,
    image: {
      path: 'assets/pwa/og-invitati.jpg',
      alt: 'Bine ai venit acasă — Biserica Elim, duminica la 10:00 și 18:00',
    },
  },
  // La misma en español: el idioma va en la ruta para que la tarjeta de
  // WhatsApp salga en español (es la URL del QR en español).
  {
    path: 'invitati/es',
    seo: 'guests',
    lang: 'es',
    noindex: true,
    image: {
      path: 'assets/pwa/og-invitati-es.jpg',
      alt: 'Bienvenido a casa — Iglesia Elim, los domingos a las 10:00 y 18:00',
    },
  },
];

/**
 * Rutas que no deben rastrearse: herramientas del operador y hojas de
 * imprimir. Las páginas con datos personales **no** van aquí: Google tiene que
 * poder leer su `noindex` (bloqueadas, podrían salir como URL sin texto).
 */
export const ROBOTS_DISALLOW = ['/media/control', '/media/ecran', '/impreuna/tipar', '/invitati/qr', '/stil'];

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

/** Páginas de departamento, una por slug de `DEPARTMENT_SLUGS` (`app-paths.ts`). */
export function departmentPages(appPathsSource) {
  const block = /DEPARTMENT_SLUGS\s*=\s*\{([\s\S]*?)\}/.exec(appPathsSource);
  if (!block) throw new Error('No se encontró DEPARTMENT_SLUGS en app-paths.ts');
  return [...block[1].matchAll(/(\w+):\s*'([^']+)'/g)].map(([, id, slug]) => ({
    path: `departamente/${slug}`,
    title: `departments.${id}.name`,
    description: `departments.${id}.tagline`,
  }));
}

/** Claves de título y descripción de una entrada (atajo `seo` o claves completas). */
export function pageKeys(page) {
  return page.seo
    ? { title: `seo.${page.seo}.title`, description: `seo.${page.seo}.description` }
    : { title: page.title, description: page.description };
}

/** Valor de una clave con puntos (`seo.block.citirea-bibliei.title`); `undefined` si falta. */
export function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** URL pública canónica, de `church.config.ts` (fuente única), con barra final. */
export function readPublicUrl(configSource) {
  const match = /publicUrl:\s*'([^']+)'/.exec(configSource);
  if (!match) throw new Error('No se encontró publicUrl en church.config.ts');
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
  await writeFile(file, JSON.stringify(updateNgswHash(manifest, '/index.html', indexHtml), null, 2));
}

async function main() {
  const configSource = await readFile('src/app/core/church.config.ts', 'utf8');
  const appPathsSource = await readFile('src/app/core/navigation/app-paths.ts', 'utf8');
  const publicUrl = readPublicUrl(configSource);
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

  // ── Una página por ruta ──────────────────────────────────────────────
  const indexable = [publicUrl];
  for (const page of [...ROUTE_PAGES, ...departmentPages(appPathsSource)]) {
    const lang = page.lang ?? 'ro';
    const texts = await dict(lang);
    const keys = pageKeys(page);
    const pageTitle = lookup(texts, keys.title);
    const description = lookup(texts, keys.description);
    if (typeof pageTitle !== 'string' || typeof description !== 'string') {
      throw new Error(`Faltan ${keys.title} / ${keys.description} en ${lang}`);
    }
    const url = `${publicUrl}${page.path}/`;
    const html = renderRoutePage(indexHtml, {
      lang: page.lang,
      // Mismo formato que SeoService: «<página> · <sitio>».
      title: `${pageTitle} · ${siteNameOf(texts)}`,
      description,
      url,
      noindex: page.noindex,
      image: page.image && { url: `${publicUrl}${page.image.path}`, alt: page.image.alt },
    });
    const dir = join(DIST, page.path);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    if (!page.noindex) indexable.push(url);
    console.log(`✓ ${page.path}/index.html${page.noindex ? ' (noindex)' : ''}`);
  }

  // ── sitemap.xml y robots.txt ─────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
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
