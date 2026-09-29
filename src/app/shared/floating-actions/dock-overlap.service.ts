import { Injectable, computed, signal } from '@angular/core';

/**
 * Coordina el dock flotante con los bloques que **repiten sus acciones**
 * (hoy, el pie): mientras alguno está en pantalla, el dock se esconde para no
 * ofrecer dos veces «volver arriba» / «compartir» ni tapar el pie.
 *
 * Es el bloque quien informa de su visibilidad (y no el dock quien lo busca
 * en el DOM): el pie entra con `@defer (on viewport)` y buscarlo con un
 * temporizador fallaba si aún no se había cargado. Mismo patrón que la app
 * de Administrativ.
 */
@Injectable({ providedIn: 'root' })
export class DockOverlapService {
  private readonly visibleSources = signal<ReadonlySet<string>>(new Set());

  /** Algún bloque con las mismas acciones está en el viewport. */
  readonly duplicateVisible = computed(() => this.visibleSources().size > 0);

  /** Cada bloque informa con un id propio (`'footer'`, …). */
  report(source: string, visible: boolean): void {
    const next = new Set(this.visibleSources());
    if (visible) next.add(source);
    else next.delete(source);
    this.visibleSources.set(next);
  }
}
