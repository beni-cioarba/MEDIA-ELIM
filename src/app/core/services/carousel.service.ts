import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ClockService } from './clock.service';
import {
  PresentationBlockId,
  PresentationBlocksService,
  PresentationSlide,
} from './presentation-blocks.service';
import { PresentationDisplayService } from './presentation-display.service';
import { PresentationService } from '../presentation.service';

/**
 * Motor del carrusel de la presentación.
 *
 * Sustituye al bucle `requestAnimationFrame` + `setInterval(250)` que vivía
 * dentro de `HomeComponent`: ahora un único `effect` arranca y para el rAF de
 * forma declarativa cuando cambia el modo presentación, la pausa, la
 * visibilidad de la pestaña, el conjunto de diapositivas o la duración.
 *
 * Trabaja siempre sobre `PresentationBlocksService.activeSlides()`: los
 * bloques desactivados no existen para el carrusel (ni se muestran, ni cuentan
 * en los dots, ni en los atajos) y los bloques paginados (anuncios, eventos)
 * aparecen expandidos en una diapositiva por anuncio o por página.
 *
 * Cada diapositiva dura lo que fije `PresentationDisplayService` para su
 * bloque (los anuncios, más; una lista de redes, menos). Como la duración es
 * una signal, cambiarla desde el panel reinicia el temporizador al momento.
 */
@Injectable({ providedIn: 'root' })
export class CarouselService {
  private readonly presentation = inject(PresentationService);
  private readonly blocks = inject(PresentationBlocksService);
  private readonly clock = inject(ClockService);
  private readonly display = inject(PresentationDisplayService);

  /** Índice solicitado; se recorta contra el número real de diapositivas. */
  private readonly requestedIndex = signal<number>(0);
  private readonly _isPaused = signal<boolean>(false);
  private readonly _progress = signal<number>(0);

  /** Diapositivas proyectables, en orden. */
  readonly slides = this.blocks.activeSlides;
  readonly count = computed<number>(() => this.slides().length);

  readonly currentIndex = computed<number>(() => {
    const total = this.count();
    if (total === 0) return 0;
    return Math.min(this.requestedIndex(), total - 1);
  });

  readonly currentSlide = computed<PresentationSlide | null>(
    () => this.slides()[this.currentIndex()] ?? null,
  );

  readonly isPaused = this._isPaused.asReadonly();

  /** Progreso 0-100 de la diapositiva actual hacia la siguiente. */
  readonly progress = this._progress.asReadonly();

  /** Duración (ms) de la diapositiva actual, según su bloque. */
  readonly currentDurationMs = computed<number>(() => {
    const block = this.currentSlide()?.block;
    return block ? this.display.durationFor(block) * 1000 : 0;
  });

  constructor() {
    effect(
      (onCleanup) => {
        const running =
          this.presentation.isFullscreen() &&
          !this._isPaused() &&
          this.clock.pageVisible() &&
          this.count() > 1;

        // Leer el índice y la duración hace que el temporizador se reinicie
        // limpiamente cada vez que se cambia de diapositiva (manual o
        // automáticamente) o el operador ajusta el tiempo del bloque.
        this.currentIndex();
        const durationMs = this.currentDurationMs();

        this._progress.set(0);
        if (!running || durationMs <= 0) return;

        let rafId = 0;
        let last: number | null = null;
        let elapsed = 0;

        const tick = (timestamp: number) => {
          if (last === null) last = timestamp;
          elapsed += timestamp - last;
          last = timestamp;

          if (elapsed >= durationMs) {
            this._progress.set(0);
            this.next();
            return; // el effect se re-ejecuta y arranca un rAF nuevo
          }
          this._progress.set(Math.min(100, (elapsed / durationMs) * 100));
          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        onCleanup(() => {
          if (rafId) cancelAnimationFrame(rafId);
        });
      },
      { allowSignalWrites: true },
    );
  }

  /** ¿Es esta la diapositiva visible ahora mismo? (por clave de diapositiva) */
  isActive(key: string): boolean {
    return this.currentSlide()?.key === key;
  }

  /** ¿Está en pantalla alguna diapositiva de este bloque? */
  isBlockActive(id: PresentationBlockId): boolean {
    return this.currentSlide()?.block === id;
  }

  setIndex(index: number): void {
    const total = this.count();
    if (total === 0 || index < 0 || index >= total) return;
    this.requestedIndex.set(index);
  }

  next(): void {
    const total = this.count();
    if (total === 0) return;
    this.requestedIndex.set((this.currentIndex() + 1) % total);
  }

  prev(): void {
    const total = this.count();
    if (total === 0) return;
    this.requestedIndex.set((this.currentIndex() - 1 + total) % total);
  }

  togglePause(): void {
    this._isPaused.update((paused) => !paused);
  }
}
