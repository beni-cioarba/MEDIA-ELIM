import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggerService } from '../services/logger.service';
import { isChunkLoadError } from './chunk-load-error';
import { StaleBuildRecovery } from './stale-build-recovery';

/**
 * Último destino de cualquier error que nadie ha recogido: de plantilla, de
 * un `effect`, de una promesa rechazada o de `window.onerror` (estos dos
 * llegan por `provideBrowserGlobalErrorListeners()` en `app.config.ts`).
 *
 * Hace dos cosas, y sólo dos:
 *  1. Si es un chunk que no existe, sale de la versión caducada con una carga
 *     completa (`StaleBuildRecovery`).
 *  2. Lo demás lo deja en el `LoggerService`, que es el único sitio donde se
 *     enganchará la telemetría si algún día la hay.
 *
 * Nunca relanza: un error en un bloque no debe tumbar el resto de la app.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly log = inject(LoggerService).prefix('error');
  private readonly recovery = inject(StaleBuildRecovery);

  handleError(error: unknown): void {
    if (isChunkLoadError(error) && this.recovery.reload()) return;
    this.log.error('Error no controlado', error);
  }
}
