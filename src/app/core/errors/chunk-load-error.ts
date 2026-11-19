/**
 * Cómo dice cada motor «no he podido traer un módulo diferido». No hay un tipo
 * de error común: sólo el mensaje.
 *
 *  · Chromium: `Failed to fetch dynamically imported module: <url>`
 *  · Firefox:  `error loading dynamically imported module: <url>`
 *  · Safari:   `Importing a module script failed.`
 *  · Angular (NG0750): un `@defer` sin bloque `@error` cuyo chunk no llega.
 */
const CHUNK_ERROR_PATTERNS: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /NG0750|Loading dependencies for `@defer` block failed/i,
];

/** Profundidad máxima al seguir `cause` / `rejection`: basta para los envoltorios de Angular. */
const MAX_CAUSE_DEPTH = 4;

/**
 * ¿El error es un chunk (ruta perezosa, `@defer`, paquete de idioma) que no se
 * ha podido descargar?
 *
 * Pasa, sobre todo, tras un despliegue: cada publicación sustituye el sitio
 * entero, así que una pestaña con la versión anterior pide ficheros con un
 * hash que ya no existe. El remedio es una carga completa (ver
 * `StaleBuildRecovery`), no un reintento.
 */
export function isChunkLoadError(error: unknown, depth = 0): boolean {
  if (error === null || error === undefined || depth > MAX_CAUSE_DEPTH) return false;
  const message = typeof error === 'string' ? error : (error as { message?: unknown }).message;
  if (typeof message === 'string' && CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }
  if (typeof error !== 'object') return false;
  // `unhandledrejection` envuelve el motivo en `rejection`; `Error`, en `cause`.
  const wrapped = error as { cause?: unknown; rejection?: unknown };
  return isChunkLoadError(wrapped.cause, depth + 1) || isChunkLoadError(wrapped.rejection, depth + 1);
}
