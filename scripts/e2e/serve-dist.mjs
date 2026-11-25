/**
 * Sirve una compilación **como la sirve GitHub Pages**, para probarla antes de
 * publicarla.
 *
 * No vale un servidor estático cualquiera: lo que se quiere comprobar es
 * justo lo que GitHub Pages hace distinto de `ng serve`:
 *   · `/ruta/` → `ruta/index.html` con 200;
 *   · `/ruta` (carpeta, sin barra) → 301 a `/ruta/`;
 *   · lo que no existe → `404.html` **con estado 404** (la app arranca igual,
 *     pero un robot o la tarjeta de WhatsApp ven un error).
 *
 * Uso:
 *   import { serveDist } from './serve-dist.mjs';
 *   const { origin, close } = await serveDist('dist/iglesia-redes/browser');
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ics': 'text/calendar; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
};

const isFile = (path) => stat(path).then((s) => s.isFile(), () => false);
const isDir = (path) => stat(path).then((s) => s.isDirectory(), () => false);

/**
 * @param {string} dist  Carpeta `browser` de la compilación.
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
export async function serveDist(dist) {
  const root = resolve(dist);
  const notFound = await readFile(join(root, '404.html')).catch(() => null);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const target = normalize(join(root, pathname));
      // Nada fuera de la carpeta servida.
      if (target !== root && !target.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }

      if (await isDir(target)) {
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
          return;
        }
        const index = join(target, 'index.html');
        if (await isFile(index)) return send(res, 200, index);
      } else if (await isFile(target)) {
        return send(res, 200, target);
      }

      // Como GitHub Pages: la página de error, con su estado.
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(notFound ?? 'Not found');
    } catch {
      res.writeHead(500).end();
    }
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return {
    origin: `http://127.0.0.1:${port}`,
    // `server.close()` espera a las conexiones abiertas: un navegador muerto a
    // medias lo dejaría esperando para siempre. Se cortan antes.
    close: () =>
      new Promise((done) => {
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
