import { Location } from '@angular/common';
import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATHS } from '../navigation/app-paths';
import { LoggerService } from './logger.service';

/** Prefijo de los nombres de ventana: `elim-proiectie-<pantalla>`. */
export const WINDOW_NAME_PREFIX = 'elim-proiectie-';

/** Tamaño de arranque cuando no se puede colocar en una pantalla concreta (16:9). */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/** Cadencia con la que se comprueba si el operador ha cerrado una ventana a mano. */
const WATCH_MS = 1_000;

/** Nombres de las ventanas que abrió este panel (sobreviven a recargarlo). */
const OPENED_KEY = 'iglesia-redes.projection.windows';

/** Subconjunto de la Window Management API que usamos (Chromium). */
interface ScreenDetailed extends EventTarget {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly availLeft: number;
  readonly availTop: number;
  readonly availWidth: number;
  readonly availHeight: number;
  readonly isPrimary: boolean;
  readonly isInternal?: boolean;
  readonly label: string;
}

interface ScreenDetails extends EventTarget {
  readonly screens: readonly ScreenDetailed[];
  readonly currentScreen: ScreenDetailed;
}

type WindowWithScreens = Window & {
  getScreenDetails?: () => Promise<ScreenDetails>;
};

/** Una pantalla conectada al ordenador, tal como la ve el panel. */
export interface DisplayScreen {
  /** Clave estable (su posición en el escritorio): nombra su ventana. */
  readonly key: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly isPrimary: boolean;
  /** Es la pantalla en la que está el panel. */
  readonly isCurrent: boolean;
  readonly isInternal: boolean;
}

/**
 * Estado del acceso a las pantallas:
 *  - `unsupported` el navegador no tiene la API (Firefox, Safari): se abren
 *                  ventanas sueltas y el operador las arrastra.
 *  - `prompt`      hay API pero aún no se ha pedido permiso (hace falta un clic).
 *  - `granted`     se conocen las pantallas.
 *  - `denied`      el operador lo rechazó (se puede volver a conceder en el
 *                  candado de la barra de direcciones).
 */
export type ScreensAccess = 'unsupported' | 'prompt' | 'granted' | 'denied';

export type ProjectionOpenResult = 'opened' | 'blocked';

/**
 * Mensajes **directos** entre el panel y una ventana de proyección
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
 * Abre, vigila y cierra las **ventanas de proyección** desde el panel: tantas
 * como pantallas haga falta (proyector, televisor del vestíbulo…), todas con
 * el mismo contenido sincronizado (`PresentationSyncService`).
 *
 * ── Pantallas ─────────────────────────────────────────────────────────
 * Con la Window Management API (Chrome/Edge) el panel **detecta las
 * pantallas conectadas** (nombre, resolución, cuál es la principal) y abre
 * cada ventana directamente sobre la elegida y a pantalla completa. Si se
 * conecta o desconecta una pantalla, la lista se actualiza sola. Sin la API
 * (o sin permiso), «Nueva ventana» abre una ventana suelta 16:9 que el
 * operador arrastra a la pantalla y pone a pantalla completa con `F`.
 *
 * Cada ventana tiene nombre propio (`elim-proiectie-<pantalla>`): abrir otra
 * vez en la misma pantalla la trae al frente en vez de duplicarla. El nombre
 * también permite **recuperar** la referencia si el panel se recarga.
 *
 * ── Pantalla completa desde el panel ──────────────────────────────────
 * `toggleFullscreen(name)` manda a esa ventana un `postMessage` con el gesto
 * del operador delegado; la ventana alterna su pantalla completa y contesta.
 * Donde el navegador no delegue, el panel lo indica (`fullscreenDenied`).
 */
