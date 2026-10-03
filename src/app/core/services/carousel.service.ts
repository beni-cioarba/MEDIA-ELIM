import { Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  PresentationBlockId,
  PresentationBlocksService,
  PresentationSlide,
} from './presentation-blocks.service';
import { PresentationDisplayService } from './presentation-display.service';
import { PresentationSyncService, SyncCommand, SyncState } from './presentation-sync.service';
import { PresentationService } from '../presentation.service';

/** Cómo va el tiempo de la diapositiva en curso (lo que pinta la barra de progreso). */
export interface SlideTiming {
  /** Instante (epoch ms) en que arrancó, descontado lo pausado. */
  readonly startedAt: number;
  /** 0 ⇒ sin cuenta atrás (modo manual o una sola diapositiva). */
  readonly durationMs: number;
  readonly paused: boolean;
  /** Lo transcurrido al pausar (ms). */
  readonly elapsedAtPause: number;
}

/**
 * Motor del carrusel de la presentación.
 *
 * ── Rendimiento: ningún trabajo por fotograma ─────────────────────────
 * Antes un bucle `requestAnimationFrame` escribía el progreso en una señal
 * 60 veces por segundo, y cada escritura lanzaba la detección de cambios de
 * toda la app (1.200 recálculos de estilo y de maquetación cada 20 s, en
 * cada pantalla y en la vista previa). Ahora el tiempo es un **plazo**:
 * `startedAt + durationMs`. El líder programa UN `setTimeout` al plazo; la
 * barra de progreso es una animación CSS que arranca en el punto justo y que
 * compone el navegador sin JavaScript. Entre diapositivas, la app no hace nada.
 *
 * Al ser un plazo absoluto, un temporizador frenado por el navegador (ventana
 * oculta) no desplaza el ritmo: al despertar se comprueba el plazo y se pasa
 * si ya venció.
 *
 * ── Roles (ver `PresentationSyncService`) ─────────────────────────────
 * Pueden proyectar a la vez varias ventanas (una por pantalla), la vista
 * previa del panel y la pestaña en pantalla completa. Sólo el **líder**
 * decide cuándo se pasa y publica su estado; las demás lo reflejan. Las
 * órdenes (teclado, controles, panel) las ejecuta siempre el líder.
 */
@Injectable({ providedIn: 'root' })
export class CarouselService {
  private readonly presentation = inject(PresentationService);
  private readonly blocks = inject(PresentationBlocksService);
  private readonly display = inject(PresentationDisplayService);
  private readonly sync = inject(PresentationSyncService);
  private readonly zone = inject(NgZone);

  /** Índice solicitado; se recorta contra el número real de diapositivas. */
  private readonly requestedIndex = signal<number>(0);
  /** Clave pedida por el líder (manda sobre el índice al reflejar). */
  private readonly requestedKey = signal<string | null>(null);
  private readonly _isPaused = signal<boolean>(false);
  /** Instante en que arrancó (o se reanudó, descontando) la diapositiva actual. */
  private readonly startedAt = signal<number>(Date.now());
  private readonly elapsedAtPause = signal<number>(0);
  /** Diapositiva a la que pertenece el reloj actual (`startedAt`). */
  private timedKey: string | null = null;

  /** Diapositivas proyectables, en orden. */
  readonly slides = this.blocks.activeSlides;
  readonly count = computed<number>(() => this.slides().length);

  readonly currentIndex = computed<number>(() => {
    const total = this.count();
    if (total === 0) return 0;
    const key = this.requestedKey();
    if (key !== null) {
      const byKey = this.slides().findIndex((s) => s.key === key);
      if (byKey >= 0) return byKey;
    }
    return Math.min(this.requestedIndex(), total - 1);
  });

  readonly currentSlide = computed<PresentationSlide | null>(
    () => this.slides()[this.currentIndex()] ?? null,
  );

  readonly isPaused = this._isPaused.asReadonly();

