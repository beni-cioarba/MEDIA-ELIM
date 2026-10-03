#!/usr/bin/env node
/**
 * PDF de «Rugăciune pentru familii»: un documento por semana, para que quien
 * quiera lo descargue desde la web («Descarcă PDF»).
 *
 *   Página 1  → el resumen (collage de fotos + lista de familias).
 *   Página 2… → una ficha por familia, en el orden del resumen.
 *
 * ── Cómo (y por qué así) ──────────────────────────────────────────────
 * El PDF **no se diseña aparte**: cada página es la diapositiva que ya se
 * proyecta en el templo, abierta en la vista fija del escenario
 * (`/media/ecran?rol=solo&familii=<domingo>&pagina=<n>`) e impresa por un
 * Chrome/Edge sin interfaz a 16:9. Mismo renderizador, mismas fotos, misma
 * tipografía: si cambia el diseño de la proyección, el PDF cambia con él.
 * El texto sale **vectorial** (nítido a cualquier zoom y seleccionable).
 * Después `pdf-lib` une las páginas, se recomprimen las imágenes (ver
 * `compressImages`) y se ponen los metadatos.
 *
 * Se ejecuta en el despliegue (GitHub Actions) sobre la web recién
 * compilada, así que en GitHub Pages los PDF son ficheros estáticos más:
 *   assets/family-prayer/<domingo>/rugaciune-pentru-familii-<domingo>.pdf
 *   assets/family-prayer/pdf.json   ← qué semanas tienen PDF (lo lee la web)
 * La web sólo enseña «Descarcă PDF» en las semanas del manifiesto: nunca hay
 * un enlace roto, ni en local ni si este paso fallara en el despliegue.
 *
 * Navegador: el Chrome o Edge **ya instalado** (`playwright-core`, sin
 * descargar navegadores). En los runners de GitHub viene Chrome.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 *   # Sobre una compilación (lo que hace el despliegue; el `base href` se
 *   # lee de su index.html):
 *   node scripts/generate-family-pdfs.mjs --dist dist/iglesia-redes/browser
 *
 *   # En local, con `ng serve` en marcha: deja los PDF en src/assets/ (ignorados
 *   # por git); reiniciando `ng serve` la web local enseña «Descarcă PDF»:
 *   npm run pdf:familii -- --url http://localhost:4310/
 *
 * Opciones: --weeks 2026-09-27,2026-10-04 (sólo esas; el resto del manifiesto
 *           se conserva) · --out <carpeta> · --browser chrome|msedge (por
 *           defecto: $PDF_BROWSER, chrome, msedge)
 */

import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';

const CONFIG = 'src/app/core/family-prayer.config.ts';
/** Lienzo de la proyección: 1080p, el mismo para el que se mide `--pj-u`. */
const VIEWPORT = { width: 1920, height: 1080 };
const FILE_PREFIX = 'rugaciune-pentru-familii';
const MANIFEST = 'pdf.json';

/**
 * Recompresión de imágenes (ver `compressImages`). Chrome incrusta las fotos
 * WebP **sin pérdida** y los fondos difuminados como mapas de bits enormes:
 * la primera prueba dio 32-47 MB por semana.
 *   · Fotos (llevan perfil ICC: son las originales): **máxima calidad** —
 *     sin reducir (la mayor variante publicada es de 1600 px) y JPEG q92,
 *     visualmente sin pérdida—. Revisión del 03/10/2026, pedida por el
 *     usuario («las imágenes se deberían ver de la mejor calidad»).
 *   · Mapas de bits de Chrome (DeviceRGB: los fondos difuminados que rellenan
 *     el marco alrededor de la foto): ≤ 1200 px, q80; ya son borrosos y más
 *     resolución sólo pesaría (por debajo aparecían bandas en los degradados).
 * El texto no se toca: sigue vectorial.
 */
const PHOTO = { maxSide: 2400, quality: 92 };
const RASTER = { maxSide: 1200, quality: 80 };
/**
 * Densidad de impresión: a 3× el navegador elige de cada `srcset` la foto de
 * 1600 px en todas las páginas (a 1× el collage cogía la de 960, y a 2× las
 * verticales del collage seguían en 960). El texto es vectorial y no cambia;
 * sólo sube la resolución de las imágenes.
 */
const DEVICE_SCALE = 3;

const args = parseArgs(process.argv.slice(2));

