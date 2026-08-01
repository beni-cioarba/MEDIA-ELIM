import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';

/**
 * `UiStore` — estado de la **capa de chrome** (cabecera, menús, drawer).
 *
 * ── Por qué NgRx SignalStore y no NgRx Store clásico ──────────────────
 * El "Redux clásico" (`Store` + acciones + reducers + efectos + selectores)
 * resuelve un problema que esta app no tiene: no hay estado de servidor
 * compartido entre decenas de pantallas, ni time-travel debugging, ni
 * equipos grandes pisándose. Añadirlo costaría ~35 kB y multiplicaría por
 * cinco el código para el mismo resultado.
 *
 * `@ngrx/signals` (≈4 kB) da lo que sí aporta valor y encaja con la
 * arquitectura de signals que ya usa el proyecto:
 *  · Estado **inmutable** y centralizado (`patchState`, nunca `.set()` suelto).
 *  · Derivadas memoizadas (`withComputed`).
 *  · Mutaciones **con nombre** (`withMethods`) → trazables y testeables.
 *  · Composición por *features* (`withEntities`, `withHooks`) cuando llegue
 *    la biblioteca de predicaciones o el calendario completo.
 *
 * ── Cuándo crear un store y cuándo no ─────────────────────────────────
 *  · Estado **local de un componente** → `signal()` en el propio componente.
 *  · Estado **compartido y simple** (idioma, reloj) → servicio con signals.
 *  · Estado **compartido con varias transiciones y derivadas** → SignalStore.
 * Ver `docs/ai/16-state.md`.
 */

interface UiState {
  /** Menú lateral móvil abierto. */
  readonly drawerOpen: boolean;
  /** Id del grupo de navegación desplegado en escritorio (`null` = ninguno). */
  readonly openGroup: string | null;
  /** La página ha bajado del umbral: la cabecera pasa a opaca. */
  readonly scrolled: boolean;
}

const initialState: UiState = {
  drawerOpen: false,
  openGroup: null,
  scrolled: false,
};

/** Píxeles de scroll a partir de los cuales la cabecera se vuelve sólida. */
const SCROLL_THRESHOLD = 12;

export const UiStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ drawerOpen, openGroup }) => ({
    /** Hay algún panel de navegación abierto (bloquea el scroll del body). */
    anyMenuOpen: computed(() => drawerOpen() || openGroup() !== null),
  })),
  withMethods((store) => ({
    openDrawer(): void {
      patchState(store, { drawerOpen: true, openGroup: null });
    },
    closeDrawer(): void {
      patchState(store, { drawerOpen: false });
    },
    toggleDrawer(): void {
      patchState(store, (s) => ({ drawerOpen: !s.drawerOpen, openGroup: null }));
    },
    /** Abre un grupo del menú; volver a pulsarlo lo cierra. */
    toggleGroup(id: string): void {
      patchState(store, (s) => ({ openGroup: s.openGroup === id ? null : id }));
    },
    /** Cierra todo: se llama en cada `NavigationEnd` y con `Escape`. */
    closeAll(): void {
      patchState(store, { drawerOpen: false, openGroup: null });
    },
    setScrollY(y: number): void {
      const next = y > SCROLL_THRESHOLD;
      if (next !== store.scrolled()) patchState(store, { scrolled: next });
    },
  })),
);
