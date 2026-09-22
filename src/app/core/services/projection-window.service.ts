import { Location } from '@angular/common';
import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATHS } from '../navigation/app-paths';
import { LoggerService } from './logger.service';

/** Nombre fijo de la ventana: abrir dos veces reutiliza la misma. */
const WINDOW_NAME = 'elim-proiectie';

/** Tamaño de arranque cuando no se puede colocar en otra pantalla (16:9). */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/** Cadencia con la que se comprueba si el operador ha cerrado la ventana a mano. */
const WATCH_MS = 1_000;

/** Subconjunto de la Window Management API que usamos (Chromium). */
interface ScreenDetailed {
  readonly availLeft: number;
  readonly availTop: number;
  readonly availWidth: number;
  readonly availHeight: number;
  readonly isPrimary: boolean;
  readonly label: string;
}

interface ScreenDetails {
  readonly screens: readonly ScreenDetailed[];
  readonly currentScreen: ScreenDetailed;
}

type WindowWithScreens = Window & {
  getScreenDetails?: () => Promise<ScreenDetails>;
};

export type ProjectionTarget = 'here' | 'other-screen';

export type ProjectionOpenResult = 'opened' | 'blocked';

/**
 * Mensajes **directos** entre el panel y su ventana de proyección
 * (`postMessage`, mismo origen). No van por el `BroadcastChannel` porque la
 * pantalla completa necesita la **delegación de capacidades**: el gesto del
 * operador en el panel viaja con el mensaje (`delegate: 'fullscreen'`) y la
 * ventana puede pedir `requestFullscreen()` sin un clic propio. Eso sólo
 * existe en `postMessage` a una referencia de ventana (Chromium ≥ 104).
 */
export const PROJECTION_MESSAGE = {
  /** Panel → ventana: alterna la pantalla completa nativa. */
  fullscreen: 'iglesia-redes.projection.fullscreen',
  /** Ventana → panel: qué pasó con la petición. */
  fullscreenResult: 'iglesia-redes.projection.fullscreen-result',
} as const;

export interface FullscreenResultMessage {
  readonly type: typeof PROJECTION_MESSAGE.fullscreenResult;
  /** `false`: el navegador exigió un gesto en la propia ventana (sin delegación). */
  readonly ok: boolean;
}

/** `postMessage` con delegación de capacidades (aún fuera de `lib.dom`). */
type DelegatingPostMessageOptions = WindowPostMessageOptions & {
  readonly delegate?: 'fullscreen';
};

/**
 * Abre, vigila y cierra la **ventana de proyección** desde el panel de control.
 *
 * ── Dónde se abre ─────────────────────────────────────────────────────
 * Un navegador no puede mover ventanas a otra pantalla… salvo con la
 * Window Management API (Chrome/Edge). Si está disponible y el operador
 * concede el permiso, la ventana se abre directamente sobre la pantalla que
 * **no** es la actual (el proyector) y, en Chromium reciente, ya a pantalla
 * completa (`fullscreen` en las *features* del popup). Sin la API, se abre
 * como popup 16:9 y el operador la arrastra a la otra pantalla y pulsa `F`.
 *
 * La ventana tiene nombre fijo: pulsar «Abrir» dos veces trae la misma al
 * frente en vez de crear otra, así nunca hay dos relojes proyectando. Ese
 * nombre también permite **recuperar** la referencia si el panel se recarga
 * (`window.open('', nombre)` devuelve la ventana viva sin navegarla).
 *
 * ── Pantalla completa desde el panel ──────────────────────────────────
 * `toggleFullscreen()` manda a la ventana un `postMessage` con el gesto del
 * operador delegado (`delegate: 'fullscreen'`); la ventana alterna su
 * pantalla completa nativa y contesta con el resultado. Donde el navegador no
 * delegue (Firefox, Safari), la petición fracasa allí y el panel lo refleja
 * en `fullscreenDenied` para pedir al operador que pulse `F` en la ventana.
 */
