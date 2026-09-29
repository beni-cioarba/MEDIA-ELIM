import { ApplicationRef, Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, filter, first, fromEvent, interval, merge } from 'rxjs';
import { APP_PATHS } from '../navigation/app-paths';
import { PresentationService } from '../presentation.service';

/** Cada cuánto se comprueba si hay versión nueva mientras la web está abierta. */
const CHECK_EVERY_MS = 15 * 60 * 1000;

/** Ventanas de la proyección (panel de control y pantalla): nunca se recargan solas. */
const PROJECTION_PREFIX = `/${APP_PATHS.media}/`;

/**
 * Gestor de actualizaciones del Service Worker.
 *
 * Quien abre la web tiene que ver **siempre lo último publicado** sin tener
 * que hacer nada (mismo criterio que la app de Administrativ):
 *  - Se comprueba si hay versión nueva al arrancar, cada 15 minutos y cada
 *    vez que la pestaña vuelve a primer plano (el portátil del templo y el
 *    móvil suelen dejarla abierta durante horas o días).
 *  - Cuando la versión nueva está descargada, se activa y se recarga.
 *  - Si el SW detecta ficheros corruptos o inconsistentes, recarga limpia.
 *
 * **Salvo mientras se proyecta**: una recarga en pleno culto cortaría la
 * proyección. Si llega una versión con la presentación a pantalla completa o
 * en las ventanas de proyección (`/media/control`, `/media/ecran`), se aplica
 * al terminar (al salir de pantalla completa o de esas ventanas); si no,
 * en la siguiente apertura.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly router = inject(Router);
  private readonly presentation = inject(PresentationService);
  private readonly fullscreen$ = toObservable(this.presentation.isFullscreen);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    const stable$ = this.appRef.isStable.pipe(first((s) => s));
    const periodic$ = interval(CHECK_EVERY_MS);
    const foreground$ = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible'),
    );
    concat(stable$, merge(periodic$, foreground$)).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {
        /* sin red: se reintenta en la siguiente comprobación */
      });
    });

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(async () => {
        try {
          await this.swUpdate.activateUpdate();
        } finally {
          this.reloadWhenSafe();
        }
      });

    this.swUpdate.unrecoverable.subscribe(() => this.reloadWhenSafe());
  }

  /** Recarga ya o, si se está proyectando, en cuanto deje de hacerlo. */
  private reloadWhenSafe(): void {
    if (this.canReload()) {
      document.location.reload();
      return;
    }
    const cambios$ = merge(
      this.fullscreen$,
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
    );
    const sub = cambios$.subscribe(() => {
      if (!this.canReload()) return;
      sub.unsubscribe();
      document.location.reload();
    });
  }

  private canReload(): boolean {
    return !this.presentation.isFullscreen() && !this.router.url.startsWith(PROJECTION_PREFIX);
  }
}
