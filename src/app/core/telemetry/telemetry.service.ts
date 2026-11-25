import { DOCUMENT, Injectable, inject, isDevMode } from '@angular/core';
import { APP_VERSION } from '../../../environments/version';
import { injectIsBrowser } from '../util/platform';
import { TELEMETRY_CONFIG } from './telemetry.config';
import { sentryRelease } from './release';
import { RouteKey, externalReferrer, goatCounterUrl, isTrackableHost } from './telemetry';

/** Errores enviados como mucho por carga de página: un bucle no agota el cupo. */
const MAX_ERRORS_PER_LOAD = 10;

/**
 * Analítica sin cookies (GoatCounter) y registro de errores (Sentry).
 * Plan: `docs/ai/77-analitica-errores.md`.
 *
 * Sólo actúa **en el navegador, en producción, en el dominio publicado y sin
 * automatización** (`navigator.webdriver`: el smoke test no cuenta). Con un
 * servicio sin configurar (`TELEMETRY_CONFIG`), ese servicio no existe.
 *
 *  · `pageView` / `event`: una petición de imagen a GoatCounter, en reposo,
 *    sin `Referer` (la dirección de una página con datos no sale). Las
 *    herramientas del operador no se cuentan: la proyección no es una visita.
 *  · `error`: el SDK de Sentry se descarga **sólo cuando hay un error** (chunk
 *    propio); si no hay errores, no cuesta nada. Las herramientas sí reportan:
 *    es donde un fallo se nota en el templo.
 *
 * No inyecta nada del router ni el `LoggerService` (que la usa): el
 * `ErrorHandler` llega aquí y no puede haber ciclos.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(TELEMETRY_CONFIG);

  private readonly active = this.isActive(injectIsBrowser());
  private readonly countCode = this.active ? this.config.goatCounterCode : null;
  private readonly errorDsn = this.active ? this.config.sentryDsn : null;

  private current: RouteKey | null = null;
  private firstView = true;
  private errorsSent = 0;

  /** ¿Se cuentan visitas? (para la página legal y los tests). */
  get countsVisits(): boolean {
    return this.countCode !== null;
  }

  /** Página nueva (lo llama el enganche del router, `provideTelemetry`). */
  pageView(key: RouteKey): void {
    this.current = key;
    const code = this.countCode;
    if (!code || key.tool) return;
    const view = this.document.defaultView!;
    const referrer = this.firstView ? externalReferrer(this.document.referrer, view.location.origin) : undefined;
    this.firstView = false;
    // En reposo: el título lo pone la estrategia de títulos tras la navegación.
    this.idle(() =>
      this.send(
        goatCounterUrl(code, {
          path: key.path,
          // El de la web (`og:title`): el de la ventana de la app lleva otro orden.
          title: key.private
            ? undefined
            : (this.document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? this.document.title),
          referrer,
          screen: `${view.screen.width},${view.screen.height},${view.devicePixelRatio}`,
        }),
      ),
    );
  }

  /** Algo que el visitante hace (`pwa-instalata`, `aviso-activat`…). */
  event(name: string): void {
    const code = this.countCode;
    if (!code || this.current?.tool) return;
    this.idle(() => this.send(goatCounterUrl(code, { path: name, event: true })));
  }

  /** Un error de verdad (`LoggerService.error` con un `Error` dentro). */
  error(error: Error, scope: string, message: string): void {
    const dsn = this.errorDsn;
    if (!dsn || this.errorsSent >= MAX_ERRORS_PER_LOAD) return;
    this.errorsSent++;
    const route = this.current?.path ?? 'necunoscută';
    import('./sentry-reporter')
      .then(({ reportError }) =>
        reportError({ dsn, release: sentryRelease(APP_VERSION) }, error, { scope, message, route }),
      )
      // Nunca a `LoggerService`: un fallo aquí volvería aquí.
      .catch(() => undefined);
  }

  private isActive(isBrowser: boolean): boolean {
    if (!isBrowser || isDevMode()) return false;
    const view = this.document.defaultView;
    return !!view && isTrackableHost(view.location.hostname) && !view.navigator.webdriver;
  }

  private send(url: string): void {
    const img = new Image();
    // Sin `Referer`: la dirección de la página no viaja (botezuri, familias…).
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  }

  private idle(task: () => void): void {
    const view = this.document.defaultView as (Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }) | null;
    if (view?.requestIdleCallback) view.requestIdleCallback(task, { timeout: 4000 });
    else setTimeout(task, 1500);
  }
}
