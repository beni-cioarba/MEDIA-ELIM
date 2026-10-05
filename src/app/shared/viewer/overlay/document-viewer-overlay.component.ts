import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DocumentViewerComponent } from '../document-viewer/document-viewer.component';
import { ViewerDocument } from '../core/viewer-document.model';

/**
 * El visor documental como capa a tamaño completo del navegador (en
 * CemenWEB, `app-visor-overlay`): cubre cabecera y navegación de la web y da
 * toda la superficie al documento.
 *
 * Es un `<dialog>` modal: vive en la *top layer* (nada lo recorta), el resto
 * de la página queda inerte, el foco no se escapa y `Esc` lo cierra. Lleva
 * la lista de documentos: el *shell* sólo pide «anterior» y «siguiente»
 * (también con ← →). No se usa directamente: lo crea `DocumentViewerService`.
 */
@Component({
  selector: 'app-document-viewer-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocumentViewerComponent],
  template: `
    <dialog #dialog class="overlay" (cancel)="onCancel($event)" (close)="closed.emit()" (keydown)="onKeydown($event)">
      <app-document-viewer
        mode="overlay"
        [document]="current()"
        [navigable]="documents().length > 1"
        [hasPrev]="index() > 0"
        [hasNext]="index() < documents().length - 1"
        [position]="{ index: index(), total: documents().length }"
        (prev)="go(index() - 1)"
        (next)="go(index() + 1)"
        (closed)="close()"
      />
    </dialog>
  `,
  styles: `
    :host {
      display: contents;
    }

    .overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      max-width: none;
      height: 100dvh;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      background: #111315;
      overflow: hidden;
      overscroll-behavior: contain;

      &::backdrop {
        background: rgb(0 0 0 / 0.85);
      }

      &[open] {
        animation: overlay-in 180ms ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        &[open] {
          animation: none;
        }
      }
    }

    @keyframes overlay-in {
      from {
        opacity: 0;
      }
    }
  `,
})
export class DocumentViewerOverlayComponent {
  private readonly document = inject(DOCUMENT);

  readonly documents = input.required<readonly ViewerDocument[]>();
  readonly startIndex = input(0);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly index = linkedSignal(() => this.startIndex());
  protected readonly current = computed(() => this.documents()[this.index()]);

  constructor() {
    const root = this.document.documentElement;
    const previousOverflow = root.style.overflow;
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      root.style.overflow = 'hidden';
    });
    inject(DestroyRef).onDestroy(() => (root.style.overflow = previousOverflow));
  }

  protected go(index: number): void {
    if (index >= 0 && index < this.documents().length) this.index.set(index);
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** ← → entre documentos (salvo escribiendo o dentro de un reproductor). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, video, audio')) return;
    if (event.key === 'ArrowLeft' && this.index() > 0) {
      event.preventDefault();
      this.go(this.index() - 1);
    } else if (event.key === 'ArrowRight' && this.index() < this.documents().length - 1) {
      event.preventDefault();
      this.go(this.index() + 1);
    }
  }
}
