import { Injectable, isDevMode } from '@angular/core';

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
  private readonly verbose = isDevMode();

  debug(scope: string, message: string, ...context: readonly unknown[]): void {
    if (!this.verbose) return;
    console.debug(this.tag(scope), message, ...context);
  }

  info(scope: string, message: string, ...context: readonly unknown[]): void {
    if (!this.verbose) return;
    console.info(this.tag(scope), message, ...context);
  }

  warn(scope: string, message: string, ...context: readonly unknown[]): void {
    console.warn(this.tag(scope), message, ...context);
  }

  error(scope: string, message: string, ...context: readonly unknown[]): void {
    console.error(this.tag(scope), message, ...context);
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
