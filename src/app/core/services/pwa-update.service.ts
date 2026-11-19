import { Injectable, NgZone, inject, signal } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, pairwise } from 'rxjs';
import { APP_VERSION } from '../../../environments/version';
import { APP_PATHS } from '../navigation/app-paths';
import { PresentationService } from '../presentation.service';
import { claimAutoReload } from '../util/auto-reload';
import { LoggerService } from './logger.service';

/** Cada cuánto se comprueba si hay versión nueva con la pestaña a la vista. */
const CHECK_EVERY_MS = 15 * 60 * 1000;
/** Separación mínima entre dos comprobaciones (el móvil entra y sale mucho). */
const MIN_CHECK_GAP_MS = 60 * 1000;
/** Tras una «entrada», si la versión nueva llega en este plazo se recarga ya. */
const ENTRY_WINDOW_MS = 15 * 1000;
/** Ausencia a partir de la cual volver a la pestaña cuenta como entrar de nuevo. */
const LONG_ABSENCE_MS = 10 * 60 * 1000;

/** Ventanas de la proyección (panel de control y pantalla). */
const PROJECTION_PREFIX = `/${APP_PATHS.media}/`;

const pathOf = (url: string): string => url.split(/[?#]/)[0];
const isProjection = (url: string): boolean => url.startsWith(PROJECTION_PREFIX);

/** Lo que publica cada compilación en `/version.json` (`scripts/generate-version.mjs`). */
export interface PublishedVersion {
  readonly release: string;
  readonly build: number;
  readonly commit: string;
  readonly builtAt: string;
}

/** Estado de la comprobación manual (botón de la versión, en el pie). */
export type UpdateStatus = 'idle' | 'checking' | 'current' | 'updating' | 'offline';

/** Marca para no repetir la actualización forzada de la misma versión en bucle. */
const FORCED_KEY = 'elim.pwa-update.forced';

/**
 * Parámetro de un solo uso en las recargas por actualización. GitHub Pages
 * sirve las páginas con `max-age=600` desde su CDN: justo tras publicar, una
 * recarga normal podía traer aún la página vieja. Con una URL distinta el CDN
 * la pide de nuevo. La app lo quita de la barra al arrancar (`init`).
 */
const FRESH_PARAM = '_v';

/**
 * Mantiene la web en la última versión publicada.
 *
 * El Service Worker sirve siempre la copia guardada y descarga la nueva en
 * segundo plano: sin esto, quien tiene la app instalada sigue viendo la
 * versión antigua durante días. Cualquier **navegación completa** recibe ya
 * la versión nueva (así lo asigna `ngsw-worker.js`), de modo que aplicarla es
 * recargar en el momento oportuno; no se usa `activateUpdate()`, que cambia
 * la caché por debajo del JS antiguo y rompe los chunks diferidos.
 *
 * Cuándo se comprueba: al abrir, al volver a la pestaña, al recuperar la red
 * y cada 15 minutos con la pestaña a la vista.
 *
 * Cuándo se aplica una versión ya descargada:
 *  1. **Al entrar** (abrir la app, volver tras ≥ 10 min fuera o restaurarla
 *     desde la caché del navegador): si llega en los primeros 15 s se recarga
 *     al momento; el usuario apenas ha empezado.
 *  2. **En la siguiente navegación**: en vez de cambiar de página dentro de la
 *     app se carga la página de destino completa. No se nota y no se pierde
 *     nada de lo que había en pantalla.
 *  3. **Al terminar de proyectar**, si llegó durante la proyección.
 *
 * Nunca en mitad de una proyección (pantalla completa o las ventanas
 * `/media/…`: recargar una cortaría el culto) ni con el cursor en un campo de
 * texto. Si el SW queda en un estado irrecuperable, se recarga en cuanto se
 * pueda. Un tope en `sessionStorage` (`claimAutoReload`, compartido con la
 * recuperación ante chunks caducados) impide recargar en bucle.
 *
 * Los temporizadores y escuchas van fuera de la zona de Angular: un
 * `setInterval` dentro deja la app «inestable» para siempre (antes las
 * comprobaciones esperaban a `isStable`, que no llegaba nunca).
 *
 * **Detección sin depender del SW** (19/11/2026, auditoría: «hay que
 * refrescar 4 veces», sobre todo con la app instalada). El SW sólo avisa
 * (`VERSION_READY`) cuando ha descargado la versión nueva **entera** (166
 * ficheros de código + recursos cambiados) y, hasta entonces, cada recarga
 * servía la copia guardada. Ahora:
 *  - cada comprobación lee también `/version.json` sin caché (lo publica cada
 *    compilación, el SW no lo guarda): en cuanto la fecha de compilación
 *    publicada es otra, hay versión nueva, aunque el SW vaya a medias;
 *  - las navegaciones van **primero a la red** (`navigationRequestStrategy:
 *    freshness` en `ngsw-config.json`): una sola recarga ya trae la página
 *    nueva (sin red, la guardada);
 *  - `updateNow()` (botón de la versión): comprueba y, si hay versión nueva,
 *    la aplica ya; si el SW no la tiene lista, lo reinicia (lo da de baja y
 *    borra sus cachés `ngsw:`) para que la recarga venga entera de la red.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly presentation = inject(PresentationService);
  private readonly log = inject(LoggerService).prefix('pwa');
  private readonly fullscreen$ = toObservable(this.presentation.isFullscreen);

  /** Hay una versión nueva (descargada por el SW o publicada) que esta pestaña aún no usa. */
  private updateReady = false;

  /** Estado de la comprobación manual, para el botón de la versión. */
  readonly status = signal<UpdateStatus>('idle');
  /** Última versión publicada que se ha leído (si es otra que la de esta pestaña). */
  readonly latest = signal<PublishedVersion | null>(null);
  /** El SW no puede servir esta versión: recargar en cuanto se pueda. */
  private broken = false;
  private entryUntil = 0;
  private lastCheck = 0;
  private hiddenSince: number | null = null;

  init(): void {
    this.stripFreshParam();
    // Sin SW (desarrollo, navegador sin soporte) no hay detección automática;
    // el botón de la versión (`updateNow`) funciona igual.
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReady = true;
        if (Date.now() < this.entryUntil) this.reloadIfSafe();
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        this.log.warn('No se ha podido instalar la versión nueva', event.error);
      }
    });

    this.swUpdate.unrecoverable.subscribe((event) => {
      this.log.warn('Estado irrecuperable del Service Worker', event.reason);
      this.broken = true;
      this.reloadIfSafe();
    });

    // Cambio de página con versión nueva pendiente: carga completa del destino.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe((e) => this.onNavigation(e));

    // Fin de la proyección (sale de pantalla completa).
    this.fullscreen$.pipe(pairwise()).subscribe(([before, now]) => {
      if (before && !now) this.reloadIfSafe({ pending: true });
    });

    this.zone.runOutsideAngular(() => {
      const view = this.document.defaultView;
      this.document.addEventListener('visibilitychange', () => this.onVisibility());
      view?.addEventListener('pageshow', (e) => {
        if (e.persisted) this.enter();
      });
      view?.addEventListener('online', () => this.check());
      setInterval(() => {
        if (this.document.visibilityState === 'visible') this.check();
      }, CHECK_EVERY_MS);
      this.enter();
    });
  }

  /** El usuario «entra» en la app: comprobar y aplicar sin esperar. */
  private enter(): void {
    this.entryUntil = Date.now() + ENTRY_WINDOW_MS;
    if (this.updateReady) this.reloadIfSafe();
    this.check(true);
  }

  private onVisibility(): void {
    if (this.document.visibilityState === 'hidden') {
      this.hiddenSince = Date.now();
      return;
    }
    const away = this.hiddenSince === null ? 0 : Date.now() - this.hiddenSince;
    this.hiddenSince = null;
    if (away >= LONG_ABSENCE_MS) this.enter();
    else this.check();
  }

  private check(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastCheck < MIN_CHECK_GAP_MS) return;
    this.lastCheck = now;
    this.swUpdate.checkForUpdate().catch(() => {
      /* sin red o SW ocupado: se reintenta en la siguiente ocasión */
    });
    // En paralelo, la versión publicada: no espera a que el SW acabe.
    void this.fetchPublished().then((published) => {
      if (!published || !this.isNewer(published)) return;
      this.zone.run(() => this.latest.set(published));
      this.updateReady = true;
      if (Date.now() < this.entryUntil) this.reloadIfSafe();
    });
  }

  /**
   * Botón de la versión: comprueba ahora y, si hay una versión nueva, la
   * aplica ya. Si no la hay, se queda en `current` (la pestaña ya es la última).
   */
  async updateNow(): Promise<void> {
    if (this.status() === 'checking' || this.status() === 'updating') return;
    this.status.set('checking');
    const published = await this.fetchPublished();
    if (!published) {
      this.status.set('offline');
      return;
    }
    if (!this.isNewer(published)) {
      this.latest.set(null);
      this.status.set('current');
      return;
    }
    this.latest.set(published);
    this.status.set('updating');
    await this.applyNow(published);
  }

  /** Recarga la página (botón «Reîncarcă»), pidiéndola de nuevo al servidor. */
  reload(): void {
    this.freshReload();
  }

  /** Recarga con una URL de un solo uso: ni el SW ni el CDN dan la copia vieja. */
  private freshReload(): void {
    const loc = this.document.location;
    try {
      const url = new URL(loc.href);
      url.searchParams.set(FRESH_PARAM, String(Date.now()));
      loc.replace(url.toString());
    } catch {
      loc.reload();
    }
  }

  /** Quita el parámetro de un solo uso de la barra de direcciones. */
  private stripFreshParam(): void {
    const view = this.document.defaultView;
    if (!view) return;
    try {
      const url = new URL(view.location.href);
      if (!url.searchParams.has(FRESH_PARAM)) return;
      url.searchParams.delete(FRESH_PARAM);
      view.history.replaceState(view.history.state, '', url.pathname + url.search + url.hash);
    } catch {
      /* sin History API: se queda en la URL, no molesta */
    }
  }

  /**
   * Aplica una versión publicada **ya**. Si el SW la tiene lista, la activa;
   * si no (descarga a medias, fallo de instalación, estado roto), lo reinicia
   * para que la recarga venga entera de la red. Una sola recarga.
   */
  private async applyNow(published: PublishedVersion): Promise<void> {
    const sw = this.document.defaultView?.navigator.serviceWorker;
    try {
      if (this.swUpdate.isEnabled && (await this.swUpdate.checkForUpdate())) {
        await this.swUpdate.activateUpdate();
      } else if (sw) {
        // Una vez por versión y pestaña: si aun así volviera la vieja (caché
        // del CDN de GitHub Pages, 10 min), no se entra en bucle.
        const storage = this.document.defaultView?.sessionStorage;
        if (storage?.getItem(FORCED_KEY) !== published.builtAt) {
          storage?.setItem(FORCED_KEY, published.builtAt);
          const registrations = await sw.getRegistrations();
          await Promise.all(registrations.map((r) => r.unregister()));
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith('ngsw:')).map((k) => caches.delete(k)));
        }
      }
    } catch (error) {
      this.log.warn('Actualización manual: se recarga igualmente', error);
    }
    this.freshReload();
  }

  /** `/version.json` sin caché (ni del navegador, ni del SW, ni del CDN). */
  private async fetchPublished(): Promise<PublishedVersion | null> {
    try {
      const url = new URL('version.json', this.document.baseURI);
      url.searchParams.set('t', String(Date.now()));
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as Partial<PublishedVersion>;
      return typeof data.builtAt === 'string' && typeof data.release === 'string'
        ? (data as PublishedVersion)
        : null;
    } catch {
      return null;
    }
  }

  /**
   * ¿Es otra compilación que la de esta pestaña? Por fecha de compilación, no
   * por commit: la reconstrucción nocturna publica el mismo commit con el
   * contenido del día (anuncios, eventos) y también debe llegar.
   */
  private isNewer(published: PublishedVersion): boolean {
    return published.builtAt !== APP_VERSION.builtAt && published.builtAt > APP_VERSION.builtAt;
  }

  private onNavigation(e: NavigationStart): void {
    if (!this.updateReady && !this.broken) return;
    const from = this.router.url;
    // Sólo al cambiar de página (no por un ancla o un filtro de la misma) y
    // nunca entre ventanas de proyección: el panel y la pantalla van a la par.
    if (pathOf(e.url) === pathOf(from)) return;
    if (this.presentation.isFullscreen() || (isProjection(from) && isProjection(e.url))) return;
    if (!claimAutoReload(this.document)) return;
    // Con «atrás / adelante» el navegador ya muestra la URL de destino.
    if (e.navigationTrigger === 'popstate') this.document.location.reload();
    else this.document.location.assign(this.location.prepareExternalUrl(e.url));
  }

  /** Recarga la página actual si ahora no molesta. */
  private reloadIfSafe({ pending = false } = {}): void {
    if (pending && !this.updateReady && !this.broken) return;
    if (this.presentation.isFullscreen() || isProjection(this.router.url)) return;
    if (this.isTyping() || !claimAutoReload(this.document)) return;
    this.freshReload();
  }

  private isTyping(): boolean {
    const el = this.document.activeElement as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }
}
