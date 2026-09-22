import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ClockService } from './clock.service';
import {
  PresentationBlockId,
  PresentationBlocksService,
  PresentationSlide,
} from './presentation-blocks.service';
import { PresentationDisplayService } from './presentation-display.service';
import { PresentationSyncService, SyncCommand, SyncState } from './presentation-sync.service';
import { PresentationService } from '../presentation.service';

/**
 * Motor del carrusel de la presentación.
 *
 * Un único `effect` arranca y para el bucle `requestAnimationFrame` de forma
 * declarativa cuando cambia el modo presentación, la pausa, la visibilidad de
 * la pestaña, el conjunto de diapositivas, la duración… o **quién manda**.
 *
 * ── Roles (ver `PresentationSyncService`) ─────────────────────────────
 * Puede haber varias instancias de la app proyectando a la vez en la misma
 * máquina (ventana del templo, vista previa del panel, pestaña en pantalla
 * completa). Sólo el **líder** avanza el reloj y publica su estado; las demás
 * lo reflejan: reciben índice y pausa por el canal y calculan el progreso en
 * local. Las órdenes (teclado, controles, panel) las ejecuta siempre el
 * líder, venga de donde vengan.
 *
 * Trabaja siempre sobre `PresentationBlocksService.activeSlides()`: los
 * bloques desactivados no existen para el carrusel y los bloques paginados
 * (anuncios, eventos) aparecen expandidos. Cada diapositiva dura lo que fije
 * `PresentationDisplayService` para su bloque.
 */
@Injectable({ providedIn: 'root' })
export class CarouselService {
  private readonly presentation = inject(PresentationService);
  private readonly blocks = inject(PresentationBlocksService);
  private readonly clock = inject(ClockService);
  private readonly display = inject(PresentationDisplayService);
  private readonly sync = inject(PresentationSyncService);

  /** Índice solicitado; se recorta contra el número real de diapositivas. */
  private readonly requestedIndex = signal<number>(0);
  private readonly _isPaused = signal<boolean>(false);
  private readonly _progress = signal<number>(0);
  /** Instante en que arrancó (o se reanudó) la diapositiva actual. */
  private readonly startedAt = signal<number>(Date.now());

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

  /** ¿Lleva esta instancia el reloj de la presentación? */
  readonly isLeader = this.sync.isLeader;

  /**
   * Progreso 0-100 de la diapositiva actual hacia la siguiente: el propio si
   * somos líder, el del líder (calculado en local) si sólo reflejamos.
   */
  readonly progress = computed<number>(() =>
    this.sync.isLeader() ? this._progress() : this.sync.remoteProgress(),
  );

  /** Duración (ms) de la diapositiva actual, según su bloque. */
  readonly currentDurationMs = computed<number>(() => {
    const block = this.currentSlide()?.block;
    return block ? this.display.durationFor(block) * 1000 : 0;
  });

  constructor() {
    this.sync.registerStage({
      onCommand: (command) => this.execute(command),
      onRemoteState: (state, inherit) => this.applyRemote(state, inherit),
    });

    // Entrar y salir de la elección de líder al empezar / dejar de proyectar.
    effect(
      () => {
        if (!this.presentation.isFullscreen()) {
          this.sync.leave();
          return;
        }
        this.sync.join(this.presentation.role() ?? 'inline');
      },
      { allowSignalWrites: true },
    );

    // El reloj, sólo en el líder.
    effect(
      (onCleanup) => {
        const running =
          this.presentation.isFullscreen() &&
          this.sync.isLeader() &&
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

        this.startedAt.set(Date.now());

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

    // El líder publica su estado cada vez que cambia algo relevante.
    effect(() => {
      if (!this.sync.isLeader()) return;
      this.sync.publishState({
        index: this.currentIndex(),
        paused: this._isPaused(),
        startedAt: this.startedAt(),
        durationMs: this.currentDurationMs(),
        count: this.count(),
        slideKey: this.currentSlide()?.key ?? null,
        fullscreen: this.presentation.isNativeFullscreen(),
      });
    });
  }

  /** ¿Es esta la diapositiva visible ahora mismo? (por clave de diapositiva) */
  isActive(key: string): boolean {
    return this.currentSlide()?.key === key;
  }

  /** ¿Está en pantalla alguna diapositiva de este bloque? */
  isBlockActive(id: PresentationBlockId): boolean {
    return this.currentSlide()?.block === id;
  }

  // ---- Órdenes: pasan por el líder ----------------------------------

  setIndex(index: number): void {
    this.sync.sendCommand({ type: 'goto', index });
  }

  next(): void {
    this.sync.sendCommand({ type: 'next' });
  }

  prev(): void {
    this.sync.sendCommand({ type: 'prev' });
  }

  togglePause(): void {
    this.sync.sendCommand({ type: 'toggle' });
  }

  // ---- Ejecución local (sólo el líder llega aquí) --------------------

  private execute(command: SyncCommand): void {
    const total = this.count();
    switch (command.type) {
      case 'goto':
        if (total === 0 || command.index < 0 || command.index >= total) return;
        this.requestedIndex.set(command.index);
        break;
      case 'next':
        if (total === 0) return;
        this.requestedIndex.set((this.currentIndex() + 1) % total);
        break;
      case 'prev':
        if (total === 0) return;
        this.requestedIndex.set((this.currentIndex() - 1 + total) % total);
        break;
      case 'pause':
        this._isPaused.set(true);
        break;
      case 'play':
        this._isPaused.set(false);
        break;
      case 'toggle':
        this._isPaused.update((paused) => !paused);
        break;
    }
  }

  /**
   * Reflejar al líder: misma diapositiva, misma pausa. Con `inherit`, también
   * siendo líder: acabamos de relevar a otro y seguimos donde él estaba.
   */
  private applyRemote(state: SyncState, inherit: boolean): void {
    if (this.sync.isLeader() && !inherit) return;
    this.requestedIndex.set(state.index);
    this._isPaused.set(state.paused);
  }
}
