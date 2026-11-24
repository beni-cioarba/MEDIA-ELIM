/**
 * Guarda de la instalación: manifiestos y láminas.
 *
 * Chrome descarta **sin avisar** una lámina que no existe, no mide lo que
 * dice, cambia de proporción o no es JPEG/PNG: la hoja «Instalar» saldría sin
 * imágenes y nadie lo vería hasta probarlo en un teléfono.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import sharp from 'sharp';
import { CHROME_LIMITS, LANGS, MAX_PLATE_BYTES, PLATES, SIZES, manifestFile, plateFile, renderManifest, sourceDigest } from './lib/install-media.mjs';
import { loadTsModule } from './lib/load-ts-module.mjs';

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const manifests = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(read(`src/${manifestFile(lang)}`))]));
const { PUBLIC_URL } = loadTsModule('src/app/core/site.ts');
const { WEEKLY_PROGRAM } = loadTsModule('src/app/core/content/weekly.content.ts');

const FORMATS = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

async function checkImage({ src, sizes, type }) {
  assert.ok(existsSync(`src/${src}`), `no existe src/${src}`);
  const { width, height, format } = await sharp(`src/${src}`).metadata();
  assert.equal(`${width}x${height}`, sizes, `${src} no mide lo que dice`);
  assert.equal(format, FORMATS[type], `${src} no es ${type}`);
  return { width, height };
}

for (const lang of LANGS) {
  test(`manifiesto ${lang}: es el que genera scripts/lib/install-media.mjs`, () => {
    assert.equal(
      read(`src/${manifestFile(lang)}`),
      renderManifest(lang, PUBLIC_URL),
      'Manifiesto tocado a mano o sin regenerar: npm run pwa:install',
    );
  });

  test(`manifiesto ${lang}: las láminas cumplen los límites de Chrome`, async () => {
    const { screenshots, description } = manifests[lang];
    assert.ok(description.length <= CHROME_LIMITS.descriptionLength, 'descripción demasiado larga');
    assert.ok(screenshots.length <= CHROME_LIMITS.maxCount, 'demasiadas láminas');
    const ratios = { narrow: new Set(), wide: new Set() };
    for (const shot of screenshots) {
      assert.ok(CHROME_LIMITS.types.includes(shot.type), `${shot.src}: formato no admitido`);
      assert.ok(shot.label?.trim(), `${shot.src}: sin texto alternativo`);
      const { width, height } = await checkImage(shot);
      const [short, long] = [Math.min(width, height), Math.max(width, height)];
      assert.ok(short >= CHROME_LIMITS.minSide && long <= CHROME_LIMITS.maxSide, `${shot.src}: tamaño`);
      assert.ok(long <= short * CHROME_LIMITS.maxRatio, `${shot.src}: proporción`);
      assert.equal(shot.form_factor, width < height ? 'narrow' : 'wide');
      assert.ok(statSync(`src/${shot.src}`).size <= MAX_PLATE_BYTES, `${shot.src}: pesa demasiado`);
      ratios[shot.form_factor].add(width / height);
    }
    for (const set of Object.values(ratios)) assert.equal(set.size, 1, 'misma proporción dentro de cada formato');
  });

  test(`manifiesto ${lang}: iconos y atajos existen y miden lo que dicen`, async () => {
    const { icons, shortcuts } = manifests[lang];
    for (const icon of [...icons, ...shortcuts.flatMap((s) => s.icons)]) await checkImage(icon);
    for (const size of ['192x192', '512x512']) assert.ok(icons.some((i) => i.sizes === size && i.purpose === 'any'));
    assert.ok(icons.some((i) => i.purpose === 'maskable'));
  });
}

test('los dos manifiestos describen la misma app', () => {
  // Con un nombre o un icono distinto, Android pediría aprobar un cambio de la
  // app instalada al alternar de idioma; con otro `id`, serían dos apps.
  const same = ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'theme_color', 'background_color', 'related_applications'];
  for (const key of same) assert.deepEqual(manifests.es[key], manifests.ro[key], key);
  assert.deepEqual(
    manifests.es.shortcuts.map((s) => s.url),
    manifests.ro.shortcuts.map((s) => s.url),
  );
  assert.deepEqual(manifests.ro.related_applications.map((app) => app.url), LANGS.map((l) => `${PUBLIC_URL}${manifestFile(l)}`));
});

test('las láminas pintan el horario y los textos de hoy', () => {
  const lock = JSON.parse(read('scripts/assets-src/install-media.lock.json'));
  assert.equal(lock.painted, sourceDigest(WEEKLY_PROGRAM), 'Horario o textos cambiados: npm run pwa:install');
});

test('la hoja propia enseña las láminas generadas, en los dos idiomas', async () => {
  const source = read('src/app/shared/install-app/install-sheet.component.ts');
  const list = /SHEET_PLATES = \[([^\]]+)\]/.exec(source)[1].match(/[a-z]+/g);
  assert.deepEqual(list, PLATES.map((plate) => plate.id));
  for (const lang of LANGS) {
    const texts = JSON.parse(read(`src/assets/i18n/install.${lang}.json`)).install;
    for (const [i, plate] of PLATES.entries()) {
      assert.ok(texts.plate[i].startsWith(plate.title[lang].join(' ')), `install.plate.${i} (${lang})`);
      const { width, height } = await sharp(`src/${plateFile(plate, lang, 'thumb')}`).metadata();
      assert.deepEqual({ width, height }, SIZES.thumb);
    }
    // Ni láminas viejas sin usar.
    const used = PLATES.flatMap((p) => ['narrow', 'thumb', ...(p.wide ? ['wide'] : [])].map((s) => plateFile(p, lang, s).split('/').pop()));
    assert.deepEqual(readdirSync(`src/assets/pwa/install/${lang}`).sort(), used.sort());
  }
});

test('el service worker guarda los dos manifiestos y ninguna lámina', () => {
  const { assetGroups } = JSON.parse(read('ngsw-config.json'));
  const files = assetGroups.flatMap((group) => group.resources.files);
  for (const lang of LANGS) assert.ok(files.includes(`/${manifestFile(lang)}`));
  assert.ok(files.includes('!/assets/pwa/install/**'));
  const angular = read('angular.json');
  for (const lang of LANGS) assert.ok(angular.includes(`"src/${manifestFile(lang)}"`));
});
