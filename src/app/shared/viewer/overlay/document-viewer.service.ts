import { Injectable } from '@angular/core';
import { ViewerDocument } from '../core/viewer-document.model';
import { LazyOverlay } from './lazy-overlay';

/**
 * Abre el visor documental a pantalla completa:
 *
 *   inject(DocumentViewerService).open(documentos, índice);
 *
 * Con varios documentos se puede pasar de uno a otro (‹ › y ← →). El visor,
 * sus motores y pdf.js se descargan la primera vez que se abre; este
 * servicio es lo único que queda en el bundle de quien lo usa.
 */
@Injectable({ providedIn: 'root' })
export class DocumentViewerService {
  private readonly overlay = new LazyOverlay(() =>
    import('./document-viewer-overlay.component').then((m) => m.DocumentViewerOverlayComponent),
  );

  open(documents: readonly ViewerDocument[], index = 0): Promise<void> {
    if (!documents.length) return Promise.resolve();
    return this.overlay.open({
      documents,
      startIndex: Math.min(Math.max(index, 0), documents.length - 1),
    });
  }

  close(): void {
    this.overlay.close();
  }
}
