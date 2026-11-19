/** Dos recargas automáticas más juntas que esto = algo va mal: no se repite. */
const RELOAD_GUARD_MS = 60 * 1000;
const RELOAD_GUARD_KEY = 'elim.pwa-update.reloaded-at';

/**
 * Reserva **la** recarga automática de esta pestaña.
 *
 * Hay dos motivos para recargar solos —una versión nueva ya descargada
 * (`PwaUpdateService`) y un chunk que ya no existe en el servidor
 * (`StaleBuildRecovery`)— y los dos comparten este tope: si ya hubo otra
 * recarga hace menos de un minuto, la causa sigue ahí después de recargar y
 * se deja de insistir para no entrar en bucle; la pestaña sigue usable con lo
 * que tiene.
 *
 * Devuelve `true` si se puede recargar (y deja la marca puesta).
 */
export function claimAutoReload(document: Document): boolean {
  try {
    const storage = document.defaultView?.sessionStorage;
    if (!storage) return true;
    const last = Number(storage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    storage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* almacenamiento bloqueado: recargar igualmente es lo seguro */
  }
  return true;
}
