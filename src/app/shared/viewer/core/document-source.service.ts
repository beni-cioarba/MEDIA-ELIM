import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DocumentCategory, ViewerDocument, fileNameOf } from './viewer-document.model';

/** Tiempo máximo que se espera a que cargue lo que se va a imprimir. */
const PRINT_TIMEOUT_MS = 20000;

/**
 * Acciones sobre el fichero de un documento: descargar, imprimir y abrir en
 * una pestaña nueva. (En CemenWEB, `DocumentoVisorService`; aquí los ficheros
 * son estáticos y del mismo origen, así que no hace falta pedir blobs.)
 *
 * Imprimir no abre otra ventana: carga el documento en un `<iframe>` oculto y
 * lanza el diálogo de impresión del navegador desde él. Las imágenes van en
 * una página mínima que las encaja en el papel; los PDF, tal cual.
 */
@Injectable({ providedIn: 'root' })
export class DocumentSourceService {
  private readonly document = inject(DOCUMENT);

  /** URL absoluta (las rutas de la app son relativas al `<base href>`). */
  absolute(src: string): string {
    return new URL(src, this.document.baseURI).href;
  }

  download(doc: ViewerDocument): void {
    const link = this.document.createElement('a');
    link.href = this.absolute(doc.src);
    link.download = doc.downloadName ?? fileNameOf(doc.src);
    link.rel = 'noopener';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  openInTab(doc: ViewerDocument): void {
    this.document.defaultView?.open(this.absolute(doc.src), '_blank', 'noopener');
  }

  /**
   * Imprime imágenes y PDF. Si el navegador no deja imprimir desde el marco
   * (p. ej. un PDF en un navegador sin visor integrado), lo abre en una
   * pestaña para imprimirlo desde allí.
   */
  print(doc: ViewerDocument, category: DocumentCategory): void {
    const frame = this.document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';

    const cleanup = () => setTimeout(() => frame.remove(), 1000);
    const timeout = setTimeout(() => {
      frame.remove();
      this.openInTab(doc);
    }, PRINT_TIMEOUT_MS);

    const printFrame = () => {
      clearTimeout(timeout);
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        this.openInTab(doc);
      }
      cleanup();
    };

    if (category === 'image') {
      // Página mínima: la imagen encajada en el papel, sin márgenes de la web.
      frame.srcdoc = `<!doctype html><html><head><style>
        @page{margin:10mm}html,body{margin:0;height:100%}
        body{display:flex;align-items:center;justify-content:center}
        img{max-width:100%;max-height:100%;object-fit:contain}
        </style></head><body><img src="${this.absolute(doc.src).replace(/"/g, '&quot;')}"></body></html>`;
      frame.onload = () => {
        const img = frame.contentDocument?.querySelector('img');
        if (!img || img.complete) printFrame();
        else img.onload = img.onerror = printFrame;
      };
    } else {
      frame.src = this.absolute(doc.src);
      frame.onload = printFrame;
    }
    this.document.body.appendChild(frame);
  }
}
