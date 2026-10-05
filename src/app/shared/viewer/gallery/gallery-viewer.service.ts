import { Injectable } from '@angular/core';
import { ViewerDocument } from '../core/viewer-document.model';
import { LazyOverlay } from '../overlay/lazy-overlay';

/**
 * Abre la galería de imágenes a pantalla completa (estilo `atm-gallery` de
 * CemenWEB: progreso segmentado, miniaturas, autorreproducción):
 *
 *   inject(GalleryViewerService).open(imágenes, índice);
 *
 * Para ver un documento o una foto suelta con sus datos, el visor por
 * defecto es `DocumentViewerService`. La galería se carga bajo demanda.
 */
@Injectable({ providedIn: 'root' })
export class GalleryViewerService {
  private readonly overlay = new LazyOverlay(() =>
    import('./gallery-viewer.component').then((m) => m.GalleryViewerComponent),
  );

  open(items: readonly ViewerDocument[], index = 0): Promise<void> {
    if (!items.length) return Promise.resolve();
    return this.overlay.open({ items, startIndex: Math.min(Math.max(index, 0), items.length - 1) });
  }

  close(): void {
    this.overlay.close();
  }
}
