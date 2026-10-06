// Guardia de los enlaces de Drive de la galería (`mediaEvents` en
// `src/app/core/church.config.ts`).
//
//   npm run check:drive            → forma de los ID + cada carpeta existe y es
//                                    pública (pide la página sin sesión: 200 y
//                                    título de carpeta). Necesita red.
//   node scripts/check-drive-links.mjs --offline
//                                  → sólo la forma de los ID y que no se
//                                    repitan. Va dentro de `npm run check`
//                                    (prebuild y CI), que no debe depender de
//                                    la red ni de Drive.
//
// En la web un ID que falta o no es válido cae a la carpeta principal
// (`driveFolderUrl()` en `core/util/drive-folder.ts`), así que el botón nunca
// queda roto; este script avisa para que se arregle el dato.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, 'src/app/core/church.config.ts');
const OFFLINE = process.argv.includes('--offline');

// Misma regla que `core/util/drive-folder.ts`.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

const source = readFileSync(CONFIG, 'utf8');

const rootMatch = source.match(/mediaGalleryUrl:\s*'([^']+)'/);
const rootId = rootMatch?.[1].match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] ?? null;

const block = source.slice(source.indexOf('mediaEvents: ['));
const end = block.indexOf('\n  ],');
const eventsSrc = end > 0 ? block.slice(0, end) : block;

/** `{ id, folderId }` de cada evento (en orden). */
const events = [...eventsSrc.matchAll(/\bid:\s*'([^']+)'([\s\S]*?)(?=\n\s*\{\s*\n\s*id:|$)/g)].map(
  ([, id, body]) => ({ id, folderId: body.match(/driveFolderId:\s*'([^']*)'/)?.[1] ?? null }),
);

const errors = [];
const warnings = [];

if (!rootId || !DRIVE_ID.test(rootId)) {
  errors.push('mediaGalleryUrl no es una carpeta de Drive válida (es el respaldo de todos).');
}

const seen = new Map();
for (const ev of events) {
  if (ev.folderId === null) {
    warnings.push(`${ev.id}: sin driveFolderId → abrirá la carpeta principal.`);
    continue;
  }
  if (!DRIVE_ID.test(ev.folderId)) {
    errors.push(`${ev.id}: driveFolderId «${ev.folderId}» no tiene forma de ID de Drive.`);
    continue;
  }
  if (ev.folderId === rootId) {
    warnings.push(`${ev.id}: apunta a la carpeta principal, no a la del evento.`);
  }
  if (seen.has(ev.folderId)) {
    errors.push(`${ev.id}: misma carpeta que ${seen.get(ev.folderId)}.`);
  }
  seen.set(ev.folderId, ev.id);
}

if (!OFFLINE) {
  const targets = [
    ...(rootId ? [{ id: 'mediaGalleryUrl', folderId: rootId }] : []),
    ...events.filter((e) => e.folderId && DRIVE_ID.test(e.folderId)),
  ];
  for (const t of targets) {
    const url = `https://drive.google.com/drive/folders/${t.folderId}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const html = await res.text();
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
      // Sin acceso, Drive responde 200 pero con la página de inicio de sesión.
      const ok = res.ok && / - Google Drive$/.test(title) && !/accounts\.google\.com/.test(res.url);
      if (ok) console.log(`  ✓ ${t.id} → ${title.replace(/ - Google Drive$/, '')}`);
      else errors.push(`${t.id}: ${url} no es pública o no existe (HTTP ${res.status}, «${title}»).`);
    } catch (err) {
      errors.push(`${t.id}: no se pudo comprobar ${url} (${err.message}).`);
    }
  }
}

for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`check:drive — ${errors.length} error(es).`);
  process.exit(1);
}
console.log(`check:drive — ${events.length} eventos OK${OFFLINE ? ' (sin red)' : ''}.`);
