
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  DOCUMENT
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { APP_PATHS } from '../../core/navigation/app-paths';
import {
  PresentationBlockId,
  PresentationBlockState,
  PresentationBlocksService,
  PresentationSlide,
} from '../../core/services/presentation-blocks.service';
import {
  DURATION_MAX_S,
  DURATION_MIN_S,
  PresentationDisplayService,
  QR_SIZES,
} from '../../core/services/presentation-display.service';
import { PresentationSyncService } from '../../core/services/presentation-sync.service';
import { ProjectionWindowService } from '../../core/services/projection-window.service';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/icon/icon.component';

/** Un bloque con sus diapositivas, para la lista lateral del panel. */
interface BlockGroup {
  readonly state: PresentationBlockState;
  readonly slides: readonly PresentationSlide[];
}

/**
 * **Panel de control** de la proyección (`/media/control`) — la «vista del
 * presentador», como en PowerPoint.
 *
 * Qué hace:
 *  - Abre la **ventana de proyección** (`ProjectionWindowService`), si puede
 *    directamente en la segunda pantalla, y la cierra.
 *  - Muestra la **vista previa** en vivo: un `<iframe>` con la propia ruta de
 *    proyección en modo `preview`. Es una instancia real del escenario, así
 *    que lo que ve el operador es exactamente lo que se proyecta; y si no hay
 *    ventana abierta, la vista previa hace de proyector para ensayar.
 *  - **Transporte** (anterior, pausa, siguiente, ir a…) y progreso de la
 *    diapositiva en curso, reflejando al líder por `PresentationSyncService`.
 *  - **Lista de diapositivas** agrupada por bloque, con interruptor, duración
 *    y casilla por anuncio; todo escribe en los mismos servicios que usa la
 *    ventana, que lo relee al instante (evento `storage`).
 *
 * El panel **no proyecta**: no se une a la elección de líder. Por eso puede
 * cerrarse o recargarse sin que la proyección se detenga.
 */
