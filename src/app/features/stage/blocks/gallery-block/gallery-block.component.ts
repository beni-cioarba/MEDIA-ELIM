import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG, MediaEvent } from '../../../../core/church.config';
import { PresentationService } from '../../../../core/presentation.service';
import { CarouselService } from '../../../../core/services/carousel.service';
import { ClockService } from '../../../../core/services/clock.service';
import { driveFolderUrl } from '../../../../core/util/drive-folder';
import { DockOverlapService } from '../../../../shared/floating-actions/dock-overlap.service';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { ShareButtonComponent } from '../../../../shared/share-button/share-button.component';

/** Lo que dura cada evento destacado en la web (lectura con calma). */
const DWELL_WEB_MS = 6_000;
/** En proyección el bloque tiene un tiempo fijo: rota más rápido para enseñar más. */
const DWELL_PROJECTION_MS = 4_500;
/** Franja inferior de la ventana que ocupa el dock flotante (y un margen). */
const DOCK_BAND_PX = 96;

/**
 * Bloque «Galería»: escenario con el evento destacado + carril con todos los
 * eventos (lista vertical a la derecha en escritorio, tira horizontal con
 * scroll en móvil). Escala a cualquier número de eventos sin cambiar el
 * marcado: el carril se desplaza, el escenario no crece. Ver
 * `docs/ai/40-styling.md` § Galería.
 *
 *  - **Un solo reloj**: el final de la animación de la barra de progreso del
 *    evento activo (`animationend`) pasa al siguiente. Pausar es
 *    `animation-play-state`, así que barra y cambio nunca se desacompasan
 *    (mismo patrón que `HeroCarouselComponent`).
 *  - Se para con el botón (WCAG 2.2.2), con foco de teclado dentro, fuera
 *    de pantalla, con la pestaña oculta y, proyectando, cuando la galería no
 *    es la diapositiva visible. El ratón encima **no** la para: el bloque
 *    llena la pantalla y el puntero casi siempre está sobre él.
 *  - `prefers-reduced-motion`: en la web no hay auto-avance.
 *  - La foto se ve **entera** (`contain`) sobre un fondo ambiental hecho con
 *    su propia miniatura desenfocada: nunca corta cabezas, sea cual sea la
 *    proporción del hueco.
 */
