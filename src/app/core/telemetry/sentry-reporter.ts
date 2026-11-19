import { captureException, dedupeIntegration, init, linkedErrorsIntegration, withScope } from '@sentry/browser';

/**
 * Envío de errores a Sentry. Chunk propio: lo importa `TelemetryService`
 * **sólo cuando hay un error**, así que una visita sin errores no lo baja.
 *
 * Mínimo a propósito: sin integraciones por defecto (ni migas de pan, ni
 * captura global —esa ya la hace Angular y llega por `LoggerService`—, ni
 * cabeceras ni URL de la petición), sin *replay* ni trazas. Lo que viaja: el
 * error con su pila, la versión, el patrón de la ruta y el navegador.
 */
let started = false;

export interface ReporterOptions {
  readonly dsn: string;
  readonly release: string;
}

export interface ErrorContext {
  readonly scope: string;
  readonly message: string;
  /** Patrón de la ruta (`/botezuri/:date/:slug`), nunca la dirección con datos. */
  readonly route: string;
}

export function reportError(options: ReporterOptions, error: Error, context: ErrorContext): void {
  if (!started) {
    init({
      dsn: options.dsn,
      release: options.release,
      environment: 'production',
      defaultIntegrations: false,
      integrations: [dedupeIntegration(), linkedErrorsIntegration()],
      maxBreadcrumbs: 0,
      beforeSend: (event) => {
        // Por si una versión futura añade la petición o el usuario: fuera.
        delete event.request;
        delete event.user;
        return event;
      },
    });
    started = true;
  }
  withScope((scope) => {
    scope.setTag('scope', context.scope);
    scope.setTag('route', context.route);
    scope.setTag('standalone', String(matchMedia('(display-mode: standalone)').matches));
    scope.setContext('mesaj', { text: context.message, browser: navigator.userAgent });
    captureException(error);
  });
}
