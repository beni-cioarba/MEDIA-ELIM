import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Cadencia del reloj reactivo (1 minuto es suficiente para fechas/contadores). */
const CLOCK_TICK_MS = 60_000;

/**
 * Reloj reactivo + estado de visibilidad de la pestaña, compartidos por toda
 * la app.
 *
 * Motivación: antes cada componente creaba su propio `setInterval` y repetía
 * `document.hidden` a mano. Centralizarlo aquí:
 *  - evita N temporizadores simultáneos (CPU en el portátil de proyección),
 *  - permite que todos los cálculos derivados (día actual, "faltan X días")
 *    se recomputen a la vez y de forma consistente,
 *  - hace testeable la lógica temporal (basta con inyectar un doble).
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _now = signal<number>(Date.now());
  private readonly _pageVisible = signal<boolean>(true);

  /** Timestamp actual, refrescado cada minuto (sólo con la pestaña visible). */
  readonly now = this._now.asReadonly();

  /** `false` cuando la pestaña está en segundo plano: permite pausar timers. */
  readonly pageVisible = this._pageVisible.asReadonly();

  constructor() {
    this._pageVisible.set(!this.document.hidden);

    const onVisibility = () => {
      const visible = !this.document.hidden;
      this._pageVisible.set(visible);
      // Al volver a primer plano recuperamos la hora real de inmediato para
      // que "HOY" / los contadores no queden desfasados tras horas oculta.
      if (visible) this._now.set(Date.now());
    };
    this.document.addEventListener('visibilitychange', onVisibility);

    const timer = setInterval(() => {
      if (!this._pageVisible()) return;
      this._now.set(Date.now());
    }, CLOCK_TICK_MS);

    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      this.document.removeEventListener('visibilitychange', onVisibility);
    });
  }
}
