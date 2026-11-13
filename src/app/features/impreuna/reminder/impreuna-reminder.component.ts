import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IMPREUNA_REMINDER } from '../../../core/impreuna/impreuna.config';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { dayOfYear } from '../../../core/push/push-schedule';
import { PushService } from '../../../core/push/push.service';
import { PushReminderComponent } from '../../../shared/push-reminder/push-reminder.component';

/**
 * **Amintire zilnică** de Proiectul Împreună: la tarjeta compartida del aviso
 * diario (`app-push-reminder`) con el tema `impreuna`, sus textos y la
 * lectura de la edición. Docs: 32-impreuna.md → Notificaciones.
 */
@Component({
  selector: 'app-impreuna-reminder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PushReminderComponent],
  template: `
    <app-push-reminder
      [topic]="topic"
      keys="impreuna.reminder"
      welcomeKeys="impreuna.push"
      path="impreuna"
      [readingFor]="readingFor"
      [active]="active()"
    />
  `,
  styles: `
    :host {
      display: block;
    }

    :host(.is-hidden) {
      display: none;
    }
  `,
  // Oculta, no ocupa su hueco en la rejilla del lateral (ni su `gap`).
  host: { '[class.is-hidden]': '!visible()' },
})
export class ImpreunaReminderComponent {
  private readonly impreuna = inject(ImpreunaService);
  private readonly push = inject(PushService);

  protected readonly topic = IMPREUNA_REMINDER.topic;
  /** Con la edición ya terminada no hay nada que ofrecer. */
  protected readonly active = computed(() => this.impreuna.today().status !== 'ended');
  protected readonly visible = computed(() => this.push.configured && this.active());

  /** La lectura de un día, si es de la edición. */
  protected readonly readingFor = (date: string): string | null => {
    const { year } = this.impreuna.edition;
    const day = Number(date.slice(0, 4)) === year ? dayOfYear(date) : 0;
    return this.impreuna.view(day)?.reading ?? null;
  };
}
