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
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { IconComponent } from '../../icon/icon.component';
import { resolveCategory } from '../core/document-category';
import { ViewerDocument, displayName } from '../core/viewer-document.model';

/** Preferencias recordadas entre aperturas (como el visor de CemenWEB). */
const THUMBS_KEY = 'gallery-viewer:thumbnails';
const AUTOPLAY_KEY = 'gallery-viewer:autoplay';

/** Paso de la autorreproducción (el mismo que la galería de CemenWEB). */
const AUTOPLAY_MS = 4000;

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.5;
/** Desplazamiento horizontal mínimo (px) para que un deslizamiento cambie de imagen. */
const SWIPE_PX = 60;

/** Gesto en curso sobre la imagen. */
type Gesture =
  | { readonly kind: 'pan'; readonly x: number; readonly y: number; readonly tx: number; readonly ty: number }
  | { readonly kind: 'pinch'; readonly distance: number; readonly scale: number }
  | { readonly kind: 'swipe'; readonly x: number; readonly y: number };

/**
 * Galería de imágenes a pantalla completa (la otra forma de ver fotos; el
 * visor por defecto es el documental, `DocumentViewerService`).
 *
 * Adaptado del visor de la galería de CemenWEB (`atm-gallery`): ocupa toda la
 * ventana (fondo negro, entrada con fundido), cierra con la X o `Esc`, barra
 * de progreso segmentada arriba (estilo WhatsApp), flechas en bucle (también
 * con ← →), pie de foto con título y descripción sobre degradado, y barra
 * inferior con miniaturas y autorreproducción (ambas recordadas), contador,
 * título, fecha y pantalla completa real del sistema.
 *
 * Añadido aquí: zoom (rueda, doble clic, pellizco y botones), arrastrar la
 * imagen ampliada, deslizar con el dedo para cambiar, descargar, abrir en
 * pestaña nueva y **PDF** con el visor nativo del navegador (sin librerías);
 * donde el navegador no lo pinta (Chrome de Android) se ofrece abrirlo o
 * descargarlo.
 *
 * Es un `<dialog>` modal: vive en la *top layer* (nada lo recorta), el resto
 * de la página queda inerte y el foco no se escapa. No se usa directamente:
 * lo crea y destruye `GalleryViewerService`.
 */
@Component({
  selector: 'app-gallery-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './gallery-viewer.component.html',
  styleUrl: './gallery-viewer.component.scss',
})
export class GalleryViewerComponent {
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly language = inject(LanguageService);

  readonly items = input.required<readonly ViewerDocument[]>();
  readonly startIndex = input(0);
  /** El visor se ha cerrado (el servicio lo destruye). */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly image = viewChild<ElementRef<HTMLImageElement>>('image');
  private readonly thumbs = viewChild<ElementRef<HTMLElement>>('thumbs');

  // ------------------------------------------------------------------
  // Elemento actual
  // ------------------------------------------------------------------

