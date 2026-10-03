import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { LoggerService } from './logger.service';

/** El PDF de una semana, tal como lo describe el manifiesto. */
export interface FamilyPdf {
  readonly presentedOn: string;
  /** URL absoluta (resuelta contra el `base href`). */
  readonly url: string;
  readonly pages: number;
  readonly bytes: number;
}

interface ManifestEntry {
  readonly presentedOn: string;
  readonly file: string;
  readonly pages: number;
  readonly bytes: number;
}

/** Lo escribe `scripts/generate-family-pdfs.mjs` al publicar. */
const MANIFEST = 'assets/family-prayer/pdf.json';

/**
 * Los PDF de «Rugăciune pentru familii» (uno por semana), para descargarlos.
 *
 * Los genera el despliegue (`scripts/generate-family-pdfs.mjs`) a partir de
 * las mismas diapositivas que se proyectan, y deja un **manifiesto** con las
 * semanas que tienen PDF. Este servicio sólo lee ese manifiesto: una semana
 * sin entrada no ofrece PDF, así que nunca hay un enlace roto. En local no
 * hay PDF hasta generarlos (`npm run pdf:familii -- --url <ng serve>`).
 *
 * El manifiesto se pide **una vez y sólo si alguien lo necesita** (la primera
 * vez que se monta un botón de PDF). No pasa por el service worker: se genera
 * después de la compilación y no está en su tabla, así que siempre llega
 * fresco de la red.
 */
@Injectable({ providedIn: 'root' })
export class FamilyPdfService {
  private readonly document = inject(DOCUMENT);
  private readonly log = inject(LoggerService).prefix('family-pdf');

  private readonly byWeek = signal<ReadonlyMap<string, FamilyPdf>>(new Map());
  private requested = false;

  /**
   * PDF de esa semana, o `null` si no tiene (o aún no se sabe). Lee una
   * señal: dentro de un `computed` se actualiza solo cuando llega el
   * manifiesto.
   */
  pdfFor(presentedOn: string): FamilyPdf | null {
    this.load();
    return this.byWeek().get(presentedOn) ?? null;
  }

  private load(): void {
    if (this.requested) return;
    this.requested = true;
    const base = this.document.baseURI;
    fetch(new URL(MANIFEST, base), { cache: 'no-cache' })
      .then((res) => (res.ok ? (res.json() as Promise<{ weeks?: ManifestEntry[] }>) : { weeks: [] }))
      .then(({ weeks = [] }) => {
        this.byWeek.set(
          new Map(
            weeks.map((entry) => [
              entry.presentedOn,
              {
                presentedOn: entry.presentedOn,
                url: new URL(entry.file, base).href,
                pages: entry.pages,
                bytes: entry.bytes,
              },
            ]),
          ),
        );
      })
      .catch((error: unknown) => this.log.warn('Sin manifiesto de PDF', error));
  }
}
