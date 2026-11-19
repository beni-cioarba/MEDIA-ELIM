import { Injectable, inject, isDevMode } from '@angular/core';
import { firstError } from '../telemetry/telemetry';
import { TelemetryService } from '../telemetry/telemetry.service';
import { injectIsBrowser } from '../util/platform';

/**
 * Logger central de la aplicación.
 *
 * Motivación: hasta ahora los `try/catch` de `YouTubeService`,
 * `CalendarService` o `localStorage` se tragaban el error en silencio, lo que
 * hacía imposible diagnosticar un fallo durante un servicio en el templo.
 *
 * Comportamiento:
 *  - `debug` / `info` → sólo en desarrollo (ruido cero en producción).
 *  - `warn` / `error` → siempre, para que quede traza en la consola del
 *    portátil que proyecta si algo falla en directo.
 *
 * Uso recomendado — un logger con ámbito fijo por servicio:
 * ```ts
 * private readonly log = inject(LoggerService).prefix('youtube');
 * this.log.warn('JSON no disponible', err);
 * ```
 *
 * Punto de extensión: si algún día se añade telemetría remota (Sentry,
 * Application Insights…), se engancha **aquí** y no en 20 sitios distintos.
 */
export interface ScopedLogger {
  debug(message: string, ...context: readonly unknown[]): void;
  info(message: string, ...context: readonly unknown[]): void;
  warn(message: string, ...context: readonly unknown[]): void;
  error(message: string, ...context: readonly unknown[]): void;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly isBrowser = injectIsBrowser();
  private readonly telemetry = inject(TelemetryService);
  private readonly verbose = isDevMode() && this.isBrowser;

  debug(scope: string, message: string, ...context: readonly unknown[]): void {
    if (!this.verbose) return;
    console.debug(this.tag(scope), message, ...context);
  }

  info(scope: string, message: string, ...context: readonly unknown[]): void {
    if (!this.verbose) return;
    console.info(this.tag(scope), message, ...context);
  }

  warn(scope: string, message: string, ...context: readonly unknown[]): void {
    // En el prerender los avisos son lo esperado (sin red, sin manifiestos
    // que aún no existen): sólo ensucian el log del build. Los errores, sí.
    if (!this.isBrowser) return;
    console.warn(this.tag(scope), message, ...context);
  }

  error(scope: string, message: string, ...context: readonly unknown[]): void {
    console.error(this.tag(scope), message, ...context);
    // Al registro de errores sólo lo que es un `Error`: un fallo de red
    // (`HttpErrorResponse`: YouTube sin cuota, sin conexión) no lo es.
    const error = firstError(context);
    if (error) this.telemetry.error(error, scope, message);
  }

  /** Devuelve un logger que ya lleva el ámbito incorporado. */
  prefix(scope: string): ScopedLogger {
    return {
      debug: (message, ...context) => this.debug(scope, message, ...context),
      info: (message, ...context) => this.info(scope, message, ...context),
      warn: (message, ...context) => this.warn(scope, message, ...context),
      error: (message, ...context) => this.error(scope, message, ...context),
    };
  }

  private tag(scope: string): string {
    return `[elim:${scope}]`;
  }
}
