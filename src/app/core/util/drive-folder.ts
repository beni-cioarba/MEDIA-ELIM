/**
 * Enlaces a carpetas públicas de Google Drive (galería de Media).
 *
 * Los datos guardan sólo el **ID** de la carpeta, nunca una URL libre: así no
 * puede colarse otro dominio, un `javascript:` ni un enlace mal pegado. La URL
 * se construye aquí, siempre `https://drive.google.com/drive/folders/<id>`.
 *
 * Si el ID falta o no tiene forma de ID de Drive, se devuelve la carpeta
 * principal: el botón nunca queda roto ni apunta a otra parte. Que una
 * carpeta exista y sea pública lo comprueba `npm run check:drive` (en línea),
 * porque desde el navegador no se puede saber (Drive no permite CORS).
 * Ver `docs/ai/20-content-i18n.md` → «Añadir un evento a la galería».
 */

/** Forma de un ID de carpeta de Drive: letras, cifras, `_` y `-` (≥ 10). */
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

const FOLDER_BASE = 'https://drive.google.com/drive/folders/';

export function isDriveFolderId(id: string | null | undefined): id is string {
  return typeof id === 'string' && DRIVE_ID.test(id);
}

/** URL pública de la carpeta, o `fallbackUrl` si el ID no es válido. */
export function driveFolderUrl(id: string | null | undefined, fallbackUrl: string): string {
  return isDriveFolderId(id) ? `${FOLDER_BASE}${id}` : fallbackUrl;
}
