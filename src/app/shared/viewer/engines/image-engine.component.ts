import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { ViewerDocument, displayName } from '../core/viewer-document.model';

/**
 * Motor de imágenes (jpg, png, webp, svg…). Aplica el zoom, la rotación y el
 * ajuste que decide el *shell* y deja arrastrar la imagen cuando no cabe.
 *
 * «Ajustar» encaja la imagen entera en el área (también girada: con 90° o
 * 270° se intercambian los topes de ancho y alto). El zoom es relativo a ese
 * tamaño ajustado, como en el visor de CemenWEB.
 */
@Component({
  selector: 'app-image-engine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (failed()) {
      <div class="state state--error" role="alert">
        <app-icon class="state__icon" name="image" />
        <p>{{ 'doc_viewer.error' | translate }}</p>
        <button type="button" class="action" (click)="retry()">{{ 'doc_viewer.retry' | translate }}</button>
      </div>
    } @else {
      @if (loading()) {
        <div class="state state--overlay" role="status">
          <span class="spinner"></span>
          <p>{{ 'doc_viewer.loading' | translate }}</p>
        </div>
      }
      <div
        #canvas
        class="canvas"
        [class.canvas--pannable]="pannable()"
        [class.canvas--panning]="panning()"
        [style.--cw.px]="box().width"
        [style.--ch.px]="box().height"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
      >
        <img
          #image
          class="image"
          [class.image--ready]="!loading()"
          [class.image--quarter]="quarterTurn()"
          [src]="source()"
          [attr.srcset]="document().srcset ?? null"
          sizes="100vw"
          [alt]="document().alt ?? name()"
          [style.transform]="transform()"
          draggable="false"
          (load)="loading.set(false)"
          (error)="loading.set(false); failed.set(true)"
        />
      </div>
    }
  `,
  styleUrl: './image-engine.component.scss',
})
export class ImageEngineComponent {
  readonly document = input.required<ViewerDocument>();
  /** Porcentaje sobre el tamaño ajustado (100 = ajustada). */
  readonly zoom = input(100);
  readonly rotation = input(0);
  readonly fit = input(true);

  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly image = viewChild<ElementRef<HTMLImageElement>>('image');

  protected readonly name = computed(() => displayName(this.document()));
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  /** Contador para reintentar: cambia la URL y fuerza otra petición. */
  private readonly attempt = signal(0);

  protected readonly source = computed(() => {
    const src = this.document().src;
    const attempt = this.attempt();
    return attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${attempt}`;
  });

  /** Tamaño del área (para encajar la imagen girada). */
  protected readonly box = signal({ width: 0, height: 0 });
  protected readonly quarterTurn = computed(() => this.rotation() % 180 !== 0);

  protected readonly scale = computed(() => (this.fit() ? 1 : this.zoom() / 100));
  protected readonly tx = signal(0);
  protected readonly ty = signal(0);
  protected readonly panning = signal(false);
  protected readonly pannable = computed(() => this.scale() > 1);

  protected readonly transform = computed(
    () => `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()}) rotate(${this.rotation()}deg)`,
  );

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Documento nuevo: vuelta a empezar.
    effect(() => {
      this.document();
      untracked(() => {
        this.loading.set(true);
        this.failed.set(false);
        this.attempt.set(0);
        this.resetPan();
      });
    });

    // Al volver a «ajustar» o al reducir, la imagen se recentra.
    effect(() => {
      if (this.scale() <= 1) untracked(() => this.resetPan());
    });

    afterNextRender(() => {
      const el = this.canvas()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.box.set({ width: entry.contentRect.width, height: entry.contentRect.height }),
      );
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected retry(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.attempt.update((n) => n + 1);
  }

  // ------------------------------------------------------------------
  // Arrastre (ratón, lápiz o dedo) cuando la imagen no cabe
  // ------------------------------------------------------------------

  private drag: { x: number; y: number; tx: number; ty: number; id: number } | null = null;

  protected onPointerDown(event: PointerEvent): void {
    if (!this.pannable() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.drag = { x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty(), id: event.pointerId };
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* puntero ya liberado: el arrastre funciona igual */
    }
    this.panning.set(true);
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.setPan(drag.tx + event.clientX - drag.x, drag.ty + event.clientY - drag.y);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.drag?.id !== event.pointerId) return;
    this.drag = null;
    this.panning.set(false);
  }

  /** Desplaza sin que la imagen se pierda fuera del área. */
  private setPan(x: number, y: number): void {
    const img = this.image()?.nativeElement;
    if (!img) return;
    const { width, height } = this.box();
    const [w, h] = this.quarterTurn() ? [img.offsetHeight, img.offsetWidth] : [img.offsetWidth, img.offsetHeight];
    const maxX = Math.max(0, (w * this.scale() - width) / 2);
    const maxY = Math.max(0, (h * this.scale() - height) / 2);
    this.tx.set(Math.min(maxX, Math.max(-maxX, x)));
    this.ty.set(Math.min(maxY, Math.max(-maxY, y)));
  }

  private resetPan(): void {
    this.tx.set(0);
    this.ty.set(0);
  }
}
