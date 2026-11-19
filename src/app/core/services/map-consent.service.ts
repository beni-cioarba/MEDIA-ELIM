import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'iglesia-redes.harta.acord';

/**
 * «Enséñame el mapa»: la elección del visitante de cargar Google Maps.
 *
 * El mapa incrustado es un servicio de un tercero: al cargarlo, Google recibe
 * la IP del visitante y puede dejar sus cookies. Por eso **no se carga solo**
 * en ninguna página: `MapEmbedComponent` enseña la dirección y un botón, y
 * sólo al pulsarlo pide el mapa.
 *
 * La elección se recuerda en este navegador (`localStorage`) para no volver a
 * preguntarla en cada página —quien dijo que sí en Contact no tiene por qué
 * repetirlo en Invitați—, y se puede retirar desde la página legal.
 */
@Injectable({ providedIn: 'root' })
export class MapConsentService {
  private readonly _allowed = signal(this.read());

  /** El visitante ha pedido ver el mapa (ahora o en una visita anterior). */
  readonly allowed = this._allowed.asReadonly();

  allow(): void {
    this._allowed.set(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* almacenamiento bloqueado: vale para esta visita */
    }
  }

  /** Vuelve al estado inicial: los mapas dejan de cargarse solos. */
  revoke(): void {
    this._allowed.set(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada que borrar */
    }
  }

  private read(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