  /**
   * `false` ⇒ modo manual: no corre el reloj y sólo se cambia a mano. Es una
   * preferencia del operador (compartida entre ventanas por `localStorage`),
   * no un estado del líder: por eso no viaja en `SyncState`.
   */
  readonly autoAdvance = this.display.autoAdvance;

  /** ¿Lleva esta instancia el reloj de la presentación? */
  readonly isLeader = this.sync.isLeader;

  /** Duración (ms) de la diapositiva actual: la suya o la de su bloque. */
  readonly currentDurationMs = computed<number>(() => {
    const slide = this.currentSlide();
    return slide ? this.display.durationForSlide(slide) * 1000 : 0;
  });

  /** ¿Hay cuenta atrás? (automático y más de una diapositiva). */
  private readonly timed = computed<boolean>(() => this.autoAdvance() && this.count() > 1);

  /**
   * Tiempo de la diapositiva en curso: el propio si somos líder, el del
   * líder si sólo reflejamos. Es lo único que necesita la barra de progreso.
   */
  readonly timing = computed<SlideTiming>(() => {
    const remote = this.sync.isLeader() ? null : this.sync.remoteState();
    if (remote) {
      return {
        startedAt: remote.startedAt,
        durationMs: remote.durationMs,
        paused: remote.paused,
        elapsedAtPause: remote.elapsedAtPause,
      };
    }
    return {
      startedAt: this.startedAt(),
      durationMs: this.timed() ? this.currentDurationMs() : 0,
      paused: this._isPaused(),
      elapsedAtPause: this.elapsedAtPause(),
    };
  });

  constructor() {
    this.sync.registerStage({
      onCommand: (command) => this.execute(command),
      onRemoteState: (state, inherit) => this.applyRemote(state, inherit),
    });

    // Entrar y salir de la elección de líder al empezar / dejar de proyectar.
    // La vista de prueba (`solo`) nunca entra: enseña una diapositiva fija.
    // `untracked`: unirse lee y escribe el estado del canal, y eso no debe
    // volver a disparar este efecto (sería un bucle infinito).
    effect(() => {
      const role = this.presentation.role();
      const projecting = this.presentation.isFullscreen() && role !== 'solo';
      untracked(() => {
        if (projecting) this.sync.join(role ?? 'inline');
        else this.sync.leave();
      });
    });

    // La diapositiva en curso cambió sin pasar por una orden (se apagó un
    // bloque, caducó un anuncio): su reloj arranca de cero. Las órdenes y el
    // estado del líder ya fijan el reloj ellas mismas (ver `goto` y
    // `applyRemote`), y entonces la clave coincide y no se toca nada.
    effect(() => {
      const key = this.currentSlide()?.key ?? null;
      untracked(() => {
        if (key === this.timedKey) return;
        this.timedKey = key;
        this.startedAt.set(Date.now());
        this.elapsedAtPause.set(0);
      });
    });

    // El plazo, sólo en el líder: UN temporizador por diapositiva, fuera de
    // la zona de Angular (su vencimiento no repinta nada por sí mismo).
    effect((onCleanup) => {
      const running =
        this.presentation.isFullscreen() &&
        this.presentation.role() !== 'solo' &&
        this.sync.isLeader() &&
        this.timed() &&
        !this._isPaused();
      const durationMs = this.currentDurationMs();
      const startedAt = this.startedAt();
      if (!running || durationMs <= 0) return;

      const fire = () => {
        if (Date.now() - startedAt >= durationMs - 5) this.zone.run(() => this.advance());
        else schedule();
      };
      let timer: ReturnType<typeof setTimeout> | null = null;
      const schedule = () => {
        const remaining = Math.max(0, startedAt + durationMs - Date.now());
        timer = this.zone.runOutsideAngular(() => setTimeout(fire, remaining));
      };
      schedule();

      // Si el navegador frenó el temporizador (ventana oculta), al volver a
      // estar visible se recupera el plazo en vez de esperar al frenado.
      const onVisible = () => {
        if (document.visibilityState === 'visible') fire();
      };
      document.addEventListener('visibilitychange', onVisible);
      onCleanup(() => {
        if (timer) clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisible);
      });
    });

