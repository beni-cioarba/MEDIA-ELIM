import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import type { SlideTiming } from '../../core/services/carousel.service';

/**
 * Barra de progreso de una diapositiva **sin trabajo por fotograma**.
 *
 * Se pone en el elemento que se rellena (`<span appSlideProgress [timing]>`)
 * y le aplica una animación del navegador (Web Animations API) de
 * `scaleX(0)` a `scaleX(1)` con la duración de la diapositiva, arrancada en
 * el punto en que va (`currentTime` = lo transcurrido). `transform` se anima
 * en el compositor: ni JavaScript, ni detección de cambios, ni maquetación
 * mientras corre. Sólo se rehace cuando cambia el plazo (otra diapositiva,
 * pausa, reanudación).
 *
 * Sin cuenta atrás (`durationMs = 0`: modo manual) la barra se queda vacía.
 * Es información (cuánto falta), no decoración: avanza lineal y lenta también
 * con `prefers-reduced-motion`.
 */
@Directive({
  selector: '[appSlideProgress]',
  host: { style: 'transform-origin: 0 50%; will-change: transform' },
})
export class SlideProgressDirective {
  readonly timing = input.required<SlideTiming | null>();
  /** Desactivada (p. ej. un punto que no es el actual): barra vacía. */
  readonly active = input<boolean>(true);

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private animation: Animation | null = null;

  constructor() {
    effect((onCleanup) => {
      const timing = this.timing();
      const active = this.active();
      this.animation?.cancel();
      this.animation = null;

      if (!active || !timing || timing.durationMs <= 0 || typeof this.el.animate !== 'function') {
        this.el.style.transform = 'scaleX(0)';
        return;
      }
      const elapsed = timing.paused
        ? timing.elapsedAtPause
        : Math.max(0, Date.now() - timing.startedAt);
      this.el.style.transform = '';
      const animation = this.el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: timing.durationMs,
        easing: 'linear',
        fill: 'forwards',
      });
      animation.currentTime = Math.min(elapsed, timing.durationMs);
      if (timing.paused) animation.pause();
      this.animation = animation;
      onCleanup(() => animation.cancel());
    });
  }
}
