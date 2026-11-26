import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  Injector,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { IconComponent } from '../../icon/icon.component';
import { ViewerDocument } from '../core/viewer-document.model';
import { clampZoom } from '../core/zoom';

/** Medidas de una página a escala 1 y sin girar (puntos PDF). */
interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** Margen interior del área y separación entre páginas (px). */
const GUTTER = 16;

/**
 * pdf.js se sirve como **recurso estático** (`assets/pdfjs/`, lo copia el
 * build desde `node_modules`), no como chunk de la app: el Service Worker
 * precarga todos los `.js` de la app para cada visitante y pdf.js pesa
 * ~400 kB que casi nadie necesita; en `assets/` se cachea sólo al usarlo.
 * Build «legacy»: trae los polyfills para navegadores menos recientes
 * (iPhone con iOS antiguo, Android viejos), que en esta web abundan.
 */
let pdfJs: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfJs(baseUri: string): Promise<typeof import('pdfjs-dist')> {
  pdfJs ??= import(/* @vite-ignore */ new URL('assets/pdfjs/pdf.min.mjs', baseUri).href).then(
    (module: typeof import('pdfjs-dist')) => {
      module.GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', baseUri).href;
      return module;
    },
  );
  // Si falla (sin conexión), el siguiente intento vuelve a pedirlo.
  pdfJs.catch(() => (pdfJs = null));
  return pdfJs;
}

/**
 * pdf.js 5 usa `Promise.try` (ES2025). La `Promise` global de la app es la
 * de zone.js, que no lo tiene, y Safari anterior a la 18.2 tampoco: sin esto
 * el documento no llega a abrirse. Se añade sólo si falta.
 */
function ensurePromiseTry(): void {
  const P = Promise as PromiseConstructor & { try?: unknown };
  if (typeof P.try === 'function') return;
  Object.defineProperty(P, 'try', {
    configurable: true,
    writable: true,
    value: function <T>(this: PromiseConstructor, fn: (...args: unknown[]) => T, ...args: unknown[]) {
      return new this<T>((resolve) => resolve(fn(...args)));
    },
  });
}

/**
 * Motor PDF (pdf.js, como ng2-pdf-viewer en CemenWEB).
 *
 * · **Carga diferida**: pdf.js (y su *worker*) sólo se descargan al abrir
 *   el primer PDF; nunca están en el bundle ni en la precarga de la PWA.
 * · **Páginas bajo demanda**: cada página reserva su hueco con su tamaño real
 *   y sólo se pinta cuando se acerca a la vista (`IntersectionObserver`); un
 *   documento de cien páginas no pinta cien lienzos al abrirse. Al cambiar
 *   zoom o giro se repintan las visibles y las demás cuando lleguen.
 * · **Nítido**: el lienzo se pinta a la densidad de la pantalla.
 * · «Ajustar» = ancho de página; el zoom es relativo a él (como CemenWEB).
 * · Píldora de páginas abajo (actual / total, anterior y siguiente) y
 *   arrastre con el ratón para moverse por la página ampliada.
 * · **Zoom con Ctrl + rueda** (y el pellizco del panel táctil, que llega así),
 *   con el punto del cursor quieto. La rueda sola sigue desplazando las
 *   páginas, como en cualquier lector de PDF.
 */