    // El líder publica su estado cada vez que cambia algo relevante.
    // Lee `canPublish` (y no sólo `isLeader`): un líder recién llegado publica
    // en cuanto termina la ventana de herencia, sin esperar a otro cambio.
    effect(() => {
      if (!this.sync.canPublish()) return;
      const timing = this.timing();
      const state = {
        index: this.currentIndex(),
        slideKey: this.currentSlide()?.key ?? null,
        paused: timing.paused,
        startedAt: timing.startedAt,
        elapsedAtPause: timing.elapsedAtPause,
        durationMs: timing.durationMs,
        count: this.count(),
        fullscreen: this.presentation.isNativeFullscreen(),
      };
      untracked(() => this.sync.publishState(state));
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

  private advance(): void {
    const total = this.count();
    if (total === 0) return;
    this.goto((this.currentIndex() + 1) % total);
  }

  private goto(index: number): void {
    this.requestedKey.set(null);
    this.requestedIndex.set(index);
    // También si es la misma diapositiva (p. ej. sólo hay una): reloj de cero.
    this.timedKey = this.slides()[index]?.key ?? null;
    this.startedAt.set(Date.now());
    this.elapsedAtPause.set(0);
  }

  /**
   * Como `goto`, pero por clave. Si la diapositiva aún no está en la lista
   * (la selección nueva llega por otro canal), `currentIndex` la encuentra
   * en cuanto aparece, porque resuelve primero por `requestedKey`.
   */
  private gotoKey(key: string): void {
    this.requestedKey.set(key);
    this.requestedIndex.set(Math.max(0, this.slides().findIndex((s) => s.key === key)));
    this.timedKey = key;
    this.startedAt.set(Date.now());
    this.elapsedAtPause.set(0);
  }

  private setPaused(paused: boolean): void {
    if (paused === this._isPaused()) return;
    if (paused) {
      this.elapsedAtPause.set(Math.max(0, Date.now() - this.startedAt()));
    } else {
      // Reanudar donde se quedó: el plazo se corre lo que duró la pausa.
      this.startedAt.set(Date.now() - this.elapsedAtPause());
      this.elapsedAtPause.set(0);
    }
    this._isPaused.set(paused);
  }

  private execute(command: SyncCommand): void {
    const total = this.count();
    switch (command.type) {
      case 'goto':
        if (total === 0 || command.index < 0 || command.index >= total) return;
        this.goto(command.index);
        break;
      case 'gotoKey':
        this.gotoKey(command.key);
        break;
      case 'next':
        if (total === 0) return;
        this.goto((this.currentIndex() + 1) % total);
        break;
      case 'prev':
        if (total === 0) return;
        this.goto((this.currentIndex() - 1 + total) % total);
        break;
      case 'pause':
        this.setPaused(true);
        break;
      case 'play':
        this.setPaused(false);
        break;
      case 'toggle':
        this.setPaused(!this._isPaused());
        break;
    }
  }

  /**
   * Reflejar al líder: misma diapositiva (por clave), misma pausa y mismo
   * plazo. Con `inherit`, también siendo líder: acabamos de relevar a otro y
   * seguimos donde él estaba, con su mismo reloj.
   */
  private applyRemote(state: SyncState, inherit: boolean): void {
    if (this.sync.isLeader() && !inherit) return;
    this.requestedKey.set(state.slideKey);
    this.requestedIndex.set(state.index);
    this._isPaused.set(state.paused);
    this.timedKey = state.slideKey;
    this.startedAt.set(state.startedAt);
    this.elapsedAtPause.set(state.elapsedAtPause);
  }
}