@Component({
  selector: 'app-gallery-block',
  imports: [TranslatePipe, IconComponent, ShareButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-block.component.html',
  styles: [':host { display: contents; }'],
})
export class GalleryBlockComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly presentation = inject(PresentationService);
  private readonly carousel = inject(CarouselService);
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dockOverlap = inject(DockOverlapService);

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  protected readonly fullscreen = this.presentation.isFullscreen;
  protected readonly events = this.config.mediaEvents;
  protected readonly total = this.events.length;

  protected readonly index = signal(0);
  protected readonly featured = computed<MediaEvent | null>(() => this.events[this.index()] ?? null);
  /** El destacado como lista de uno: la foto se re-monta (y funde) al cambiar. */
  protected readonly featuredList = computed(() => {
    const ev = this.featured();
    return ev ? [ev] : [];
  });

  protected readonly dwellMs = computed(() =>
    this.fullscreen() ? DWELL_PROJECTION_MS : DWELL_WEB_MS,
  );

  private readonly reducedMotion = prefersReducedMotion();
  /** Hay auto-avance (y por tanto barra y botón de pausa). */
  protected readonly autoplay = computed(
    () => this.total > 1 && (this.fullscreen() || !this.reducedMotion),
  );

  protected readonly userPaused = signal(false);
  private readonly hold = signal(false);
  private readonly inView = signal(true);

  protected readonly paused = computed(
    () =>
      !this.autoplay() ||
      this.userPaused() ||
      this.hold() ||
      !this.inView() ||
      !this.clock.pageVisible() ||
      (this.fullscreen() && !this.carousel.isBlockActive('gallery')),
  );

  protected swipeX: number | null = null;

  constructor() {
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(([entry]) => this.inView.set(entry.isIntersecting));
      // El dock flotante se sienta en la esquina inferior derecha, encima del
      // último evento del carril. Mientras el cuerpo de la galería llega a esa
      // franja, se retira (la cabecera ya ofrece «compartir»). Varios umbrales
      // para que el aviso llegue al entrar y al salir de la franja.
      const dock = new IntersectionObserver(
        ([entry]) => {
          const r = entry.boundingClientRect;
          const overlaps =
            !this.fullscreen() &&
            entry.isIntersecting &&
            r.bottom > window.innerHeight - DOCK_BAND_PX;
          this.dockOverlap.report('gallery', overlaps);
        },
        { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] },
      );
      // `display: contents` no tiene caja: se observa el bloque real.
      queueMicrotask(() => {
        const root = this.host.nativeElement;
        const el = root.querySelector('.gallery');
        const body = root.querySelector('.gallery__body');
        if (el) io.observe(el);
        if (body) dock.observe(body);
      });
      this.destroyRef.onDestroy(() => {
        io.disconnect();
        dock.disconnect();
        this.dockOverlap.report('gallery', false);
      });
    }
    this.preload(1);
  }

  /** Fin de la barra del evento activo: es la señal de pasar al siguiente. */
  protected onProgressEnd(event: AnimationEvent, i: number): void {
    if (!event.animationName.endsWith('gallery-progress') || i !== this.index()) return;
    this.step(1);
  }

  protected select(i: number): void {
    if (i === this.index()) return;
    this.index.set(i);
    this.revealInRail(i);
    this.preload((i + 1) % this.total);
  }

  protected step(delta: number): void {
    if (this.total < 2) return;
    this.select((this.index() + delta + this.total) % this.total);
  }

  protected togglePause(): void {
    this.userPaused.update((v) => !v);
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    this.hold.set(!!target?.matches?.(':focus-visible'));
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const root = this.host.nativeElement.querySelector('.gallery');
    if (!next || !root?.contains(next)) this.hold.set(false);
  }

  protected onArrow(event: Event, delta: number): void {
    event.preventDefault();
    this.step(delta);
  }

  /** Deslizar sobre la foto cambia de evento (sólo dedo; ver `data-no-swipe`). */
  protected swipeStart(event: PointerEvent): void {
    this.swipeX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeX === null) return;
    const dx = event.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) >= 48) this.step(dx < 0 ? 1 : -1);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Subcarpeta del evento; si su ID falta o no es válido, la carpeta principal. */
  protected driveHref(ev: MediaEvent): string {
    return driveFolderUrl(ev.driveFolderId, this.config.mediaGalleryUrl);
  }

  protected srcset(ev: MediaEvent): string {
    return `${ev.medium} 960w, ${ev.image} 1600w`;
  }

  /**
   * Descarga ya la foto del siguiente evento (con el mismo `srcset`/`sizes`
   * que el escenario, para que el navegador elija la misma variante): al
   * llegar su turno está en caché y el fundido no enseña el hueco.
   */
  private preload(i: number): void {
    const ev = this.events[i];
    if (!ev || typeof Image !== 'function') return;
    const img = new Image();
    img.sizes = '(min-width: 1025px) 75vw, 100vw';
    img.srcset = this.srcset(ev);
    img.src = ev.image;
  }

  /**
   * Lleva el evento activo a la vista **dentro del carril** (no mueve la
   * página: `scrollIntoView` desplazaría también el documento).
   */
  private revealInRail(i: number): void {
    const rail = this.rail()?.nativeElement;
    if (!rail || !this.inView()) return;
    const item = rail.children[i] as HTMLElement | undefined;
    if (!item) return;
    const behavior: ScrollBehavior = this.reducedMotion ? 'auto' : 'smooth';
    const vertical = rail.scrollHeight > rail.clientHeight + 1;
    if (vertical) {
      const top = item.offsetTop - (rail.clientHeight - item.offsetHeight) / 2;
      rail.scrollTo({ top, behavior });
    } else {
      const left = item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2;
      rail.scrollTo({ left, behavior });
    }
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