@Injectable({ providedIn: 'root' })
export class ProjectionWindowService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);
  private readonly log = inject(LoggerService).prefix('projection-window');

  private handle: Window | null = null;
  private watcher: ReturnType<typeof setInterval> | null = null;

  private readonly _isOpen = signal<boolean>(false);
  private readonly _fullscreenDenied = signal<boolean>(false);

  /** Hay una ventana abierta **por este panel** (y sigue viva). */
  readonly isOpen = this._isOpen.asReadonly();

  /**
   * La última orden de pantalla completa fue rechazada por el navegador de la
   * ventana (exige un gesto allí). Se limpia al reintentar.
   */
  readonly fullscreenDenied = this._fullscreenDenied.asReadonly();

  /** El navegador sabe colocar ventanas en otras pantallas. */
  readonly canPlaceOnOtherScreen = computed<boolean>(
    () => typeof window !== 'undefined' && 'getScreenDetails' in window,
  );

  constructor() {
    const onMessage = (event: MessageEvent<Partial<FullscreenResultMessage> | null>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PROJECTION_MESSAGE.fullscreenResult) return;
      this._fullscreenDenied.set(event.data.ok === false);
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('message', onMessage);
      this.stopWatching();
    });
  }

  /** URL absoluta de la ruta de proyección (respeta el `base href` del despliegue). */
  projectionUrl(preview = false): string {
    const tree = this.router.createUrlTree(['/', APP_PATHS.media, APP_PATHS.projection], {
      queryParams: preview ? { rol: 'preview' } : {},
    });
    return this.location.prepareExternalUrl(this.router.serializeUrl(tree));
  }

  /**
   * Abre la ventana (o la trae al frente si ya existe).
   * `other-screen` intenta colocarla en la pantalla que no es la actual.
   */
  async open(target: ProjectionTarget): Promise<ProjectionOpenResult> {
    if (this.handle && !this.handle.closed) {
      this.handle.focus();
      return 'opened';
    }

    const features = await this.featuresFor(target);
    const opened = window.open(this.projectionUrl(), WINDOW_NAME, features);
    if (!opened) {
      this.log.warn('El navegador ha bloqueado la ventana emergente');
      return 'blocked';
    }
    this.handle = opened;
    this._isOpen.set(true);
    this.startWatching();
    return 'opened';
  }

  close(): void {
    if (this.handle && !this.handle.closed) this.handle.close();
    this.forget();
  }

  /** Trae la ventana al frente. Devuelve `false` si no hay ninguna que traer. */
  focus(): boolean {
    const target = this.acquire();
    target?.focus();
    return target !== null;
  }

  /**
   * Alterna la pantalla completa nativa **de la ventana de proyección** desde
   * el panel. Debe llamarse desde un gesto del operador (clic): ese gesto es
   * lo que se delega. Devuelve `false` si no hay ventana a la que mandar.
   */
  toggleFullscreen(): boolean {
    const target = this.acquire();
    if (!target) return false;
    this._fullscreenDenied.set(false);
    const options: DelegatingPostMessageOptions = {
      targetOrigin: window.location.origin,
      delegate: 'fullscreen',
    };
    target.postMessage({ type: PROJECTION_MESSAGE.fullscreen }, options);
    target.focus();
    return true;
  }

  /**
   * Referencia viva a la ventana. Si este panel no la abrió (se recargó), la
   * recupera por su nombre: `window.open('', nombre)` devuelve la existente sin
   * navegarla. Si no existía, el navegador abre una en blanco: se detecta y se
   * cierra al instante (por eso sólo se llama cuando el canal dice que hay una).
   */
  private acquire(): Window | null {
    if (this.handle && !this.handle.closed) return this.handle;

    const found = window.open('', WINDOW_NAME);
    if (!found) return null;
    let blank = false;
    try {
      blank = found.location.href === 'about:blank';
    } catch {
      // Otro origen: no es nuestra ventana.
      blank = true;
    }
    if (blank) {
      found.close();
      return null;
    }
    this.handle = found;
    this._isOpen.set(true);
    this.startWatching();
    return found;
  }

  /**
   * Features del popup. Con la Window Management API se pide permiso al
   * navegador y se elige la otra pantalla (la no primaria si hay varias).
   */
  private async featuresFor(target: ProjectionTarget): Promise<string> {
    const base = 'popup=yes';
    if (target !== 'other-screen') return `${base},width=${DEFAULT_WIDTH},height=${DEFAULT_HEIGHT}`;

    const screen = await this.pickOtherScreen();
    if (!screen) return `${base},width=${DEFAULT_WIDTH},height=${DEFAULT_HEIGHT}`;

    return [
      base,
      `left=${screen.availLeft}`,
      `top=${screen.availTop}`,
      `width=${screen.availWidth}`,
      `height=${screen.availHeight}`,
      // Chromium ≥ 119 con permiso de gestión de ventanas: nace a pantalla
      // completa. Donde no se soporte, la feature se ignora sin error.
      'fullscreen',
    ].join(',');
  }

  private async pickOtherScreen(): Promise<ScreenDetailed | null> {
    const win = window as WindowWithScreens;
    if (!win.getScreenDetails) return null;
    try {
      const details = await win.getScreenDetails();
      const others = details.screens.filter((s) => s !== details.currentScreen);
      if (others.length === 0) return null;
      return others.find((s) => !s.isPrimary) ?? others[0];
    } catch (error) {
      // Permiso denegado o API sin soporte real: se abre como popup normal.
      this.log.info('Sin acceso a las pantallas del sistema', error);
      return null;
    }
  }

  /** Detecta el cierre manual de la ventana (no hay evento entre ventanas). */
  private startWatching(): void {
    this.stopWatching();
    this.zone.runOutsideAngular(() => {
      this.watcher = setInterval(() => {
        if (this.handle && !this.handle.closed) return;
        this.zone.run(() => this.forget());
      }, WATCH_MS);
    });
  }

  private stopWatching(): void {
    if (this.watcher) clearInterval(this.watcher);
    this.watcher = null;
  }

  private forget(): void {
    this.handle = null;
    this._isOpen.set(false);
    this.stopWatching();
  }
}
