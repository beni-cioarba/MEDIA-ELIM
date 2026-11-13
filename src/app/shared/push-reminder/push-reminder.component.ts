import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { PushWelcome } from '../../core/push/push-client';
import { DAILY_PUSH, nextDaily } from '../../core/push/push-schedule';
import { PushOutcome, PushService } from '../../core/push/push.service';
import { ClockService } from '../../core/services/clock.service';
import { LanguageService } from '../../core/services/language.service';
import { IconName } from '../../core/ui/icon-name';
import { IconComponent } from '../icon/icon.component';

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
 * **Aviso diario** (web push de las 08:00, hora de España) para un tema:
 * `impreuna` (Proiectul Împreună) o `biblia` (Citirea Bibliei). Una pieza,
 * varios temas: cambian la etiqueta, los textos (`keys`), la lectura del día
 * siguiente y la página a la que lleva la bienvenida.
 *
 * Toda la fila es el interruptor (`role="switch"`): en el móvil se acierta
 * sin apuntar. Cuando el navegador no puede (iPhone sin la app instalada,
 * navegador integrado, permiso bloqueado) la tarjeta explica qué hacer en
 * lugar de enseñar un control que no funcionaría. Sin App ID de OneSignal no
 * se pinta. Lógica: `core/push/push.service.ts`; envío:
 * `scripts/impreuna-push.mjs` (los dos temas, un solo aviso a quien tiene
 * ambos). Docs: 32-impreuna.md → Notificaciones.
 */
@Component({
  selector: 'app-push-reminder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './push-reminder.component.html',
  styleUrl: './push-reminder.component.scss',
  // Oculta, no ocupa su hueco en la rejilla de quien la usa (ni su `gap`).
  host: { '[class.is-hidden]': '!visible()' },
})
export class PushReminderComponent {
  /** Etiqueta de OneSignal (su valor es el idioma). */
  readonly topic = input.required<string>();
  /** Prefijo de los textos de la tarjeta (`impreuna.reminder`, `bible.reminder`). */
  readonly keys = input.required<string>();
  /** Prefijo de los textos de la bienvenida (`…welcome_title`, `…welcome`). */
  readonly welcomeKeys = input.required<string>();
  /** Página que abre la bienvenida (sin barra inicial). */
  readonly path = input.required<string>();
  /** Lectura de un día `YYYY-MM-DD` (para «mâine: Iacov 3»), o `null`. */
  readonly readingFor = input<(isoDate: string) => string | null>(() => null);
  /** El tema tiene algo que avisar (p. ej. la edición no ha terminado). */
  readonly active = input(true);
  /** Prefijo de los `id` de la tarjeta (dos en la misma página no chocan). */
  readonly idPrefix = input('rem');

  protected readonly push = inject(PushService);
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly publicUrl = inject(CHURCH_CONFIG, { optional: true })?.publicUrl ?? 'https://elimarganda.com/';

  protected get k(): string {
    return this.keys();
  }

  protected get ids(): { readonly title: string; readonly text: string } {
    const p = this.idPrefix();
    return { title: `${p}-title`, text: `${p}-text` };
  }

  /** Sin App ID o sin nada que avisar no hay nada que ofrecer. */
  protected readonly visible = computed(() => this.push.configured && this.active());

  protected readonly state = computed<ReminderState>(() => {
    const support = this.push.support;
    if (support !== 'ok') return support;
    if (this.push.permission() === 'denied') return 'blocked';
    return this.push.isOn(this.topic()) ? 'on' : 'off';
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
   * 09:00 en Rumanía) y la lectura de ese día.
   */
  protected readonly next = computed(() => {
    const now = this.clock.now();
    const { date, at } = nextDaily(now, DAILY_PUSH.hour, DAILY_PUSH.timeZone);
    const locale = this.language.current() === 'ro' ? 'ro-RO' : 'es-ES';
    const clock = (timeZone?: string): string =>
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(at);
    const diff = localDayDiff(now, at);
    return {
      time: clock(),
      /** La hora de España, sólo si la de quien mira es otra. */
      churchTime: clock(DAILY_PUSH.timeZone) === clock() ? null : clock(DAILY_PUSH.timeZone),
      when: diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : null,
      reading: this.readingFor()(date),
    };
  });

  constructor() {
    // Quien la tiene activa: comprobar en segundo plano que sigue viva.
    afterNextRender(() => {
      if (!this.push.isOn(this.topic())) return;
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
    const topic = this.topic();
    const pending = this.state() === 'on' ? this.push.disable(topic) : this.push.enable(topic, this.welcome());
    void pending.then((result) => this.outcome.set(result));
  }

  /** El aviso de confirmación que OneSignal manda al darse de alta (una vez). */
  private welcome(): PushWelcome {
    const prefix = this.welcomeKeys();
    return {
      title: this.translate.instant(`${prefix}.welcome_title`),
      message: this.translate.instant(`${prefix}.welcome`, { time: this.next().time }),
      url: new URL(this.path(), this.publicUrl).href,
    };
  }
}
