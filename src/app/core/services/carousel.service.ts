import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ClockService } from './clock.service';
import { PresentationBlockId, PresentationBlocksService } from './presentation-blocks.service';
import { PresentationService } from '../presentation.service';

/** Duración por defecto de cada slide en modo presentación. */
export const SLIDE_DURATION_MS = 12_000;

/**
 * Motor del carrusel de la presentación.
 *
 * Sustituye al bucle `requestAnimationFrame` + `setInterval(250)` que vivía
 * dentro de `HomeComponent`: ahora un único `effect` arranca y para el rAF de
 * forma declarativa cuando cambia el modo presentación, la pausa, la
 * visibilidad de la pestaña o el conjunto de bloques activos.
 *
 * Trabaja siempre sobre `PresentationBlocksService.activeBlockIds()`, así que
 * los bloques desactivados (manual o automáticamente) simplemente no existen
 * para el carrusel: ni se muestran, ni cuentan en los dots, ni en los atajos.
 */
@Injectable({ providedIn: 'root' })
export class CarouselService {
  private readonly presentation = inject(PresentationService);
  private readonly blocks = inject(PresentationBlocksService);
  private readonly clock = inject(ClockService);

  readonly slideDurationMs = SLIDE_DURATION_MS;

  /** Índice solicitado; se recorta contra el número real de bloques activos. */
  private readonly requestedIndex = signal<number>(0);
  private readonly _isPaused = signal<boolean>(false);
  private readonly _progress = signal<number>(0);

  /** Bloques proyectables, en orden. */
  readonly slides = this.blocks.activeBlockIds;
  readonly count = computed<number>(() => this.slides().length);

  readonly currentIndex = computed<number>(() => {
    const total = this.count();
    if (total === 0) return 0;
    return Math.min(this.requestedIndex(), total - 1);
  });

  readonly currentBlockId = computed<PresentationBlockId | null>(
    () => this.slides()[this.currentIndex()] ?? null,
  );

  readonly isPaused = this._isPaused.asReadonly();

  /** Progreso 0-100 del slide actual hacia el siguiente. */
  readonly progress = this._progress.asReadonly();

  constructor() {
    effect(
      (onCleanup) => {
        const running =
          this.presentation.isFullscreen() &&
          !this._isPaused() &&
          this.clock.pageVisible() &&
          this.count() > 1;

        // Leer el índice hace que el temporizador se reinicie limpiamente
        // cada vez que se cambia de slide (manual o automáticamente).
        this.currentIndex();

        this._progress.set(0);
        if (!running) return;

        let rafId = 0;
        let last: number | null = null;
        let elapsed = 0;

        const tick = (timestamp: number) => {
          if (last === null) last = timestamp;
          elapsed += timestamp - last;
          last = timestamp;

          if (elapsed >= this.slideDurationMs) {
            this._progress.set(0);
            this.next();
            return; // el effect se re-ejecuta y arranca un rAF nuevo
          }
          this._progress.set(Math.min(100, (elapsed / this.slideDurationMs) * 100));
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

  /** ¿Es este el bloque visible ahora mismo en la presentación? */
  isActive(id: PresentationBlockId): boolean {
    return this.currentBlockId() === id;
  }

  setIndex(index: number): void {
    const total = this.count();
    if (total === 0 || index < 0 || index >= total) return;
    this.requestedIndex.set(index);
  }

  setBlock(id: PresentationBlockId): void {
    const index = this.slides().indexOf(id);
    if (index >= 0) this.requestedIndex.set(index);
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
