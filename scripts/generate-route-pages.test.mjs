// Tests del generador de páginas estáticas por ruta.
// Uso: node --test scripts/   (o `npm run test:scripts`)
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ROBOTS_DISALLOW,
  ROUTE_PAGES,
  churchJsonLd,
  deepMerge,
  departmentPages,
  escapeAttr,
  injectJsonLd,
  lookup,
  pageKeys,
  readChurchData,
  renderRobots,
  renderRoutePage,
  renderSitemap,
  upsertCanonical,
  updateNgswHash,
  upsertMeta,
} from './generate-route-pages.mjs';

const INDEX = `<!doctype html>
<html lang="ro">
<head>
  <title>Biserica Elim Arganda</title>
  <base href="/">
  <meta name="description" content="Genérica">
  <meta property="og:title" content="Biserica Elim Arganda">
  <meta property="og:description" content="Genérica">
  <meta property="og:image" content="https://elimarganda.com/assets/pwa/og-image.jpg">
  <meta name="twitter:image" content="https://elimarganda.com/assets/pwa/og-image.jpg">
</head>
<body><app-root></app-root></body>
</html>`;

test('invitati está en la lista, con noindex y su tarjeta propia (existe el fichero)', () => {
  const page = ROUTE_PAGES.find((p) => p.path === 'invitati');
  assert.ok(page);
  assert.equal(page.noindex, true);
  assert.ok(existsSync(`src/${page.image.path}`), page.image.path);
});

test('escapa comillas y < > & en atributos', () => {
  assert.equal(escapeAttr('a "b" <c> & d'), 'a &quot;b&quot; &lt;c&gt; &amp; d');
});

test('upsertMeta sustituye la etiqueta existente y añade la que falta', () => {
  const replaced = upsertMeta(INDEX, 'name', 'description', 'Nueva');
  assert.match(replaced, /<meta name="description" content="Nueva">/);
  // Sólo queda la «Genérica» de og:description: la de description se sustituyó.
  assert.equal(replaced.match(/content="Genérica"/g).length, 1);
  const added = upsertMeta(INDEX, 'property', 'og:url', 'https://elimarganda.com/invitati/');
  assert.match(added, /<meta property="og:url" content="https:\/\/elimarganda.com\/invitati\/">\n<\/head>/);
});

test('renderRoutePage pone título, descripción, Open Graph, URL y noindex', () => {
  const html = renderRoutePage(INDEX, {
    title: 'Bine ai venit · Biserica Elim',
    description: 'Ești la prima vizită? "Te așteptăm"',
    url: 'https://elimarganda.com/invitati/',
    noindex: true,
  });
  assert.match(html, /<title>Bine ai venit · Biserica Elim<\/title>/);
  assert.match(html, /<meta name="description" content="Ești la prima vizită\? &quot;Te așteptăm&quot;">/);
  assert.match(html, /<meta property="og:title" content="Bine ai venit · Biserica Elim">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/elimarganda.com\/invitati\/">/);
  assert.match(html, /<meta name="robots" content="noindex, noimageindex">/);
  // No toca lo demás: el base href y la app siguen igual.
  assert.match(html, /<base href="\/">/);
  assert.match(html, /<app-root><\/app-root>/);
  // Una sola etiqueta de cada.
  assert.equal(html.match(/<title>/g).length, 1);
  assert.equal(html.match(/name="description"/g).length, 1);
});

test('con image sustituye og:image y twitter:image (una sola de cada)', () => {
  const url = 'https://elimarganda.com/assets/pwa/og-invitati.jpg';
  const html = renderRoutePage(INDEX, { title: 't', description: 'd', url: 'u', image: { url, alt: 'Bine ai venit' } });
  assert.match(html, new RegExp(`<meta property="og:image" content="${url}">`));
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${url}">`));
  assert.match(html, /<meta property="og:image:alt" content="Bine ai venit">/);
  assert.equal(html.match(/property="og:image"/g).length, 1);
  assert.doesNotMatch(html, /og-image\.jpg/);
});

test('invitati/es: en español, con su tarjeta (existe el fichero)', () => {
  const page = ROUTE_PAGES.find((p) => p.path === 'invitati/es');
  assert.ok(page);
  assert.equal(page.lang, 'es');
  assert.equal(page.noindex, true);
  assert.ok(existsSync(`src/${page.image.path}`), page.image.path);
});

test('con lang cambia <html lang> y og:locale', () => {
  const html = renderRoutePage(INDEX, { title: 't', description: 'd', url: 'u', lang: 'es' });
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta property="og:locale" content="es_ES">/);
});

test('sin image deja la tarjeta genérica', () => {
  const html = renderRoutePage(INDEX, { title: 't', description: 'd', url: 'u' });
  assert.match(html, /og-image\.jpg/);
});

test('sin noindex no añade robots', () => {
  const html = renderRoutePage(INDEX, { title: 't', description: 'd', url: 'u', noindex: false });
  assert.doesNotMatch(html, /name="robots"/);
});

// ── Cobertura, canónica, sitemap, robots y JSON-LD (14/11/2026) ──────────

