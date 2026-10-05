import { Injectable, NgZone, inject } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, pairwise } from 'rxjs';
import { APP_PATHS } from '../navigation/app-paths';
import { PresentationService } from '../presentation.service';

/** Cada cuánto se comprueba si hay versión nueva con la pestaña a la vista. */
const CHECK_EVERY_MS = 15 * 60 * 1000;
/** Separación mínima entre dos comprobaciones (el móvil entra y sale mucho). */
const MIN_CHECK_GAP_MS = 60 * 1000;
/** Tras una «entrada», si la versión nueva llega en este plazo se recarga ya. */
const ENTRY_WINDOW_MS = 15 * 1000;
/** Ausencia a partir de la cual volver a la pestaña cuenta como entrar de nuevo. */
const LONG_ABSENCE_MS = 10 * 60 * 1000;
/** Dos recargas automáticas más juntas que esto = algo va mal: no se repite. */
const RELOAD_GUARD_MS = 60 * 1000;
const RELOAD_GUARD_KEY = 'elim.pwa-update.reloaded-at';

/** Ventanas de la proyección (panel de control y pantalla). */
const PROJECTION_PREFIX = `/${APP_PATHS.media}/`;

const pathOf = (url: string): string => url.split(/[?#]/)[0];
const isProjection = (url: string): boolean => url.startsWith(PROJECTION_PREFIX);

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
 * pueda. Un tope en `sessionStorage` impide recargar en bucle.
 *
 * Los temporizadores y escuchas van fuera de la zona de Angular: un
 * `setInterval` dentro deja la app «inestable» para siempre (antes las
 * comprobaciones esperaban a `isStable`, que no llegaba nunca).
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly presentation = inject(PresentationService);
  private readonly fullscreen$ = toObservable(this.presentation.isFullscreen);

  /** Hay una versión nueva descargada que esta pestaña aún no usa. */
  private updateReady = false;
  /** El SW no puede servir esta versión: recargar en cuanto se pueda. */
  private broken = false;
  private entryUntil = 0;
  private lastCheck = 0;
  private hiddenSince: number | null = null;

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReady = true;
        if (Date.now() < this.entryUntil) this.reloadIfSafe();
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.warn('[pwa] No se ha podido instalar la versión nueva:', event.error);
      }
    });

    this.swUpdate.unrecoverable.subscribe((event) => {
      console.warn('[pwa] Estado irrecuperable del Service Worker:', event.reason);
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
  }

  private onNavigation(e: NavigationStart): void {
    if (!this.updateReady && !this.broken) return;
    const from = this.router.url;
    // Sólo al cambiar de página (no por un ancla o un filtro de la misma) y
    // nunca entre ventanas de proyección: el panel y la pantalla van a la par.
    if (pathOf(e.url) === pathOf(from)) return;
    if (this.presentation.isFullscreen() || (isProjection(from) && isProjection(e.url))) return;
    if (!this.claimReload()) return;
    // Con «atrás / adelante» el navegador ya muestra la URL de destino.
    if (e.navigationTrigger === 'popstate') this.document.location.reload();
    else this.document.location.assign(this.location.prepareExternalUrl(e.url));
  }

  /** Recarga la página actual si ahora no molesta. */
  private reloadIfSafe({ pending = false } = {}): void {
    if (pending && !this.updateReady && !this.broken) return;
    if (this.presentation.isFullscreen() || isProjection(this.router.url)) return;
    if (this.isTyping() || !this.claimReload()) return;
    this.document.location.reload();
  }

  private isTyping(): boolean {
    const el = this.document.activeElement as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  /**
   * Reserva la recarga automática. Si ya hubo otra hace menos de un minuto
   * (la versión «nueva» vuelve a aparecer tras recargar), se deja de insistir
   * para no entrar en bucle; la pestaña sigue usable con lo que tiene.
   */
  private claimReload(): boolean {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage) return true;
      const last = Number(storage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - last < RELOAD_GUARD_MS) return false;
      storage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      /* almacenamiento bloqueado: recargar igualmente es lo seguro */
    }
    return true;
  }
}