// ── Semanas ─────────────────────────────────────────────────────────────
// Se leen del fichero de datos (no hay otra fuente estática). Sólo hace falta
// el domingo de cada semana: el resto lo pinta la propia app.
const config = await readFile(CONFIG, 'utf8');
const allWeeks = [...config.matchAll(/presentedOn:\s*'(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]);
const weeks = args.weeks ? allWeeks.filter((w) => args.weeks.includes(w)) : allWeeks;
if (weeks.length === 0) {
  console.log('Sin semanas de familias: nada que generar.');
  process.exit(0);
}

// ── Origen de las páginas ───────────────────────────────────────────────
let server = null;
let origin;
let outDir;
if (args.url) {
  origin = args.url.endsWith('/') ? args.url : `${args.url}/`;
  // Junto a los assets que sirve `ng serve`: así la web local enseña el
  // botón igual que la publicada. Ignorados por git (no se suben nunca: en
  // GitHub Pages los genera el despliegue).
  outDir = resolve(args.out ?? 'src/assets/family-prayer');
} else if (args.dist) {
  // El `base href` se lee de la propia compilación: así no puede discrepar
  // (y no hay que pasarlo: Git Bash convierte un «/» suelto en una ruta de
  // Windows). `--base` queda como forzado manual.
  const base = normalizeBase(args.base ?? (await baseHrefOf(resolve(args.dist))));
  ({ server, origin } = await serveStatic(resolve(args.dist), base));
  outDir = resolve(args.out ?? join(args.dist, 'assets', 'family-prayer'));
} else {
  fail('Falta --dist <carpeta compilada> o --url <servidor en marcha>.');
}

const browser = await launchBrowser(args.browser);
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE,
  // El contenido es rumano y la interfaz también tiene que serlo.
  locale: 'ro-RO',
  // Sin service worker: cada página se sirve tal cual está en disco.
  serviceWorkers: 'block',
});
await context.addInitScript(() => {
  try {
    localStorage.setItem('iglesia-redes.lang', 'ro');
  } catch {
    /* almacenamiento bloqueado: manda la configuración regional */
  }
});
const page = await context.newPage();
await page.emulateMedia({ media: 'screen' });
// Errores de la página: si una semana falla, se cuentan en el mensaje (en el
// despliegue no hay otra forma de saber qué pasó).
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => pageErrors.push(`no cargó ${request.url()}`));
page.on('response', (response) => {
  if (response.status() >= 400) pageErrors.push(`HTTP ${response.status()} ${response.url()}`);
});

// Con `--weeks` se regeneran sólo esas: el resto del manifiesto se conserva
// (si no, regenerar una semana borraba las demás de la web).
const previous = args.weeks ? await readManifest(join(outDir, MANIFEST)) : [];
const manifest = {
  generatedAt: new Date().toISOString(),
  weeks: previous.filter((entry) => !weeks.includes(entry.presentedOn) && allWeeks.includes(entry.presentedOn)),
};
let failures = 0;

