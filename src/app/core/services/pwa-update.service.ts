import { ApplicationRef, Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, filter, first, interval } from 'rxjs';

/**
 * Gestor de actualizaciones del Service Worker.
 *
 * - Cuando la app se estabiliza, comprueba si hay versión nueva.
 * - Repite la comprobación cada hora.
 * - Cuando hay una versión preparada, activa el SW y recarga la página
 *   automáticamente para que el usuario nunca quede atrapado en una
 *   versión cacheada antigua.
 * - Si el SW detecta archivos corruptos/inconsistentes, recarga limpia.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    const stable$ = this.appRef.isStable.pipe(first((s) => s));
    const everyHour$ = interval(60 * 60 * 1000);
    concat(stable$, everyHour$).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {
        /* ignore */
      });
    });

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(async () => {
        try {
          await this.swUpdate.activateUpdate();
        } finally {
          document.location.reload();
        }
      });

    this.swUpdate.unrecoverable.subscribe(() => {
      document.location.reload();
    });
  }
}
