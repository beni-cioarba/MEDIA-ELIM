import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { IMPREUNA_REMINDER } from '../../../core/impreuna/impreuna.config';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { PushWelcome } from '../../../core/push/push-client';
import { dayOfYear, nextDaily } from '../../../core/push/push-schedule';
import { PushOutcome, PushService } from '../../../core/push/push.service';
import { ClockService } from '../../../core/services/clock.service';
import { IconName } from '../../../core/ui/icon-name';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Lo que puede enseñar la tarjeta: el interruptor o por qué no lo hay. */
export type ReminderState = 'on' | 'off' | 'blocked' | 'ios-install' | 'open-browser' | 'unsupported';

/** Días de calendario local entre dos instantes (0 = el mismo día). */
function localDayDiff(from: number, to: number): number {
  const day = (ms: number): number => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  };
  return day(to) - day(from);
}

/**
 * **Amintire zilnică** — interruptor de la notificación diaria de las 08:00
 * (hora de España) con el texto y la meditación del día.
 *
 * Toda la fila es el interruptor (`role="switch"`): en el móvil se acierta
 * sin apuntar. Cuando el navegador no puede (iPhone sin la app instalada,
 * navegador integrado, permiso bloqueado) la tarjeta explica qué hacer en
 * lugar de enseñar un control que no funcionaría. Sin App ID de OneSignal no
 * se pinta. Lógica: `core/push/push.service.ts`; envío:
 * `scripts/impreuna-push.mjs`. Diseño: docs/ai/32-impreuna.md → Notificaciones.
 */
@Component({
  selector: 'app-impreuna-reminder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './impreuna-reminder.component.html',
  styleUrl: './impreuna-reminder.component.scss',
  // Oculta, no ocupa su hueco en la rejilla del lateral (ni su `gap`).
  host: { '[class.is-hidden]': '!visible()' },
})
export class ImpreunaReminderComponent {
  protected readonly push = inject(PushService);
  private readonly impreuna = inject(ImpreunaService);
  private readonly clock = inject(ClockService);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly publicUrl = inject(CHURCH_CONFIG, { optional: true })?.publicUrl ?? 'https://elimarganda.com/';

  private readonly topic = IMPREUNA_REMINDER.topic;

  /** Sin App ID o con la edición ya terminada no hay nada que ofrecer. */
  protected readonly visible = computed(() => this.push.configured && this.impreuna.today().status !== 'ended');

  protected readonly state = computed<ReminderState>(() => {
    const support = this.push.support;
    if (support !== 'ok') return support;
    if (this.push.permission() === 'denied') return 'blocked';
    return this.push.isOn(this.topic) ? 'on' : 'off';
  });

  /** Hay interruptor (el navegador puede y el permiso no está bloqueado). */
  protected readonly switchable = computed(() => this.state() === 'on' || this.state() === 'off');

  protected readonly icon = computed<IconName>(() => {
    const state = this.state();
    return state === 'on' ? 'bell-ring' : state === 'blocked' ? 'bell-off' : 'bell';
  });

  /** Resultado del último toque (se borra al volver a tocar). */
  protected readonly outcome = signal<PushOutcome | null>(null);

  /**
   * El próximo aviso, con la hora en el reloj de quien mira (08:00 en España,
   * 09:00 en Rumanía) y la lectura de ese día si es de la edición.
   */
  protected readonly next = computed(() => {
    const now = this.clock.now();
    const { date, at } = nextDaily(now, IMPREUNA_REMINDER.hour, IMPREUNA_REMINDER.timeZone);
    const { year } = this.impreuna.edition;
    const day = Number(date.slice(0, 4)) === year ? dayOfYear(date) : 0;
    const locale = this.impreuna.lang() === 'ro' ? 'ro-RO' : 'es-ES';
    const clock = (timeZone?: string): string =>
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(at);
    const diff = localDayDiff(now, at);
    return {
      time: clock(),
      /** La hora de España, sólo si la de quien mira es otra. */
      churchTime: clock(IMPREUNA_REMINDER.timeZone) === clock() ? null : clock(IMPREUNA_REMINDER.timeZone),
      when: diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : null,
      reading: this.impreuna.view(day)?.reading ?? null,
    };
  });

  constructor() {
    // Quien la tiene activa: comprobar en segundo plano que sigue viva.
    afterNextRender(() => {
      if (!this.push.isOn(this.topic)) return;
      const idle = this.window?.requestIdleCallback?.bind(this.window) ?? ((run: () => void) => setTimeout(run, 2000));
      idle(() => void this.push.reconcile());
    });
  }

  /**
   * Activa o desactiva. Sin `await` antes de `enable()`: el permiso del
   * navegador se pide dentro del propio toque (Safari lo exige).
   */
  protected toggle(): void {
    if (this.push.busy() || !this.switchable()) return;
    this.outcome.set(null);
    const pending = this.state() === 'on' ? this.push.disable(this.topic) : this.push.enable(this.topic, this.welcome());
    void pending.then((result) => this.outcome.set(result));
  }

  /** El aviso de confirmación que OneSignal manda al darse de alta (una vez). */
  private welcome(): PushWelcome {
    return {
      title: this.translate.instant('impreuna.push.welcome_title'),
      message: this.translate.instant('impreuna.push.welcome', { time: this.next().time }),
      url: new URL('impreuna', this.publicUrl).href,
    };
  }
}
