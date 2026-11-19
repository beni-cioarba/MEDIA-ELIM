import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/** Tope de espera al reposo del navegador antes de precargar igualmente. */
const IDLE_TIMEOUT_MS = 4_000;
/** Donde no hay `requestIdleCallback` (Safari): espera fija tras la navegación. */
const IDLE_FALLBACK_MS = 2_000;

/** `navigator.connection` no está en los tipos del DOM (sólo Chromium lo trae). */
interface NetworkHint {
  readonly saveData?: boolean;
}

/**
 * Precarga de rutas perezosas tras el primer pintado.
 *
 * Sustituye a `PreloadAllModules` con tres diferencias:
 *
 *  1. **Las herramientas del operador no se precargan** (`data.preload: false`
 *     en la ruta: panel de control, ventana de proyección, hojas de imprimir,
 *     guía de estilos). Un visitante no las abre nunca y sumaban ~180 kB a la
 *     ráfaga de cada primera visita. Siguen llegando a la caché con el service
 *     worker, que precachea la app entera, así que en el templo abren igual
 *     sin red.
 *  2. **Espera al reposo del navegador**: antes competía con la foto del hero
 *     y las fuentes justo cuando más falta hacen.
 *  3. **Respeta «Ahorro de datos»** (`navigator.connection.saveData`): quien
 *     lo tiene activado sólo descarga las páginas que abre.
 *
 * Por qué se sigue precargando lo demás: con el portátil del templo la
 * navegación tiene que ser instantánea, y un chunk ya descargado no puede
 * fallar a mitad de culto.
 */
@Injectable({ providedIn: 'root' })
export class PublicPreloadingStrategy implements PreloadingStrategy {
  private readonly view = inject(DOCUMENT).defaultView;

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === false || this.saveData()) return of(null);
    return new Observable((subscriber) => {
      const start = () => load().subscribe(subscriber);
      const view = this.view;
      if (!view) {
        start();
        return undefined;
      }
      if (typeof view.requestIdleCallback === 'function') {
        const id = view.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
        return () => view.cancelIdleCallback(id);
      }
      const id = view.setTimeout(start, IDLE_FALLBACK_MS);
      return () => view.clearTimeout(id);
    });
  }

  private saveData(): boolean {
    const connection = (this.view?.navigator as (Navigator & { connection?: NetworkHint }) | undefined)?.connection;
    return connection?.saveData === true;
  }
}
