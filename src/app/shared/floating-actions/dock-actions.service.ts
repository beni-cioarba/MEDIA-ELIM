import { Injectable, Signal, signal } from '@angular/core';

/** Una acción que una página aporta al dock flotante. */
export interface DockAction {
  readonly id: string;
  /** Clave i18n del rótulo (va en `aria-label` y en el `title`). */
  readonly labelKey: string;
  /** Trazado del icono, en el lienzo 24×24 que usa el resto del dock. */
  readonly svgPath: string;
  /** Estado del conmutador, si la acción lo es (pinta `aria-pressed`). */
  readonly pressed?: Signal<boolean>;
  /**
   * Sólo mientras la página va en disposición compacta (por debajo de
   * 1280 px). Es lo normal para una acción de página: en cuanto la página
   * recupera el sitio para enseñar sus propios controles, un botón más en el
   * dock sería ruido.
   */
  readonly compactOnly?: boolean;
  readonly run: () => void;
}

/**
 * Acciones que una página aporta al dock flotante.
 *
 * ── Por qué un servicio y no proyección de contenido ──────────────────
 * El dock (`app-floating-actions`) vive en el layout, no dentro de la página
 * enrutada, así que una página **no puede** proyectarle nada ni pasarle un
 * `@Input`: no es su padre. Un servicio con una señal es el único camino
 * directo, y además deja el dock sin saber nada de ninguna página concreta:
 * pinta lo que haya en la lista.
 *
 * ── Cuándo usarlo ─────────────────────────────────────────────────────
 * Cuando una página tiene controles propios que en el teléfono quedan fuera
 * de alcance en cuanto se baja —el caso de la confesión de fe: buscador,
 * desplegar todo e índice—. En vez de plantar otra barra fija (que roba una
 * franja de pantalla para siempre), la página mete **un** botón en el dock
 * que ya existe y desde ahí abre lo suyo. Es la forma más comprimida: cero
 * píxeles permanentes.
 *
 * La página registra al entrar y **limpia al salir** (`DestroyRef`), o sus
 * botones se quedarían en el dock del resto del sitio.
 */
@Injectable({ providedIn: 'root' })
export class DockActionsService {
  private readonly lista = signal<readonly DockAction[]>([]);

  /** Lo que el dock pinta. */
  readonly actions = this.lista.asReadonly();

  set(actions: readonly DockAction[]): void {
    this.lista.set(actions);
  }

  clear(): void {
    this.lista.set([]);
  }
}