const ro = JSON.parse(readFileSync('src/assets/i18n/ro.json', 'utf8'));
const es = JSON.parse(readFileSync('src/assets/i18n/es.json', 'utf8'));
const deptRo = JSON.parse(readFileSync('src/assets/i18n/departments.ro.json', 'utf8'));
const deptEs = JSON.parse(readFileSync('src/assets/i18n/departments.es.json', 'utf8'));
const withDepts = (main, pack) => deepMerge(structuredClone(main), pack);
const appPaths = readFileSync('src/app/core/navigation/app-paths.ts', 'utf8');
const config = readFileSync('src/app/core/church.config.ts', 'utf8');
const routes = readFileSync('src/app/app.routes.ts', 'utf8');

test('cada página estática tiene título y descripción en ro y es', () => {
  const pages = [...ROUTE_PAGES, ...departmentPages(appPaths)];
  for (const [lang, dict] of [['ro', withDepts(ro, deptRo)], ['es', withDepts(es, deptEs)]]) {
    for (const page of pages) {
      const keys = pageKeys(page);
      assert.equal(typeof lookup(dict, keys.title), 'string', `${lang}: ${keys.title}`);
      assert.equal(typeof lookup(dict, keys.description), 'string', `${lang}: ${keys.description}`);
    }
  }
  assert.equal(typeof lookup(ro, 'seo.site_name'), 'string');
});

test('las páginas de bloque usan las claves seo.block.<slug> que pide la ruta', () => {
  assert.match(routes, /titleKey: 'seo\.block\.:blockId\.title'/);
  for (const page of ROUTE_PAGES.filter((p) => p.path.startsWith('media/'))) {
    assert.equal(page.seo, `block.${page.path.slice('media/'.length)}`, page.path);
  }
});

test('departamentos: una página por slug de DEPARTMENT_SLUGS', () => {
  const pages = departmentPages(appPaths);
  assert.ok(pages.length >= 6);
  assert.ok(pages.some((p) => p.path === 'departamente/tineret' && p.title === 'departments.youth.name'));
});

test('canónica con barra final en las indexables; ninguna en las noindex', () => {
  const html = renderRoutePage(INDEX, { title: 't', description: 'd', url: 'https://elimarganda.com/contact/' });
  assert.match(html, /<link rel="canonical" href="https:\/\/elimarganda.com\/contact\/">/);
  const again = renderRoutePage(html, { title: 't', description: 'd', url: 'https://elimarganda.com/doneaza/' });
  assert.equal(again.match(/rel="canonical"/g).length, 1);
  assert.match(again, /doneaza\//);
  const hidden = renderRoutePage(html, { title: 't', description: 'd', url: 'x', noindex: true });
  assert.doesNotMatch(hidden, /rel="canonical"/);
  assert.equal(upsertCanonical(INDEX, null), INDEX);
});

test('sitemap y robots', () => {
  const xml = renderSitemap(['https://elimarganda.com/', 'https://elimarganda.com/a&b/'], '2026-11-14');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.equal(xml.match(/<url>/g).length, 2);
  assert.match(xml, /a&amp;b/);
  const robots = renderRobots('https://elimarganda.com/', ROBOTS_DISALLOW);
  assert.match(robots, /^User-agent: \*/);
  assert.match(robots, /Disallow: \/media\/control/);
  assert.match(robots, /Sitemap: https:\/\/elimarganda.com\/sitemap.xml/);
  // Las páginas noindex deben poder rastrearse (si no, Google no lee su noindex).
  for (const page of ROUTE_PAGES.filter((p) => p.noindex)) {
    assert.ok(!ROBOTS_DISALLOW.includes(`/${page.path}`), page.path);
  }
});

test('JSON-LD con los datos de church.config.ts', () => {
  const church = readChurchData(config);
  assert.match(church.address, /28500 Arganda del Rey/);
  assert.ok(church.sameAs.length >= 3);
  assert.ok(church.sameAs.every((url) => !url.includes('tineret')));
  const data = churchJsonLd({
    publicUrl: 'https://elimarganda.com/',
    church,
    siteName: 'Biserica Elim Arganda',
    altNames: ['Iglesia Elim Arganda'],
    description: 'd',
  });
  const org = data['@graph'][1];
  assert.deepEqual(org['@type'], ['Church', 'Organization']);
  assert.equal(org.address.postalCode, '28500');
  assert.equal(org.address.addressLocality, 'Arganda del Rey');
  assert.ok(existsSync('src/assets/pwa/icon-any-512.png'));
  const html = injectJsonLd(INDEX, { a: '</script>' });
  assert.ok(html.includes('<script type="application/ld+json">{"a":"\\u003c/script>"}</script>\n</head>'));
});

test('updateNgswHash pone el SHA-1 del index.html modificado', () => {
  const manifest = { hashTable: { '/index.html': 'viejo', '/main.js': 'x' } };
  updateNgswHash(manifest, '/index.html', 'abc');
  assert.equal(manifest.hashTable['/index.html'], 'a9993e364706816aba3e25717850c26c9cd0d89d');
  assert.equal(manifest.hashTable['/main.js'], 'x');
  assert.throws(() => updateNgswHash({ hashTable: {} }, '/index.html', 'abc'));
});
