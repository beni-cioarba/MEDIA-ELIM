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
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { ViewerDocument, displayName } from '../core/viewer-document.model';
import { clampZoom } from '../core/zoom';

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
        (wheel)="onWheel($event)"
        (dblclick)="onDoubleClick($event)"
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
  /** Zoom pedido con la rueda, el doble clic o el pellizco (lo aplica el shell). */
  readonly zoomTo = output<number>();

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

    // Al volver a «ajustar» o al reducir, la imagen se recentra; ampliada, el
    // desplazamiento calculado al hacer zoom se ajusta a los nuevos límites.
    effect(() => {
      const scale = this.scale();
      untracked(() => {
        this.requested = null;
        if (scale <= 1) this.resetPan();
        else this.setPan(this.tx(), this.ty());
      });
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
  // Zoom directo (como la galería): rueda, doble clic y pellizco, con el
  // punto del cursor (o el centro del pellizco) quieto.
  // ------------------------------------------------------------------

  /**
   * Último zoom pedido y aún no aplicado. El shell lo devuelve como entrada
   * en el siguiente ciclo; una ráfaga de rueda (panel táctil, varias muescas
   * en un fotograma) leería entretanto el valor viejo y perdería pasos.
   */
  private requested: number | null = null;

  /** Zoom en porcentaje (ajustada = 100): el pedido si lo hay, si no el que se ve. */
  private percent(): number {
    return this.requested ?? this.scale() * 100;
  }

  /**
   * Pide el zoom `percent` dejando quieto el punto de pantalla dado. El
   * desplazamiento se calcula aquí y se ajusta a los límites cuando el shell
   * aplica la escala (efecto del constructor).
   */
  private zoomAt(target: number, clientX: number, clientY: number): void {
    const canvas = this.canvas()?.nativeElement;
    const percent = clampZoom(target);
    const ratio = percent / this.percent();
    // En el tope no se mueve nada (si no, la imagen se desplazaría sin ampliarse).
    if (!canvas || !Number.isFinite(ratio) || Math.abs(ratio - 1) < 0.005) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + rect.height / 2);
    this.tx.set(px - (px - this.tx()) * ratio);
    this.ty.set(py - (py - this.ty()) * ratio);
    this.requested = percent;
    this.zoomTo.emit(percent);
  }

  protected onWheel(event: WheelEvent): void {
    if (this.failed() || event.deltaY === 0) return;
    event.preventDefault();
    // Rueda del ratón: ±20 % por muesca. Pellizco del panel táctil (llega como
    // rueda con `ctrlKey`, en pasos pequeños y seguidos): proporcional al gesto.
    const factor = event.ctrlKey ? Math.exp(-event.deltaY / 100) : event.deltaY < 0 ? 1.2 : 1 / 1.2;
    this.zoomAt(this.percent() * factor, event.clientX, event.clientY);
  }

  /** Doble clic sobre la imagen: al 250 % en ese punto; ampliada, vuelve a ajustar. */
  protected onDoubleClick(event: MouseEvent): void {
    if (this.failed() || !(event.target as Element).closest('.image')) return;
    if (this.percent() > 100) {
      this.requested = 100;
      this.zoomTo.emit(100);
    } else {
      this.zoomAt(250, event.clientX, event.clientY);
    }
  }

  // ------------------------------------------------------------------
  // Arrastre (ratón, lápiz o dedo) cuando la imagen no cabe, y pellizco
  // ------------------------------------------------------------------

  private drag: { x: number; y: number; tx: number; ty: number; id: number } | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch: { distance: number; percent: number } | null = null;

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* puntero ya liberado: el gesto funciona igual */
    }
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, percent: this.percent() };
      this.drag = null;
      this.panning.set(false);
      return;
    }
    if (!this.pannable()) return;
    this.drag = { x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty(), id: event.pointerId };
    this.panning.set(true);
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt(this.pinch.percent * (distance / this.pinch.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.setPan(drag.tx + event.clientX - drag.x, drag.ty + event.clientY - drag.y);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
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
