import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ClockService } from '../../../core/services/clock.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { parseIsoDate, startOfDay } from '../../../core/util/iso-date';

const DAY_MS = 86_400_000;

/**
 * «Billete» de la próxima reunión: día de la semana, día, mes, hora y cuánto
 * falta (verde si es hoy, como todo lo de «ahora» en la app). Columna
 * izquierda de los bloques de reunión fija (`weekly`, `monthly`); en el
 * teléfono pasa a una franja horizontal encima del cuerpo.
 */
@Component({
  selector: 'app-date-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  host: { '[class.is-today]': 'daysLeft() === 0' },
  template: `
    @let p = schedule.formatDayParts(date());
    @let left = daysLeft();
    <span class="label">{{ 'departments.ticket.next' | translate }}</span>
    <span class="wd">{{ schedule.formatWeekdayShort(date()) }}</span>
    <span class="day">{{ p.day }}</span>
    <span class="month">{{ p.month }}</span>
    <span class="time">{{ time() }}</span>
    <span class="left">
      @if (left === 0) {
        {{ 'departments.ticket.today' | translate }}
      } @else if (left === 1) {
        {{ 'departments.ticket.tomorrow' | translate }}
      } @else {
        {{ 'departments.ticket.in_days' | translate: { days: left } }}
      }
    </span>
  `,
  styleUrl: './date-ticket.component.scss',
})
export class DateTicketComponent {
  /** `YYYY-MM-DD`. */
  readonly date = input.required<string>();
  readonly time = input.required<string>();

  private readonly clock = inject(ClockService);
  protected readonly schedule = inject(ScheduleService);

  protected readonly daysLeft = computed(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    return Math.round((parseIsoDate(this.date()).getTime() - today) / DAY_MS);
  });
}
