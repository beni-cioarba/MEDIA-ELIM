import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DepartmentMonthly, DepartmentWeekly } from '../../../core/departments.config';
import { DepartmentId } from '../../../core/navigation/app-paths';
import { CalendarService } from '../../../core/services/calendar.service';
import { ClockService } from '../../../core/services/clock.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import {
  Weekday,
  monthlyRrule,
  nextMonthlyDates,
  nextWeeklyDates,
  weeklyRrule,
} from '../../../core/util/recurrence';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DateTicketComponent } from '../ticket/date-ticket.component';

/** Próxima + las tres siguientes. */
const DATES_SHOWN = 4;

/** Lo que el bloque necesita de una reunión fija, sea semanal o mensual. */
interface MeetingView {
  readonly key: string;
  /** `departments.<id>.<weekly|monthly>.<key>` */
  readonly base: string;
  readonly time: string;
  readonly dates: readonly string[];
  readonly rrule: string;
}

/**
 * Reunión fija de un departamento: el **encuentro semanal** (`weekly`, el de
 * tineret cada vineri) o la **reunión mensual** (`monthly`, la seară de
 * tineret del primer domingo). Un solo componente para los dos: la
 * anatomía es la misma y así no se duplica ni lógica ni estilo.
 *
 * Anatomía: billete con la próxima fecha (`app-date-ticket`) · qué es · qué
 * se vive esa noche (`parts`) · pieza propia proyectada (`<ng-content>`: la
 * masa de tineret con su app) · fechas siguientes · añadir al calendario
 * (un único evento recurrente, `RRULE`, que el teléfono repite solo).
 *
 * Las fechas se calculan, no se escriben: no caduca. La hora del semanal sale
 * del programa semanal (`weeklyProgram`), que es la fuente de verdad.
 */
@Component({
  selector: 'app-meeting-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent, DateTicketComponent],
  templateUrl: './meeting-block.component.html',
  styleUrl: './meeting-block.component.scss',
})
export class MeetingBlockComponent {
  readonly department = input.required<DepartmentId>();
  readonly meeting = input.required<DepartmentWeekly | DepartmentMonthly>();
  /**
   * Oculta la fila «Después»: cuando la pieza proyectada ya enseña las
   * próximas fechas con su contenido (los turnos de la masa), repetirlas
   * sólo con la fecha sobra.
   */
  readonly hideAfter = input(false);

  private readonly config = inject(CHURCH_CONFIG);
  private readonly clock = inject(ClockService);
  private readonly calendar = inject(CalendarService);
  private readonly translate = inject(TranslateService);
  protected readonly schedule = inject(ScheduleService);

  protected readonly view = computed<MeetingView | null>(() => {
    const m = this.meeting();
    const now = new Date(this.clock.now());
    const base = `departments.${this.department()}.${m.kind}.${m.key}`;
    if (m.kind === 'monthly') {
      return {
        key: m.key,
        base,
        time: m.time,
        dates: nextMonthlyDates(m.rule, now, DATES_SHOWN),
        rrule: monthlyRrule(m.rule),
      };
    }
    const program = this.config.weeklyProgram.find((p) => p.id === m.weeklyProgramId);
    if (!program) return null;
    const weekday = program.day as Weekday;
    return {
      key: m.key,
      base,
      time: program.time,
      dates: nextWeeklyDates(weekday, now, DATES_SHOWN),
      rrule: weeklyRrule(weekday),
    };
  });

  protected addToCalendar(): void {
    const v = this.view();
    const first = v?.dates[0];
    if (!v || !first) return;
    this.calendar.downloadRecurring({
      id: `${this.department()}-${v.key}`,
      rrule: v.rrule,
      firstDate: first,
      time: v.time,
      durationMin: this.meeting().durationMin,
      title: this.translate.instant(`${v.base}.calendar_title`),
      description: this.translate.instant(`${v.base}.calendar_desc`),
    });
  }
}
