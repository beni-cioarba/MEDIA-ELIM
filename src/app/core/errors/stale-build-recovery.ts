import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { claimAutoReload } from '../util/auto-reload';

/**
 * Sale de una versión caducada con una **carga completa**.
 *
 * Cuando un chunk ya no existe (ver `isChunkLoadError`), reintentar no sirve:
 * el `index.html` que tiene la pestaña apunta a ficheros borrados. Una carga
 * completa trae el `index.html` nuevo y, con él, los nombres buenos.
 *
 * Reglas:
 *  · Una sola vez por minuto (`claimAutoReload`, el mismo tope que las
 *    actualizaciones de la PWA): si tras recargar sigue fallando, no es una
 *    versión caducada y recargar otra vez sólo molestaría.
 *  · Nunca sin red: sin service worker, recargar sin conexión cambia una
 *    página que funciona a medias por la pantalla de error del navegador.
 *
 * No depende del `Router` a propósito: lo usa el `ErrorHandler`, que Angular
 * crea antes que nada, y el `Router` depende de él.
 */
@Injectable({ providedIn: 'root' })
export class StaleBuildRecovery {
  private readonly document = inject(DOCUMENT);

  /**
   * Carga `url` entera (o recarga la página actual si no se da). Devuelve
   * `true` si la carga se ha lanzado.
   */
  reload(url?: string): boolean {
    const view = this.document.defaultView;
    if (!view || view.navigator.onLine === false) return false;
    if (!claimAutoReload(this.document)) return false;
    if (url) this.document.location.assign(url);
    else this.document.location.reload();
    return true;
  }
}