for (const week of weeks) {
  try {
    const entry = await withRetry(() => buildWeek(week));
    manifest.weeks.push(entry);
    console.log(`✓ ${week}: ${entry.pages} páginas · ${(entry.bytes / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    failures++;
    console.error(`✗ ${week}: ${firstLine(error)}`);
    for (const detail of [...new Set(pageErrors)].slice(0, 8)) console.error(`    · ${detail}`);
  }
  pageErrors.length = 0;
}

// Más reciente primero: es el orden en el que se consulta.
manifest.weeks.sort((a, b) => b.presentedOn.localeCompare(a.presentedOn));
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);

await browser.close();
server?.close();
console.log(`Manifiesto: ${join(outDir, MANIFEST)} (${manifest.weeks.length} semanas)`);
process.exit(failures > 0 ? 1 : 0);

// ═════════════════════════════════════════════════════════════════════════

/**
 * Un segundo intento antes de dar la semana por perdida: contra `ng serve`
 * una recarga en caliente a mitad de semana destruye la página («Execution
 * context was destroyed») y no es un fallo de verdad.
 */
async function withRetry(task) {
  try {
    return await task();
  } catch (error) {
    pageErrors.length = 0;
    console.warn(`  reintento: ${firstLine(error)}`);
    return task();
  }
}

/** Primera línea del mensaje (los de Playwright traen el registro detrás). */
function firstLine(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.match(/^.*/)?.[0] ?? text;
}

async function readManifest(path) {
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return Array.isArray(data.weeks) ? data.weeks : [];
  } catch {
    return [];
  }
}

/** Imprime las páginas de una semana, las une y escribe el PDF. */
async function buildWeek(week) {
  await openSlide(week, 0);
  const total = Number(await page.locator('.stage').getAttribute('data-solo-pages'));
  if (!Number.isInteger(total) || total < 1) throw new Error('la app no reconoce la semana');

  const merged = await PDFDocument.create();
  for (let n = 0; n < total; n++) {
    if (n > 0) await openSlide(week, n);
    const single = await PDFDocument.load(
      await page.pdf({
        width: `${VIEWPORT.width}px`,
        height: `${VIEWPORT.height}px`,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        pageRanges: '1',
      }),
    );
    const [copied] = await merged.copyPages(single, [0]);
    merged.addPage(copied);
  }

  const saved = await compressImages(merged);
  const range = formatRange(week);
  merged.setTitle(`Rugăciune pentru familii · ${range}`);
  merged.setSubject(`Familiile pentru care ne rugăm în săptămâna ${range}`);
  merged.setAuthor('Biserica Elim · Arganda del Rey');
  merged.setKeywords(['rugăciune', 'familii', 'Biserica Elim', week]);
  merged.setCreator('iglesia-redes');
  merged.setProducer('iglesia-redes · generate-family-pdfs');
  merged.setLanguage('ro');
  merged.setCreationDate(new Date());

  const bytes = await merged.save({ useObjectStreams: true });
  if (saved > 0) console.log(`  imágenes recomprimidas: −${(saved / 1024 / 1024).toFixed(1)} MB`);
  const dir = join(outDir, week);
  await mkdir(dir, { recursive: true });
  const name = `${FILE_PREFIX}-${week}.pdf`;
  await writeFile(join(dir, name), bytes);

  return {
    presentedOn: week,
    // Relativa a la raíz de la app: la web la resuelve contra su `base href`.
    file: `assets/family-prayer/${week}/${name}`,
    pages: total,
    bytes: bytes.length,
  };
}

/**
 * Pasa a JPEG las imágenes RGB de 8 bits comprimidas sin pérdida (Flate) y
 * reduce las que exceden lo que la página puede mostrar. Las máscaras de
 * transparencia (`SMask`, en gris) se quedan como están: son pequeñas y un
 * JPEG les metería artefactos en los bordes. Devuelve los bytes ahorrados.
 */
async function compressImages(doc) {
  const context = doc.context;
  let saved = 0;
  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const dict = object.dict;
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
    if (dict.get(PDFName.of('Filter')) !== PDFName.of('FlateDecode')) continue;
    if (dict.get(PDFName.of('DecodeParms')) !== undefined) continue;
    if (numberOf(dict, 'BitsPerComponent') !== 8) continue;

    const width = numberOf(dict, 'Width');
    const height = numberOf(dict, 'Height');
    const isDeviceRgb = dict.get(PDFName.of('ColorSpace')) === PDFName.of('DeviceRGB');
    const raw = inflateSync(object.contents);
    // Sólo RGB (3 canales). Gris (máscaras) y otros espacios, intactos.
    if (raw.length !== width * height * 3) continue;

    const { maxSide, quality } = isDeviceRgb ? RASTER : PHOTO;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const jpeg = await sharp(raw, { raw: { width, height, channels: 3 } })
      .resize(outW, outH, { kernel: 'lanczos3' })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    if (jpeg.length >= object.contents.length) continue;

    const next = dict.clone(context);
    next.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
    next.set(PDFName.of('Width'), PDFNumber.of(outW));
    next.set(PDFName.of('Height'), PDFNumber.of(outH));
    next.set(PDFName.of('Length'), PDFNumber.of(jpeg.length));
    context.assign(ref, PDFRawStream.of(next, jpeg));
    saved += object.contents.length - jpeg.length;
  }
  return saved;
}

function numberOf(dict, key) {
  const value = dict.get(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : NaN;
}

/** Abre la diapositiva n de la semana y espera a que esté entera. */
async function openSlide(week, n) {
  await page.goto(`${origin}media/ecran?rol=solo&familii=${week}&pagina=${n}`, { waitUntil: 'load' });
  await page.waitForSelector('.slide--active', { timeout: 30_000 });
  // Sin transiciones: se imprime el estado final, no un fotograma de la entrada.
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? img.decode().catch(() => undefined)
          : new Promise((done) => {
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }),
      ),
    );
    // Dos fotogramas: el autoajuste del texto (FitToBox) mide y se asienta.
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  await page.waitForTimeout(250);
}

/**
 * «27 septembrie – 3 octombrie 2026»: de domingo (el día en que se presenta) a
 * sábado, la misma regla que `FamilyPrayerService`.
 */
function formatRange(presentedOn) {
  const start = new Date(`${presentedOn}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return new Intl.DateTimeFormat('ro', { day: 'numeric', month: 'long', year: 'numeric' }).formatRange(start, end);
}

async function launchBrowser(preferred) {
  const channels = [preferred ?? process.env.PDF_BROWSER, 'chrome', 'msedge'].filter(Boolean);
  for (const channel of [...new Set(channels)]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* ese canal no está instalado: el siguiente */
    }
  }
  fail(`No hay Chrome ni Edge instalado (probados: ${channels.join(', ')}).`);
}

/**
 * Servidor estático mínimo de la compilación, con el mismo `base href` que
 * GitHub Pages y su misma regla para rutas de la app (sin extensión → la
 * `index.html`, como hace el `404.html` en Pages).
 */
async function serveStatic(root, base) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
  };
  const srv = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (!path.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    path = path.slice(base.length);
    let file = normalize(join(root, path));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    const isFile = await stat(file).then((s) => s.isFile()).catch(() => false);
    if (!isFile) {
      if (extname(path)) {
        res.writeHead(404).end();
        return;
      }
      file = join(root, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  await new Promise((done) => srv.listen(0, '127.0.0.1', done));
  const { port } = srv.address();
  return { server: srv, origin: `http://127.0.0.1:${port}${base}` };
}

async function baseHrefOf(dist) {
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  return /<base\s+href="([^"]*)"/i.exec(html)?.[1] ?? '/';
}

function normalizeBase(base) {
  let b = base.startsWith('/') ? base : `/${base}`;
  if (!b.endsWith('/')) b += '/';
  return b;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    if (!key || value === undefined) continue;
    out[key] = key === 'weeks' ? value.split(',').map((w) => w.trim()) : value;
    i++;
  }
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
