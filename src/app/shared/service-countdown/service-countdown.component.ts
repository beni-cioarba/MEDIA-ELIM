import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  COUNTDOWN_AFTER_MS,
  ServiceCountdownService,
} from '../../core/services/service-countdown.service';

/** Radio del anillo de progreso (en unidades del `viewBox` de 24). */
const RING_R = 9;
const RING_LEN = 2 * Math.PI * RING_R;

/**
 * Cuenta atrás hasta el comienzo del culto, **en el margen** de la proyección
 * (abajo a la izquierda, en simetría con la firma ELIM): no ocupa sitio de
 * ninguna diapositiva y se ve en todas, también en las de oración a sangre.
 *
 *   ◔  ÎNCEPEM ÎN  12:47
 *
 * Se adapta al fondo como la firma: sobre las diapositivas claras, etiqueta
 * blanca con filete y texto navy (discreta); sobre las de oración a sangre
 * (`.stage--bleed`, oscuras), su versión oscura. Cifras monoespaciadas que
 * no bailan y un anillo que se va
 * cerrando con la antelación configurada. En los cinco últimos minutos el
 * anillo y las cifras pasan a oro; al llegar la hora dice «Începem acum» un
 * minuto y desaparece. Sin animaciones: lo único que cambia es la cifra.
 *
 * Rendimiento: el segundero sólo existe **dentro de la ventana** (de
 * `showFrom` a la hora + 1 min). Fuera, un único `setTimeout` espera a que se
 * abra; nada se recalcula cada segundo el resto del día.
 */
@Component({
  selector: 'app-service-countdown',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        class="countdown"
        [class.is-soon]="soon()"
        [class.is-now]="started()"
        role="timer"
        [attr.aria-label]="(started() ? 'countdown.now' : 'countdown.label') | translate"
      >
        <svg class="countdown__ring" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="countdown__track" cx="12" cy="12" [attr.r]="ringR" />
          <circle
            class="countdown__arc"
            cx="12"
            cy="12"
            [attr.r]="ringR"
            [attr.stroke-dasharray]="ringLen"
            [attr.stroke-dashoffset]="ringOffset()"
          />
        </svg>
        @if (started()) {
          <span class="countdown__label">{{ 'countdown.now' | translate }}</span>
        } @else {
          <span class="countdown__label">{{ 'countdown.label' | translate }}</span>
          <span class="countdown__time">{{ clock() }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .countdown {
      display: inline-flex;
      align-items: center;
      gap: calc(var(--pj-u) * 1.1);
      height: calc(var(--pj-u) * 4.6);
      padding: 0 calc(var(--pj-u) * 1.8) 0 calc(var(--pj-u) * 0.8);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 0 0 max(1px, calc(var(--pj-u) * 0.12)) rgba(26, 54, 93, 0.18);
      color: var(--c-primary, #1a365d);
      line-height: 1;
      white-space: nowrap;
    }

    /* Diapositivas oscuras (familias, causas): versión oscura. */
    :host-context(.stage--bleed) .countdown {
      background: rgba(8, 10, 14, 0.86);
      box-shadow: 0 0 0 max(1px, calc(var(--pj-u) * 0.12)) rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .countdown__ring {
      width: calc(var(--pj-u) * 3.4);
      height: calc(var(--pj-u) * 3.4);
      transform: rotate(-90deg);
    }

    .countdown__track,
    .countdown__arc {
      fill: none;
      stroke-width: 2.6;
    }

    .countdown__track {
      stroke: currentColor;
      opacity: 0.18;
    }

    .countdown__arc {
      stroke: currentColor;
      stroke-linecap: round;
    }

    .countdown__label {
      font-family: var(--font-display);
      font-size: calc(var(--pj-u) * 3.2);
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.7;
    }

    .countdown__time {
      font-family: ui-monospace, 'Cascadia Mono', 'SF Mono', Consolas, monospace;
      font-size: calc(var(--pj-u) * 3.8);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
    }

    .is-soon .countdown__arc,
    .is-now .countdown__arc {
      stroke: var(--c-gold, #d4af37);
    }

    .is-soon .countdown__time {
      color: var(--c-gold-deep, #8a6d12);
    }

    :host-context(.stage--bleed) .is-soon .countdown__time {
      color: var(--c-gold-soft, #f0d27a);
    }

    .is-now .countdown__label {
      opacity: 1;
    }
  `,
})
export class ServiceCountdownComponent {
  private readonly countdown = inject(ServiceCountdownService);
  private readonly zone = inject(NgZone);

  protected readonly ringR = RING_R;
  protected readonly ringLen = RING_LEN;

  /** Hora local al segundo, sólo mientras la ventana está abierta. */
  private readonly now = signal<number>(Date.now());

  private readonly target = computed(() => (this.countdown.enabled() ? this.countdown.target() : null));

  protected readonly visible = computed<boolean>(() => {
    const t = this.target();
    const now = this.now();
    return !!t && now >= t.showFrom && now < t.at + COUNTDOWN_AFTER_MS;
  });

  private readonly remainingMs = computed<number>(() => {
    const t = this.target();
    return t ? Math.max(0, t.at - this.now()) : 0;
  });

  protected readonly started = computed<boolean>(() => this.remainingMs() === 0);
  protected readonly soon = computed<boolean>(() => this.remainingMs() <= 5 * 60_000);

  /** «12:47» o «1:05:30» (redondeo hacia arriba: nunca marca 0:00 antes de hora). */
  protected readonly clock = computed<string>(() => {
    const total = Math.ceil(this.remainingMs() / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mmss = `${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
    return h > 0 ? `${h}:${mmss}` : mmss;
  });

  /** El anillo se cierra a lo largo de la antelación. */
  protected readonly ringOffset = computed<number>(() => {
    const t = this.target();
    if (!t) return RING_LEN;
    const lead = t.at - t.showFrom;
    const done = lead > 0 ? 1 - this.remainingMs() / lead : 1;
    return RING_LEN * (1 - Math.min(1, Math.max(0, done)));
  });

  constructor() {
    // Segundero sólo dentro de la ventana; fuera, un único temporizador que
    // espera a que se abra. Se rehace si cambian la hora o la antelación.
    effect((onCleanup) => {
      const t = this.target();
      if (!t) return;
      let wait: ReturnType<typeof setTimeout> | null = null;
      let tick: ReturnType<typeof setInterval> | null = null;
      const set = () => this.zone.run(() => this.now.set(Date.now()));

      const startTicking = () => {
        set();
        tick = setInterval(() => {
          set();
          if (Date.now() >= t.at + COUNTDOWN_AFTER_MS && tick) clearInterval(tick);
        }, 1_000);
      };

      this.zone.runOutsideAngular(() => {
        const until = t.showFrom - Date.now();
        if (Date.now() >= t.at + COUNTDOWN_AFTER_MS) return;
        if (until <= 0) startTicking();
        // `setTimeout` admite como mucho ~24,8 días; aquí es siempre el mismo día.
        else wait = setTimeout(startTicking, until);
      });

      onCleanup(() => {
        if (wait) clearTimeout(wait);
        if (tick) clearInterval(tick);
      });
    });
  }
}
