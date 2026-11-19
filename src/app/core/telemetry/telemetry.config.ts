import { InjectionToken } from '@angular/core';

/**
 * Analítica sin cookies (GoatCounter) y registro de errores (Sentry).
 * Plan y porqués: `docs/ai/77-analitica-errores.md`.
 *
 * **Vacío = apagado.** Mientras un valor sea `null`, la web no habla con ese
 * servicio y la página legal no lo menciona. Activarlo es rellenar el valor:
 *  · `goatCounterCode`: el código del sitio (`<código>.goatcounter.com`).
 *  · `sentryDsn`: el DSN del proyecto de Sentry (con región de datos UE).
 * Los dos son públicos por naturaleza: viajan en el navegador de cada visita.
 */
export interface TelemetryConfig {
  readonly goatCounterCode: string | null;
  readonly sentryDsn: string | null;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  goatCounterCode: 'elim',
  sentryDsn: 'https://ccded9fe7f439515d6d66121c9ea5ed2@o4512458149789696.ingest.de.sentry.io/4512458173841488',
};

export const TELEMETRY_CONFIG = new InjectionToken<TelemetryConfig>('TELEMETRY_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_TELEMETRY_CONFIG,
});
