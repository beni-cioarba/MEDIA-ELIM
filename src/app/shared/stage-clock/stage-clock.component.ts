import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Reloj de la proyección (hora actual, `HH:MM:SS`), **arriba a la derecha**.
 *
 * Lo enciende el operador desde el panel (`PresentationDisplayService.
 * showClock`); apagado por defecto. Es una ayuda para quien dirige —saber la
 * hora sin mirar el móvil—, así que va en el margen, pequeño, con el mismo
 * lenguaje que la cuenta atrás del culto (abajo a la izquierda): etiqueta
 * blanca con filete sobre las diapositivas claras y versión oscura sobre las
 * de oración a sangre (`.stage--bleed`). Cifras monoespaciadas que no bailan;
 * los segundos, atenuados, para que lo que se lea de lejos sea la hora.
 *
 * Rendimiento: un único `setInterval` de 1 s fuera de Angular, alineado con
 * el cambio de segundo; sólo existe mientras el reloj está a la vista.
 */
@Component({
  selector: 'app-stage-clock',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="clock" role="timer" [attr.aria-label]="'presenter.clock_show' | translate">
      <span class="clock__hm">{{ hm() }}</span><span class="clock__s">:{{ ss() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .clock {
      display: inline-flex;
      align-items: baseline;
      height: calc(var(--pj-u) * 4.6);
      padding: 0 calc(var(--pj-u) * 1.8);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 0 0 max(1px, calc(var(--pj-u) * 0.12)) rgba(26, 54, 93, 0.18);
      color: var(--c-primary, #1a365d);
      font-family: ui-monospace, 'Cascadia Mono', 'SF Mono', Consolas, monospace;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      line-height: calc(var(--pj-u) * 4.6);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    /* Diapositivas oscuras (familias, causas): versión oscura. */
    :host-context(.stage--bleed) .clock {
      background: rgba(8, 10, 14, 0.86);
      box-shadow: 0 0 0 max(1px, calc(var(--pj-u) * 0.12)) rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .clock__hm {
      font-size: calc(var(--pj-u) * 3.8);
    }

    /* Segundos un escalón por debajo (el mínimo legible, 3,2u) y atenuados. */
    .clock__s {
      font-size: calc(var(--pj-u) * 3.2);
      opacity: 0.6;
    }
  `,
})
export class StageClockComponent {
  private readonly now = signal<Date>(new Date());

  protected readonly hm = computed(() => `${two(this.now().getHours())}:${two(this.now().getMinutes())}`);
  protected readonly ss = computed(() => two(this.now().getSeconds()));

  constructor() {
    const zone = inject(NgZone);
    let tick: ReturnType<typeof setInterval> | null = null;
    // Arranca en el próximo cambio de segundo: así la cifra cambia a la vez
    // que el reloj del sistema y no hasta 999 ms tarde.
    const align = zone.runOutsideAngular(() =>
      setTimeout(() => {
        const set = () => zone.run(() => this.now.set(new Date()));
        set();
        tick = setInterval(set, 1_000);
      }, 1_000 - (Date.now() % 1_000)),
    );
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(align);
      if (tick) clearInterval(tick);
    });
  }
}

function two(n: number): string {
  return String(n).padStart(2, '0');
}