  protected readonly index = linkedSignal(() => this.startIndex());
  protected readonly item = computed(() => this.items()[this.index()]);
  protected readonly kind = computed(() => (resolveCategory(this.item()) === 'pdf' ? 'pdf' : 'image'));
  /** Título del elemento (pie de foto y barra). */
  protected readonly title = computed(() => this.item().name ?? null);
  protected readonly multiple = computed(() => this.items().length > 1);

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  /** Fecha del elemento en el idioma activo. */
  protected readonly date = computed(() => {
    const iso = this.item().date;
    if (!iso) return null;
    const locale = this.language.current() === 'es' ? 'es-ES' : 'ro-RO';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(`${iso}T12:00:00`),
    );
  });

  /**
   * El PDF se pinta con el visor del navegador. Donde no lo hay
   * (`pdfViewerEnabled === false`, p. ej. Chrome de Android) se ofrece
   * abrirlo o descargarlo en vez de un marco en blanco.
   */
  protected readonly pdfInline =
    typeof navigator === 'undefined' || (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;

  /** URL del PDF para el `<iframe>`. Las URLs vienen del código de la app, no del usuario. */
  protected readonly pdfUrl = computed<SafeResourceUrl | null>(() =>
    this.kind() === 'pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(`${this.item().src}#view=FitH`) : null,
  );

  protected readonly downloadName = computed(
    () => this.item().downloadName ?? displayName(this.item()),
  );

  // ------------------------------------------------------------------
  // Preferencias: miniaturas y autorreproducción
  // ------------------------------------------------------------------

  protected readonly showThumbs = signal(readFlag(THUMBS_KEY));
  protected readonly autoplay = signal(readFlag(AUTOPLAY_KEY));

  protected toggleThumbs(): void {
    this.showThumbs.update((v) => !v);
    saveFlag(THUMBS_KEY, this.showThumbs());
  }

  protected toggleAutoplay(): void {
    this.autoplay.update((v) => !v);
    saveFlag(AUTOPLAY_KEY, this.autoplay());
  }

  /** La autorreproducción sólo corre con varias imágenes y sin zoom. */
  protected readonly playing = computed(
    () => this.autoplay() && this.multiple() && this.scale() === 1 && this.kind() === 'image',
  );

  // ------------------------------------------------------------------
  // Zoom y desplazamiento
  // ------------------------------------------------------------------

  protected readonly maxScale = MAX_SCALE;
  protected readonly scale = signal(1);
  protected readonly tx = signal(0);
  protected readonly ty = signal(0);
  /** Arrastrando: sin transición (la imagen sigue al dedo al instante). */
  protected readonly dragging = signal(false);
  protected readonly zoomed = computed(() => this.scale() > 1);

  protected readonly transform = computed(
    () => `translate3d(${this.tx()}px, ${this.ty()}px, 0) scale(${this.scale()})`,
  );

  protected zoomIn(): void {
    this.zoomAt(this.scale() * ZOOM_STEP);
  }

  protected zoomOut(): void {
    this.zoomAt(this.scale() / ZOOM_STEP);
  }

  protected resetZoom(): void {
    this.scale.set(1);
    this.tx.set(0);
    this.ty.set(0);
  }

  /**
   * Cambia el zoom manteniendo quieto el punto `(clientX, clientY)` (el del
   * cursor o el centro del pellizco); sin punto, el centro de la pantalla.
   */
  private zoomAt(next: number, clientX?: number, clientY?: number): void {
    const scale = clamp(next, MIN_SCALE, MAX_SCALE);
    if (scale === MIN_SCALE) {
      this.resetZoom();
      return;
    }
    const rect = this.stage().nativeElement.getBoundingClientRect();
    const px = (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
    const py = (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
    const ratio = scale / this.scale();
    this.scale.set(scale);
    this.setPan(px - (px - this.tx()) * ratio, py - (py - this.ty()) * ratio);
  }

  /** Desplaza sin dejar que la imagen se salga de la pantalla. */
  private setPan(x: number, y: number): void {
    const img = this.image()?.nativeElement;
    const stage = this.stage().nativeElement;
    if (!img) return;
    const maxX = Math.max(0, (img.offsetWidth * this.scale() - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * this.scale() - stage.clientHeight) / 2);
    this.tx.set(clamp(x, -maxX, maxX));
    this.ty.set(clamp(y, -maxY, maxY));
  }

  // ------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------

  protected go(index: number): void {
    const n = this.items().length;
    this.index.set(((index % n) + n) % n);
  }

  protected next(): void {
    this.go(this.index() + 1);
  }

  protected prev(): void {
    this.go(this.index() - 1);
  }

  // ------------------------------------------------------------------
  // Pantalla completa real del sistema (además de ocupar la ventana)
  // ------------------------------------------------------------------

  protected readonly canFullscreen = this.document.fullscreenEnabled === true;
  protected readonly fullscreen = signal(false);

  protected toggleFullscreen(): void {
    if (this.document.fullscreenElement) {
      void this.document.exitFullscreen();
    } else {
      void this.dialog().nativeElement.requestFullscreen().catch(() => undefined);
    }
  }

  // ------------------------------------------------------------------
  // Ciclo de vida
  // ------------------------------------------------------------------

  constructor() {
    const root = this.document.documentElement;
    const previousOverflow = root.style.overflow;
    const onFullscreen = () => this.fullscreen.set(this.document.fullscreenElement !== null);

    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      root.style.overflow = 'hidden';
      this.document.addEventListener('fullscreenchange', onFullscreen);
    });

    inject(DestroyRef).onDestroy(() => {
      root.style.overflow = previousOverflow;
      this.document.removeEventListener('fullscreenchange', onFullscreen);
      if (this.document.fullscreenElement) void this.document.exitFullscreen();
    });

    // Al cambiar de elemento: sin zoom, «cargando» y precarga de los vecinos.
    effect(() => {
      const index = this.index();
      untracked(() => {
        this.resetZoom();
        this.loading.set(this.kind() === 'image');
        this.failed.set(false);
        const items = this.items();
        if (items.length > 1) {
          for (const near of [items[(index + 1) % items.length], items[(index - 1 + items.length) % items.length]]) {
            if (resolveCategory(near) === 'image') new Image().src = near.src;
          }
        }
      });
    });

    // Autorreproducción: un plazo por imagen; se rehace al cambiar de imagen.
    effect((onCleanup) => {
      if (!this.playing()) return;
      this.index();
      const timer = setTimeout(() => this.next(), AUTOPLAY_MS);
      onCleanup(() => clearTimeout(timer));
    });

    // La miniatura activa, siempre a la vista.
    effect(() => {
      const index = this.index();
      const strip = this.thumbs()?.nativeElement;
      strip?.children[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** `Esc` cierra el visor (el `<dialog>` lo convierte en `cancel`). */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.multiple() && this.next(),
      ArrowLeft: () => this.multiple() && this.prev(),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '0': () => this.resetZoom(),
      f: () => this.canFullscreen && this.toggleFullscreen(),
    };
    const action = actions[event.key];
    if (!action || this.kind() === 'pdf') return;
    event.preventDefault();
    action();
  }

  // ------------------------------------------------------------------
  // Gestos: rueda, doble clic, arrastre, pellizco y deslizamiento
  // ------------------------------------------------------------------

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture: Gesture | null = null;

  protected onWheel(event: WheelEvent): void {
    if (this.kind() !== 'image') return;
    event.preventDefault();
    this.zoomAt(this.scale() * (event.deltaY < 0 ? 1.2 : 1 / 1.2), event.clientX, event.clientY);
  }

  protected onDoubleClick(event: MouseEvent): void {
    if (this.kind() !== 'image') return;
    if (this.zoomed()) this.resetZoom();
    else this.zoomAt(2.5, event.clientX, event.clientY);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.kind() !== 'image' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Las flechas y los enlaces son botones, no un gesto sobre la imagen.
    if ((event.target as Element).closest('button, a')) return;
    // La captura hace que el arrastre siga aunque el dedo salga del visor;
    // si el navegador la rechaza, el gesto funciona igual sin ella.
    try {
      this.stage().nativeElement.setPointerCapture(event.pointerId);
    } catch {
      /* puntero ya liberado */
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.gesture = { kind: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), scale: this.scale() };
    } else if (this.zoomed()) {
      this.gesture = { kind: 'pan', x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty() };
    } else {
      this.gesture = { kind: 'swipe', x: event.clientX, y: event.clientY };
    }
    this.dragging.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId) || !this.gesture) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = this.gesture;
    if (gesture.kind === 'pinch' && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt(gesture.scale * (distance / gesture.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (gesture.kind === 'pan') {
      this.setPan(gesture.tx + event.clientX - gesture.x, gesture.ty + event.clientY - gesture.y);
    } else if (gesture.kind === 'swipe' && this.multiple()) {
      // La imagen sigue al dedo en horizontal: se nota que se puede pasar.
      this.tx.set(event.clientX - gesture.x);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.pointers.delete(event.pointerId)) return;
    const gesture = this.gesture;
    if (gesture?.kind === 'swipe') {
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      this.tx.set(0);
      if (this.multiple() && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) this.next();
        else this.prev();
      }
    }
    // Al soltar un dedo del pellizco, el que queda sigue arrastrando.
    const [rest] = [...this.pointers.values()];
    this.gesture = rest && this.zoomed() ? { kind: 'pan', x: rest.x, y: rest.y, tx: this.tx(), ty: this.ty() } : null;
    this.dragging.set(this.gesture !== null);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Almacenamiento bloqueado o lleno: la preferencia dura sólo esta sesión.
  }
}
