/**
 * Páginas estáticas por ruta para GitHub Pages.
 *
 * GitHub Pages no tiene rutas: un enlace profundo se sirve con `404.html`
 * (copia de `index.html`) **y estado HTTP 404**. Para la mayoría de páginas da
 * igual, pero no para un destino de QR (algunas vistas previas y lectores lo
 * tratan como error) ni para la tarjeta que pinta WhatsApp al compartir el
 * enlace, que lee el HTML estático y no ejecuta Angular.
 *
 * Este script escribe `<ruta>/index.html` en la compilación: una copia de
 * `index.html` con el título, la descripción y el Open Graph de esa página
 * (y `noindex` si la ruta no debe salir en buscadores). GitHub Pages sirve
 * `/<ruta>/` con estado 200 y Angular arranca igual (el `base href` es `/` y
 * el router quita la barra final).
 *
 * Textos: los mismos que pone `SeoService` en la SPA (`seo.<clave>` del
 * rumano, idioma por defecto), así que no pueden discrepar.
 *
 * Uso (lo ejecuta el despliegue tras `ng build`):
 *   node scripts/generate-route-pages.mjs --dist dist/iglesia-redes/browser
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Rutas con página estática. `seo` = clave bajo `seo.*` de `ro.json`.
 * `image` (opcional): tarjeta propia al compartir (1200 × 630, ruta bajo la
 * raíz publicada); sin ella queda la genérica de `index.html`.
 */
export const ROUTE_PAGES = [
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

/** Escapa texto para el contenido de `<title>`. */
function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** URL pública canónica, leída de `church.config.ts` (fuente única). */
async function readPublicUrl() {
  const source = await readFile('src/app/core/church.config.ts', 'utf8');
  const match = /publicUrl:\s*'([^']+)'/.exec(source);
  if (!match) throw new Error('No se encontró publicUrl en church.config.ts');
  return match[1].endsWith('/') ? match[1] : `${match[1]}/`;
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
  return html;
}

async function main() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8');
  const publicUrl = await readPublicUrl();
  const dictionaries = new Map();

  for (const page of ROUTE_PAGES) {
    // Textos del idioma de la página (rumano por defecto).
    const lang = page.lang ?? 'ro';
    if (!dictionaries.has(lang)) {
      dictionaries.set(lang, JSON.parse(await readFile(`src/assets/i18n/${lang}.json`, 'utf8')));
    }
    const dict = dictionaries.get(lang);
    const brand = dict.brand?.name ?? 'Biserica Elim';
    const seo = dict.seo?.[page.seo];
    if (!seo?.title || !seo?.description) {
      throw new Error(`Faltan seo.${page.seo}.title/description en ${lang}.json`);
    }
    const html = renderRoutePage(indexHtml, {
      lang: page.lang,
      // Mismo formato que SeoService: «<página> · <marca>».
      title: `${seo.title} · ${brand}`,
      description: seo.description,
      url: `${publicUrl}${page.path}/`,
      noindex: page.noindex,
      image: page.image && { url: `${publicUrl}${page.image.path}`, alt: page.image.alt },
    });
    const dir = join(DIST, page.path);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    console.log(`✓ ${page.path}/index.html${page.noindex ? ' (noindex)' : ''}`);
  }
}

// Sólo al ejecutarse como script (los tests importan las funciones).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/generate-route-pages.mjs')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
