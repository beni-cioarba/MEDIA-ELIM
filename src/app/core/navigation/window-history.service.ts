import { DOCUMENT, Location } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { detectInstallEnvironment } from '../util/install-platform';
import { injectIsBrowser } from '../util/platform';

/**
 * Ventanas de app **sin ninguna flecha del navegador**. `minimal-ui` no está:
 * ahí las pone él, y dos juegos de flechas es peor que ninguno. `fullscreen`
 * tampoco: no es un tipo de ventana (F11, la proyección).
 */
const BARE_WINDOW_MODES = ['standalone', 'window-controls-overlay'];

/**
 * Atrás / adelante para la app instalada en **escritorio**: su ventana no
 * tiene barra de navegador. Decide si la cabecera las enseña y con qué.
 *
 *  - **Teléfono y tableta, nunca**: «atrás» es un gesto o un botón del sistema.
 *  - **Pestaña del navegador, nunca**: ya las tiene.
 *  - **Ventana recién abierta, todavía no**: no hay adónde ir. Salen con la
 *    primera navegación y se quedan; la que no tiene destino se atenúa.
 *
 * El historial lo dice la Navigation API, no una cuenta propia: sobrevive a
 * recargar, cuenta bien los `replaceUrl` y sólo ve las páginas de este sitio,
 * así que «atrás» nunca saca de la app. Sin ella (Safari < 26.2) no se ofrecen:
 * una flecha que no sabe si lleva a algún sitio no es de fiar.
 */
@Injectable({ providedIn: 'root' })
export class WindowHistoryService {
  private readonly location = inject(Location);
  private readonly window = injectIsBrowser() ? inject(DOCUMENT).defaultView : null;

  // La función pura y no `PwaInstallService`: esto va en el arranque y aquél
  // pregunta al navegador en cuanto existe.
  private readonly desktop =
    !!this.window &&
    detectInstallEnvironment(this.window.navigator.userAgent, this.window.navigator.maxTouchPoints)
      .device === 'desktop';
  private readonly bareWindow = signal(this.isBareWindow());
  private readonly backward = signal(false);
  private readonly onward = signal(false);

  readonly canGoBack = this.backward.asReadonly();
  readonly canGoForward = this.onward.asReadonly();

  /** ¿Se enseñan las flechas? */
  readonly visible = computed(
    () => this.desktop && this.bareWindow() && (this.canGoBack() || this.canGoForward()),
  );

  constructor() {
    const win = this.window;
    // El tipo de TypeScript la da por hecha; los navegadores, no todos.
    const navigation = win?.navigation as Navigation | undefined;
    if (!win || !navigation || !this.desktop) return;

    const events = new AbortController();
    inject(DestroyRef).onDestroy(() => events.abort());
    const until = { signal: events.signal };

    const read = (): void => {
      this.backward.set(navigation.canGoBack);
      this.onward.set(navigation.canGoForward);
    };
    read();
    navigation.addEventListener('currententrychange', read, until);
    // Vuelta desde otra página (caché de atrás/adelante del navegador).
    win.addEventListener('pageshow', read, until);

    // Instalar desde la pestaña la convierte en ventana de app sin recargar.
    for (const mode of BARE_WINDOW_MODES) {
      win.matchMedia?.(`(display-mode: ${mode})`).addEventListener?.(
        'change',
        () => {
          // Entrar en pantalla completa cambia el modo, no la ventana.
          if (!this.matches('fullscreen')) this.bareWindow.set(this.isBareWindow());
        },
        until,
      );
    }
  }

  back(): void {
    if (this.canGoBack()) this.location.back();
  }

  forward(): void {
    if (this.canGoForward()) this.location.forward();
  }

  private isBareWindow(): boolean {
    return BARE_WINDOW_MODES.some((mode) => this.matches(mode));
  }

  private matches(mode: string): boolean {
    return this.window?.matchMedia?.(`(display-mode: ${mode})`).matches === true;
  }
}
