// Tests del generador de páginas estáticas por ruta.
// Uso: node --test scripts/   (o `npm run test:scripts`)
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { ROUTE_PAGES, escapeAttr, renderRoutePage, upsertMeta } from './generate-route-pages.mjs';

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