@Injectable({ providedIn: 'root' })
export class ProjectionWindowService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);
  private readonly log = inject(LoggerService).prefix('projection-window');

  private readonly handles = new Map<string, Window>();
  private readonly _open = signal<readonly string[]>([]);
  private readonly _fullscreenDenied = signal<boolean>(false);
  private readonly _screens = signal<readonly DisplayScreen[]>([]);
  private readonly _access = signal<ScreensAccess>(
    typeof window !== 'undefined' && 'getScreenDetails' in window ? 'prompt' : 'unsupported',
  );
  private details: ScreenDetails | null = null;
  private watcher: ReturnType<typeof setInterval> | null = null;

  /** Nombres de las ventanas abiertas **por este panel** (y vivas). */
  readonly openNames = this._open.asReadonly();
  readonly isOpen = computed<boolean>(() => this._open().length > 0);

  /** La última orden de pantalla completa la rechazó el navegador de la ventana. */
  readonly fullscreenDenied = this._fullscreenDenied.asReadonly();

  /** Pantallas conectadas (vacío hasta tener permiso). */
  readonly screens = this._screens.asReadonly();
  readonly access = this._access.asReadonly();

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

    this.recoverOpened();
    void this.detectIfGranted();
  }

  /** URL absoluta de la ruta de proyección (respeta el `base href` del despliegue). */
  projectionUrl(params: Record<string, string> = {}): string {
    const tree = this.router.createUrlTree(['/', APP_PATHS.media, APP_PATHS.projection], {
      queryParams: params,
    });
    return this.location.prepareExternalUrl(this.router.serializeUrl(tree));
  }

  /** Nombre de la ventana de una pantalla. */
  nameFor(screen: DisplayScreen): string {
    return `${WINDOW_NAME_PREFIX}${screen.key}`;
  }

  // ---- Pantallas ------------------------------------------------------

  /**
   * Pide acceso a las pantallas (el navegador muestra su diálogo la primera
   * vez; debe llamarse desde un clic) y las lista.
   */
  async detectScreens(): Promise<void> {
    const win = window as WindowWithScreens;
    if (!win.getScreenDetails) return;
    try {
      const details = await win.getScreenDetails();
      this.attach(details);
      this._access.set('granted');
    } catch (error) {
      this.log.info('Sin acceso a las pantallas del sistema', error);
      this._access.set('denied');
    }
  }

  /** Si el permiso ya estaba concedido, lista las pantallas sin preguntar. */
  private async detectIfGranted(): Promise<void> {
    if (this._access() === 'unsupported' || !navigator.permissions) return;
    try {
      const status = await navigator.permissions.query({
        name: 'window-management' as PermissionName,
      });
      if (status.state === 'granted') await this.detectScreens();
      else if (status.state === 'denied') this._access.set('denied');
    } catch {
      /* nombre de permiso desconocido en este navegador: se pedirá al pulsar */
    }
  }

  private attach(details: ScreenDetails): void {
    if (this.details !== details) {
      this.details = details;
      // Pantalla conectada / desconectada o el panel cambia de pantalla.
      const refresh = () => this.zone.run(() => this.readScreens());
      details.addEventListener('screenschange', refresh);
      details.addEventListener('currentscreenchange', refresh);
    }
    this.readScreens();
  }

  private readScreens(): void {
    const details = this.details;
    if (!details) return;
    this._screens.set(
      [...details.screens]
        .sort((a, b) => a.left - b.left || a.top - b.top)
        .map((s) => ({
          key: screenKey(s),
          label: s.label || `${s.width}×${s.height}`,
          width: s.width,
          height: s.height,
          isPrimary: s.isPrimary,
          isCurrent: s === details.currentScreen,
          isInternal: s.isInternal ?? false,
        })),
    );
  }

  // ---- Ventanas -------------------------------------------------------

  /**
   * Abre la ventana de proyección en una pantalla (o la trae al frente si ya
   * existe). Sin pantalla: ventana suelta nueva («Nueva ventana»).
   */
  async open(screen?: DisplayScreen): Promise<ProjectionOpenResult> {
    const name = screen ? this.nameFor(screen) : this.nextLooseName();
    const existing = this.handles.get(name);
    if (existing && !existing.closed) {
      existing.focus();
      return 'opened';
    }

    const opened = window.open(this.projectionUrl(), name, this.featuresFor(screen));
    if (!opened) {
      this.log.warn('El navegador ha bloqueado la ventana emergente');
      return 'blocked';
    }
    this.remember(name, opened);
    return 'opened';
  }

  /** Abre una vista de prueba (una diapositiva fija) en una ventana suelta. */
  openSolo(params: Record<string, string>): ProjectionOpenResult {
    const opened = window.open(
      this.projectionUrl({ rol: 'solo', ...params }),
      `${WINDOW_NAME_PREFIX}proba`,
      `popup=yes,width=${DEFAULT_WIDTH},height=${DEFAULT_HEIGHT}`,
    );
    return opened ? 'opened' : 'blocked';
  }

  close(name: string): void {
    const handle = this.acquire(name);
    if (handle && !handle.closed) handle.close();
    this.forget(name);
  }

  closeAll(): void {
    for (const name of [...this._open()]) this.close(name);
  }

  /** Trae una ventana al frente. Devuelve `false` si no se puede alcanzar. */
  focus(name: string): boolean {
    const target = this.acquire(name);
    target?.focus();
    return target !== null;
  }

  /** ¿Puede el panel mandar órdenes directas a esta ventana? */
  canControl(name: string): boolean {
    return this._open().includes(name);
  }

  /**
   * Alterna la pantalla completa nativa de una ventana desde el panel. Debe
   * llamarse desde un clic del operador: ese gesto es lo que se delega.
   */
  toggleFullscreen(name: string): boolean {
    const target = this.acquire(name);
    if (!target) return false;
    this._fullscreenDenied.set(false);
    const options: DelegatingPostMessageOptions = {
      targetOrigin: window.location.origin,
      delegate: 'fullscreen',
    };
    target.postMessage({ type: PROJECTION_MESSAGE.fullscreen }, options);
    return true;
  }

  /**
   * Referencia viva a una ventana de este panel. Si el panel se recargó, la
   * recupera por su nombre (`window.open('', nombre)` devuelve la existente
   * sin navegarla). Sólo se intenta con nombres que este panel abrió: con
   * cualquier otro, el navegador abriría una ventana en blanco.
   */
  private acquire(name: string): Window | null {
    const known = this.handles.get(name);
    if (known && !known.closed) return known;
    if (!this._open().includes(name)) return null;

    const found = window.open('', name);
    if (!found) return null;
    let blank = false;
    try {
      blank = found.location.href === 'about:blank';
    } catch {
      blank = true;
    }
    if (blank) {
      found.close();
      this.forget(name);
      return null;
    }
    this.remember(name, found);
    return found;
  }

  /** «Nueva ventana» sin pantalla concreta: `elim-proiectie-v1`, `-v2`… */
  private nextLooseName(): string {
    for (let n = 1; ; n++) {
      const name = `${WINDOW_NAME_PREFIX}v${n}`;
      const handle = this.handles.get(name);
      if (!handle || handle.closed) return name;
    }
  }

  private featuresFor(screen?: DisplayScreen): string {
    const base = 'popup=yes';
    const target = screen && this.details?.screens.find((s) => screenKey(s) === screen.key);
    if (!target) return `${base},width=${DEFAULT_WIDTH},height=${DEFAULT_HEIGHT}`;
    return [
      base,
      `left=${target.availLeft}`,
      `top=${target.availTop}`,
      `width=${target.availWidth}`,
      `height=${target.availHeight}`,
      // Chromium ≥ 119 con permiso de gestión de ventanas: nace a pantalla
      // completa. Donde no se soporte, la feature se ignora sin error.
      'fullscreen',
    ].join(',');
  }

  private remember(name: string, handle: Window): void {
    this.handles.set(name, handle);
    if (!this._open().includes(name)) this.setOpen([...this._open(), name]);
    this.startWatching();
  }

  private forget(name: string): void {
    this.handles.delete(name);
    this.setOpen(this._open().filter((n) => n !== name));
    if (this._open().length === 0) this.stopWatching();
  }

  private setOpen(names: readonly string[]): void {
    this._open.set(names);
    try {
      sessionStorage.setItem(OPENED_KEY, JSON.stringify(names));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** Tras recargar el panel: las ventanas que abrió siguen siendo suyas. */
  private recoverOpened(): void {
    try {
      const raw = sessionStorage.getItem(OPENED_KEY);
      const names: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(names)) {
        this._open.set(names.filter((n): n is string => typeof n === 'string' && n.startsWith(WINDOW_NAME_PREFIX)));
      }
    } catch {
      /* nada que recuperar */
    }
  }

  /** Detecta el cierre manual de las ventanas (no hay evento entre ventanas). */
  private startWatching(): void {
    if (this.watcher) return;
    this.zone.runOutsideAngular(() => {
      this.watcher = setInterval(() => {
        const closed = [...this.handles].filter(([, h]) => h.closed).map(([n]) => n);
        if (closed.length > 0) this.zone.run(() => closed.forEach((n) => this.forget(n)));
      }, WATCH_MS);
    });
  }

  private stopWatching(): void {
    if (this.watcher) clearInterval(this.watcher);
    this.watcher = null;
  }
}

/**
 * Clave estable de una pantalla: su posición en el escritorio («1920_0»;
 * las coordenadas negativas, de una pantalla a la izquierda, con «m»). Vale
 * como parte del nombre de la ventana.
 */
function screenKey(screen: Pick<ScreenDetailed, 'left' | 'top'>): string {
  return `${screen.left}_${screen.top}`.replace(/-/g, 'm');
}
