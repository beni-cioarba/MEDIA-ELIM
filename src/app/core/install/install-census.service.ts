import { DOCUMENT, Injectable, inject } from '@angular/core';
import { PwaInstallService } from '../services/pwa-install.service';
import { TelemetryService } from '../telemetry/telemetry.service';

/** Margen para que Chromium ofrezca su aviso antes de contar. */
const SETTLE_MS = 4_000;

/**
 * Censo anónimo: **cuántos** entran desde la app y cuántos desde el navegador,
 * por sistema. Un evento por carga (GoatCounter agrupa los de una misma visita);
 * ningún identificador y nada leído del dispositivo (ver `censusEvent`).
 */
@Injectable({ providedIn: 'root' })
export class InstallCensusService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly pwa = inject(PwaInstallService);
  private readonly telemetry = inject(TelemetryService);
  private started = false;

  start(): void {
    if (this.started || !this.window) return;
    this.started = true;
    this.window.setTimeout(() => {
      void this.pwa.checked.then(() => this.telemetry.event(this.pwa.census()));
    }, SETTLE_MS);
  }
}