@Component({
    selector: 'app-presenter',
    imports: [TranslatePipe, DragDropModule, BrandLogoComponent, IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './presenter.component.html',
    styleUrl: './presenter.component.scss'
})
export class PresenterComponent implements OnInit {
  protected readonly blocks = inject(PresentationBlocksService);
  protected readonly display = inject(PresentationDisplayService);
  protected readonly sync = inject(PresentationSyncService);
  protected readonly projection = inject(ProjectionWindowService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  protected readonly qrSizes = QR_SIZES;
  protected readonly durationMin = DURATION_MIN_S;
  protected readonly durationMax = DURATION_MAX_S;
  protected readonly mediaLink = `/${APP_PATHS.media}`;

  /** El navegador bloqueó la ventana emergente: hay que permitir pop-ups. */
  protected readonly popupBlocked = signal<boolean>(false);

  /** URL de la vista previa (misma ruta de proyección en modo `preview`). */
  protected readonly previewUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    this.projection.projectionUrl(true),
  );

  /** Estado del líder (ventana o vista previa): índice, pausa, duración. */
  protected readonly state = this.sync.remoteState;
  protected readonly progress = this.sync.remoteProgress;

  /** Diapositivas activas, las mismas que recorre el líder. */
  protected readonly slides = this.blocks.activeSlides;

  protected readonly currentIndex = computed<number>(() => this.state()?.index ?? 0);
  protected readonly currentSlide = computed<PresentationSlide | null>(() => {
    const key = this.state()?.slideKey;
    return this.slides().find((s) => s.key === key) ?? this.slides()[this.currentIndex()] ?? null;
  });
  protected readonly nextSlide = computed<PresentationSlide | null>(() => {
    const list = this.slides();
    if (list.length < 2) return null;
    return list[(this.currentIndex() + 1) % list.length] ?? null;
  });
  protected readonly isPaused = computed<boolean>(() => this.state()?.paused ?? false);

  /** Segundos transcurridos y totales de la diapositiva en curso. */
  protected readonly elapsedS = computed<number>(() => {
    const s = this.state();
    if (!s) return 0;
    return Math.round(((this.progress() / 100) * s.durationMs) / 1000);
  });
  protected readonly durationS = computed<number>(() => Math.round((this.state()?.durationMs ?? 0) / 1000));

  /**
   * Bloques con **todas** sus diapositivas (también los anuncios ocultos, para
   * poder volver a marcarlos), para la lista lateral.
   */
  protected readonly groups = computed<readonly BlockGroup[]>(() =>
    this.blocks.states().map((state) => ({ state, slides: this.blocks.expand(state.id, 'panel') })),
  );

  ngOnInit(): void {
    this.document.title = this.translate.instant('presenter.title');
  }

  // ---- Ventana de proyección ------------------------------------------

  protected async open(target: 'here' | 'other-screen'): Promise<void> {
    const result = await this.projection.open(target);
    this.popupBlocked.set(result === 'blocked');
  }

  protected close(): void {
    this.projection.close();
  }

  /** La ventana al frente; si el panel no la tiene (se recargó) y no la recupera, la abre. */
  protected focusWindow(): void {
    if (!this.projection.focus()) void this.open('here');
  }

  /** La ventana de proyección (el líder) ocupa la pantalla completa nativa. */
  protected readonly isWindowFullscreen = computed<boolean>(
    () => this.sync.hasProjectionWindow() && (this.state()?.fullscreen ?? false),
  );

  /** Pantalla completa de la ventana desde aquí; si no hay ventana que mandar, la abre. */
  protected toggleFullscreen(): void {
    if (!this.projection.toggleFullscreen()) void this.open('here');
  }

  // ---- Transporte --------------------------------------------------------

  protected prev(): void {
    this.sync.sendCommand({ type: 'prev' });
  }

  protected next(): void {
    this.sync.sendCommand({ type: 'next' });
  }

  protected togglePause(): void {
    this.sync.sendCommand({ type: 'toggle' });
  }

  /** Índice en la rotación de la diapositiva de la lista (`-1` si no está activa). */
  private indexOf(slide: PresentationSlide): number {
    return this.slides().findIndex((s) => s.key === slide.key);
  }

  /** Ir a una diapositiva por su clave (sólo si está activa). */
  protected goTo(slide: PresentationSlide): void {
    const index = this.indexOf(slide);
    if (index >= 0) this.sync.sendCommand({ type: 'goto', index });
  }

  protected isCurrent(slide: PresentationSlide): boolean {
    return this.currentSlide()?.key === slide.key;
  }

  /** Posición 1-based de una diapositiva en la rotación, o `null` si no entra. */
  protected position(slide: PresentationSlide): number | null {
    const index = this.indexOf(slide);
    return index >= 0 ? index + 1 : null;
  }

  /** Rótulo humano de una diapositiva: anuncio, página o nombre del bloque. */
  protected label(slide: PresentationSlide): string {
    if (slide.announcement) return slide.announcement.title;
    const base = this.translate.instant(slide.titleKey);
    return slide.page ? `${base} · ${slide.page.index + 1}/${slide.page.total}` : base;
  }

  protected isAnnouncementVisible(slide: PresentationSlide): boolean {
    return this.blocks.visibleAnnouncements().some((a) => a.id === slide.announcement?.id);
  }

  // ---- Orden de los bloques -----------------------------------------------

  /** Soltar tras arrastrar (CDK): el nuevo orden se guarda y se proyecta ya. */
  protected dropped(event: CdkDragDrop<readonly BlockGroup[]>): void {
    this.blocks.moveBlock(event.previousIndex, event.currentIndex);
  }

  /**
   * Alternativa al arrastre con teclado: con el foco en el agarrador,
   * ↑ / ↓ mueven el bloque una posición (Inicio / Fin, al extremo).
   */
  protected onGripKeydown(event: KeyboardEvent, index: number): void {
    const last = this.groups().length - 1;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowUp':
        target = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        target = Math.min(last, index + 1);
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = last;
        break;
    }
    if (target === null || target === index) return;
    event.preventDefault();
    event.stopPropagation();
    this.blocks.moveBlock(index, target);
    // Mantener el foco en el mismo agarrador tras reordenar el DOM.
    queueMicrotask(() => {
      const grips = this.document.querySelectorAll<HTMLButtonElement>('.group__grip');
      grips[target as number]?.focus();
    });
  }

  // ---- Ajustes ------------------------------------------------------------

  /** Segundos escritos a mano: se acotan a los límites y se guardan al salir del campo. */
  protected setDuration(id: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const seconds = Number(input.value);
    if (Number.isFinite(seconds) && input.value.trim() !== '') {
      this.display.setDuration(id, seconds);
    }
    // Reflejar el valor efectivo (acotado o restaurado) en el campo.
    input.value = String(this.display.durationFor(id));
  }

  /** Intro en el campo de segundos: confirmar (dispara `change`) y soltar el foco. */
  protected commitDuration(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  protected setEnabled(id: PresentationBlockId, event: Event): void {
    this.blocks.setEnabled(id, (event.target as HTMLInputElement).checked);
  }

  protected setAnnouncementVisible(id: string, event: Event): void {
    this.blocks.setAnnouncementVisible(id, (event.target as HTMLInputElement).checked);
  }

  protected setQrVisible(event: Event): void {
    this.display.setQrVisible((event.target as HTMLInputElement).checked);
  }

  protected resetAll(): void {
    this.blocks.resetAll();
    this.display.resetDurations();
  }

  protected format(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Atajos del operador, idénticos a los de la proyección. Se ignoran cuando
   * el foco está en un control (un botón enfocado ya reacciona a Espacio).
   */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(target.tagName)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      this.sync.sendCommand({ type: 'goto', index: Number(event.key) - 1 });
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        this.prev();
        break;
      case ' ':
        event.preventDefault();
        this.togglePause();
        break;
      case 'q':
      case 'Q':
        event.preventDefault();
        this.display.toggleQr();
        break;
    }
  }
}