@Component({
  selector: 'app-pdf-engine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (failed()) {
      <div class="state state--error" role="alert">
        <app-icon class="state__icon" name="file-text" />
        <p>{{ 'doc_viewer.error' | translate }}</p>
        <button type="button" class="action" (click)="load()">{{ 'doc_viewer.retry' | translate }}</button>
      </div>
    } @else {
      @if (loading()) {
        <div class="state state--overlay" role="status">
          <span class="spinner"></span>
          <p>{{ 'doc_viewer.loading' | translate }}</p>
        </div>
      }
      <div
        #scroller
        class="scroller"
        [class.scroller--panning]="panning()"
        (scroll)="onScroll()"
        (wheel)="onWheel($event)"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
      >
        @for (size of sizes(); track $index; let i = $index) {
          <div
            #page
            class="page"
            [attr.data-page]="i + 1"
            [style.width.px]="pageBox(size).width"
            [style.height.px]="pageBox(size).height"
          >
            <canvas class="page__canvas"></canvas>
          </div>
        }
      </div>

      @if (sizes().length > 1) {
        <div class="pager">
          <button type="button" class="pager__btn" [disabled]="current() <= 1" (click)="goTo(current() - 1)"
                  [attr.aria-label]="'doc_viewer.page_prev' | translate">
            <app-icon name="chevron-left" />
          </button>
          <span class="pager__text" aria-live="polite">{{ current() }} / {{ sizes().length }}</span>
          <button type="button" class="pager__btn" [disabled]="current() >= sizes().length" (click)="goTo(current() + 1)"
                  [attr.aria-label]="'doc_viewer.page_next' | translate">
            <app-icon name="chevron-right" />
          </button>
        </div>
      }
    }
  `,
  styleUrl: './pdf-engine.component.scss',
})
export class PdfEngineComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly source = input.required<ViewerDocument>({ alias: 'document' });
  readonly zoom = input(100);
  readonly rotation = input(0);
  readonly fit = input(true);
  /** Zoom pedido con Ctrl + rueda (lo aplica el shell). */
  readonly zoomTo = output<number>();

  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly pages = viewChildren<ElementRef<HTMLElement>>('page');

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly sizes = signal<readonly PageSize[]>([]);
  protected readonly current = signal(1);
  protected readonly panning = signal(false);

  /** Ancho útil del área (lo mide un `ResizeObserver`). */
  private readonly width = signal(0);

  private pdf: PDFDocumentProxy | null = null;
  private task: PDFDocumentLoadingTask | null = null;
  private observer: IntersectionObserver | null = null;
  /** Escala/giro con que está pintada cada página (para no repintar de más). */
  private readonly painted = new Map<number, string>();
  private readonly renders = new Map<number, RenderTask>();
  private readonly visible = new Set<number>();

  private readonly quarterTurn = computed(() => this.rotation() % 180 !== 0);

  /** Escala de pdf.js: la que ajusta la página más ancha, por el zoom. */
  protected readonly scale = computed(() => {
    const sizes = this.sizes();
    const available = this.width() - 2 * GUTTER;
    if (!sizes.length || available <= 0) return 1;
    const widest = Math.max(...sizes.map((s) => (this.quarterTurn() ? s.height : s.width)));
    return (available / widest) * (this.fit() ? 1 : this.zoom() / 100);
  });

  /** Tamaño en pantalla de una página (con el giro y la escala actuales). */
  protected pageBox(size: PageSize): PageSize {
    const scale = this.scale();
    return this.quarterTurn()
      ? { width: size.height * scale, height: size.width * scale }
      : { width: size.width * scale, height: size.height * scale };
  }

  constructor() {
    effect(() => {
      this.source();
      untracked(() => void this.load());
    });

    // Zoom, giro o ancho distintos: repintar las páginas visibles.
    effect(() => {
      this.scale();
      this.rotation();
      untracked(() => {
        this.requested = null;
        this.visible.forEach((n) => this.paint(n));
      });
    });

    // Cada vez que cambian los huecos de página, se vuelven a observar.
    effect(() => {
      const pages = this.pages();
      untracked(() => {
        this.observer?.disconnect();
        const root = this.scroller()?.nativeElement;
        if (!root || typeof IntersectionObserver === 'undefined') return;
        this.observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const n = Number((entry.target as HTMLElement).dataset['page']);
              if (entry.isIntersecting) {
                this.visible.add(n);
                this.paint(n);
              } else {
                this.visible.delete(n);
              }
            }
          },
          { root, rootMargin: '100% 0px' },
        );
        pages.forEach((page) => this.observer?.observe(page.nativeElement));
      });
    });

    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const resize = new ResizeObserver(([entry]) => this.width.set(entry.contentRect.width));
      resize.observe(el);
      this.destroyRef.onDestroy(() => resize.disconnect());
    });

    this.destroyRef.onDestroy(() => this.release());
  }

  /** Carga (o recarga) el documento. */
  protected async load(): Promise<void> {
    this.release();
    this.loading.set(true);
    this.failed.set(false);
    this.sizes.set([]);
    this.current.set(1);
    try {
      ensurePromiseTry();
      const pdfjs = await loadPdfJs(this.document.baseURI);
      const task = pdfjs.getDocument({ url: new URL(this.source().src, this.document.baseURI).href });
      this.task = task;
      const pdf = await task.promise;
      if (this.task !== task) {
        // Llegó tarde (ya se pidió otro documento): se libera por su tarea de
        // carga. pdf.js 6 quitó `PDFDocumentProxy.destroy()`; destruir la
        // tarea libera también el documento y su worker.
        void task.destroy();
        return;
      }
      this.pdf = pdf;
      const sizes: PageSize[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const viewport = (await pdf.getPage(n)).getViewport({ scale: 1 });
        sizes.push({ width: viewport.width, height: viewport.height });
      }
      this.sizes.set(sizes);
      this.loading.set(false);
    } catch (error) {
      // Cancelado al cambiar de documento o cerrar: no es un error.
      if ((error as Error)?.name === 'AbortException') return;
      this.loading.set(false);
      this.failed.set(true);
    }
  }

  /** Pinta la página `n` a la escala y giro actuales (si no lo está ya). */
  private async paint(n: number): Promise<void> {
    const pdf = this.pdf;
    const holder = this.pages()[n - 1]?.nativeElement;
    const canvas = holder?.querySelector('canvas');
    if (!pdf || !canvas) return;
    const scale = this.scale();
    const rotation = this.rotation();
    const key = `${scale.toFixed(4)}:${rotation}`;
    if (this.painted.get(n) === key) return;

    this.renders.get(n)?.cancel();
    const page = await pdf.getPage(n);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const viewport = page.getViewport({ scale: scale * dpr, rotation });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return;

    const task = page.render({ canvas, canvasContext: context, viewport });
    this.renders.set(n, task);
    try {
      await task.promise;
      this.painted.set(n, key);
    } catch {
      // Cancelado por un repintado posterior: lo hará ese.
    } finally {
      if (this.renders.get(n) === task) this.renders.delete(n);
    }
  }

  // ------------------------------------------------------------------
  // Página actual y navegación
  // ------------------------------------------------------------------

  /** Página actual = la que ocupa el centro del área. */
  protected onScroll(): void {
    const root = this.scroller()?.nativeElement;
    if (!root) return;
    const middle = root.scrollTop + root.clientHeight / 2;
    const pages = this.pages();
    let n = 1;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].nativeElement.offsetTop <= middle) n = i + 1;
    }
    this.current.set(n);
  }

  protected goTo(n: number): void {
    const page = this.pages()[n - 1]?.nativeElement;
    const root = this.scroller()?.nativeElement;
    if (!page || !root) return;
    root.scrollTo({ top: page.offsetTop - GUTTER, behavior: 'smooth' });
  }

  // ------------------------------------------------------------------
  // Zoom con Ctrl + rueda, con el punto del cursor quieto
  // ------------------------------------------------------------------

  /** Punto que debe quedar bajo el cursor cuando las páginas cambien de tamaño. */
  private anchor: { page: HTMLElement; fx: number; fy: number; x: number; y: number } | null = null;
  /** Último zoom pedido y aún no aplicado (se limpia al cambiar la escala). */
  private requested: number | null = null;

  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey || event.deltaY === 0) return;
    // Sin esto, Ctrl + rueda ampliaría la página entera del navegador.
    event.preventDefault();
    const root = this.scroller()?.nativeElement;
    if (!root || !this.sizes().length) return;
    // El pedido y aún no aplicado, si lo hay: en una ráfaga la entrada llega tarde.
    const current = this.requested ?? (this.fit() ? 100 : this.zoom());
    // Rueda: ±10 % por muesca (deltaY ≈ 100); panel táctil: proporcional.
    const factor = Math.abs(event.deltaY) >= 50 ? (event.deltaY < 0 ? 1.1 : 1 / 1.1) : Math.exp(-event.deltaY / 100);
    const target = clampZoom(current * factor);
    if (Math.abs(target - current) < 0.5) return;
    // El punto se fija sobre la **página** bajo el cursor (fracción de su ancho
    // y alto), no sobre el área: las páginas van centradas y con márgenes
    // fijos, así que el área no crece en proporción. Sólo el primer evento de
    // una ráfaga lo fija: los siguientes llegan antes del repintado.
    if (!this.anchor) {
      const page = this.pageAt(event.clientY);
      if (page) {
        const box = page.getBoundingClientRect();
        this.anchor = {
          page,
          fx: (event.clientX - box.left) / box.width,
          fy: (event.clientY - box.top) / box.height,
          x: event.clientX,
          y: event.clientY,
        };
      }
    }
    this.requested = target;
    this.zoomTo.emit(target);
    // Con el nuevo tamaño ya maquetado, devuelve ese punto bajo el cursor.
    afterNextRender(
      () => {
        const anchor = this.anchor;
        this.anchor = null;
        if (!anchor?.page.isConnected) return;
        const box = anchor.page.getBoundingClientRect();
        root.scrollLeft += box.left + anchor.fx * box.width - anchor.x;
        root.scrollTop += box.top + anchor.fy * box.height - anchor.y;
      },
      { injector: this.injector },
    );
  }

  /** Página a la altura `clientY` (o la más cercana). */
  private pageAt(clientY: number): HTMLElement | null {
    let best: HTMLElement | null = null;
    let distance = Infinity;
    for (const { nativeElement: page } of this.pages()) {
      const box = page.getBoundingClientRect();
      const d = clientY < box.top ? box.top - clientY : clientY > box.bottom ? clientY - box.bottom : 0;
      if (d < distance) [best, distance] = [page, d];
      if (d === 0) break;
    }
    return best;
  }

  // ------------------------------------------------------------------
  // Arrastre con el ratón (como `appPanScroll` de CemenWEB)
  // ------------------------------------------------------------------

  private drag: { x: number; y: number; left: number; top: number; id: number } | null = null;

  protected onPointerDown(event: PointerEvent): void {
    // El dedo ya desplaza de forma nativa; el arrastre es para el ratón.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if ((event.target as Element).closest('button, a')) return;
    const root = this.scroller()?.nativeElement;
    if (!root || (root.scrollHeight <= root.clientHeight + 1 && root.scrollWidth <= root.clientWidth + 1)) return;
    this.drag = { x: event.clientX, y: event.clientY, left: root.scrollLeft, top: root.scrollTop, id: event.pointerId };
    this.panning.set(true);
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    const root = this.scroller()?.nativeElement;
    if (!drag || !root || drag.id !== event.pointerId) return;
    root.scrollLeft = drag.left - (event.clientX - drag.x);
    root.scrollTop = drag.top - (event.clientY - drag.y);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.drag?.id !== event.pointerId) return;
    this.drag = null;
    this.panning.set(false);
  }

  /** Cancela lo pendiente y libera el documento (y el *worker*). */
  private release(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.renders.forEach((task) => task.cancel());
    this.renders.clear();
    this.painted.clear();
    this.visible.clear();
    const task = this.task;
    this.task = null;
    this.pdf = null;
    void task?.destroy();
  }
}
