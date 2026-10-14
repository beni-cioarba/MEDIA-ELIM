import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DepartmentMonthly, DepartmentWeekly } from '../../../core/departments.config';
import { PEOPLE_INDEX } from '../../../core/leadership.config';
import { MeetingTopic } from '../../../core/meeting-programs.config';
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
import { startOfDay, toIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DateTicketComponent } from '../ticket/date-ticket.component';

/** Próxima + las tres siguientes. */
const DATES_SHOWN = 4;

/** Temas de la agenda visibles antes de «ver todos». */
const AGENDA_SHOWN = 4;

/** Tema listo para pintar, con quién lo trae ya resuelto (organigrama o invitado). */
interface TopicView extends MeetingTopic {
  readonly by: string | null;
}

const toView = (t: MeetingTopic): TopicView => ({
  ...t,
  by: (t.speaker && PEOPLE_INDEX.get(t.speaker)?.name) || t.guest || null,
});

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
 * invitación a la masa de tineret) · fechas siguientes · añadir al calendario
 * (un único evento recurrente, `RRULE`, que el teléfono repite solo).
 *
 * Las fechas se calculan, no se escriben: no caduca. La hora del semanal sale
 * del programa semanal (`weeklyProgram`), que es la fuente de verdad.
 *
 * Con `program` (tema por fecha, `meeting-programs.config.ts`), la próxima
 * noche lleva su tema destacado en el cuerpo y las siguientes con tema pasan
 * a una **agenda** a todo el ancho (sustituye a las píldoras de «después»).
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

  /** Temas de hoy en adelante, en orden. Los pasados desaparecen solos. */
  private readonly upcoming = computed<readonly MeetingTopic[]>(() => {
    const today = toIsoDate(startOfDay(new Date(this.clock.now())));
    return (this.meeting().program ?? [])
      .filter((t) => t.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  /** Tema de la próxima reunión (la del billete), si lo tiene. */
  protected readonly spotlight = computed<TopicView | null>(() => {
    const next = this.view()?.dates[0];
    const topic = next ? this.upcoming().find((t) => t.date === next) : undefined;
    return topic ? toView(topic) : null;
  });

  /** Hora de la próxima: la de su tema si esa noche cambia. */
  protected readonly nextTime = computed(() => this.spotlight()?.time ?? this.view()?.time ?? '');

  /** Temas siguientes (sin el destacado). */
  private readonly agendaAll = computed(() => {
    const skip = this.spotlight()?.date;
    return this.upcoming().filter((t) => t.date !== skip);
  });

  protected readonly showAll = signal(false);

  protected readonly agenda = computed<readonly TopicView[]>(() => {
    const all = this.agendaAll();
    const shown = this.showAll() ? all : all.slice(0, AGENDA_SHOWN);
    return shown.map(toView);
  });

  protected readonly agendaTotal = computed(() => this.agendaAll().length);
  protected readonly canExpand = computed(() => this.agendaTotal() > AGENDA_SHOWN);

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
