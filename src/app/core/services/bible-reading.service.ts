import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BIBLE_READING_PLAN, BibleReadingMonth, BibleReadingWeek } from '../bible-reading.config';
import { addDays, parseIsoDate, startOfDay, toIsoDate } from '../util/iso-date';
import { ClockService } from './clock.service';

/** Lectura de un día, ya resuelta con su fecha y su estado. */
export interface BibleReadingDayView {
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly passage: string;
  readonly newTestament: string | null;
  readonly isToday: boolean;
  readonly isPast: boolean;
}

/** Dónde cae la semana respecto a hoy. `current` = la que se anuncia. */
export type BibleReadingWeekStatus = 'past' | 'current' | 'upcoming';

/** Semana lista para pintar: fechas, lecturas diarias y el mes al que pertenece. */
export interface BibleReadingWeekView {
  readonly number: number;
  readonly summary: string;
  readonly start: string;
  /** Último día con lectura (`YYYY-MM-DD`). */
  readonly end: string;
  readonly days: readonly BibleReadingDayView[];
  readonly month: BibleReadingMonth;
  /** `true` cuando la semana empieza mañana (se anuncia el domingo). */
  readonly startsTomorrow: boolean;
  readonly status: BibleReadingWeekStatus;
}

/** Un mes del plan con sus semanas ya resueltas (para la vista completa). */
export interface BibleReadingMonthView {
  readonly id: string;
  readonly label: string;
  readonly scope: string;
  readonly weeks: readonly BibleReadingWeekView[];
}

type PlannedWeek = BibleReadingWeek & { readonly month: BibleReadingMonth };

/**
 * Plan de lectura bíblica: **qué semana se anuncia hoy**.
 *
 * Regla: se anuncia la semana que contiene **mañana**. Así el domingo, en el
 * culto, ya se proyecta la semana que empieza el lunes (la que la congregación
 * tiene que leer), y de lunes a sábado se ve la semana en curso con el día de
 * hoy resaltado. No hay nada que cambiar a mano cada semana.
 *
 * Si mañana cae en un hueco entre semanas se anuncia la siguiente que empiece;
 * cuando el plan ha terminado no hay semana y el bloque se autoexcluye de la
 * proyección.
 *
 * Todo el cálculo es en días naturales locales (`YYYY-MM-DD` comparados como
 * texto), nunca en milisegundos: los cambios de hora no mueven ningún día.
 * Reacciona al reloj compartido, así que el portátil del templo cambia de
 * semana a medianoche sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class BibleReadingService {
  private readonly clock = inject(ClockService);
  private readonly translate = inject(TranslateService);

  readonly plan = BIBLE_READING_PLAN;

  /** Todas las semanas del plan, en orden, con el mes al que pertenecen. */
  private readonly weeks: readonly PlannedWeek[] = BIBLE_READING_PLAN.months.flatMap((month) =>
    month.weeks.map((week) => ({ ...week, month })),
  );

  /** Número de la semana que toca anunciar, o `null` si el plan no cubre estas fechas. */
  private readonly announcedNumber = computed<number | null>(() => {
    const today = startOfDay(new Date(this.clock.now()));
    const tomorrowIso = toIsoDate(addDays(today, 1));
    const containing = this.weeks.find(
      (week) => week.start <= tomorrowIso && tomorrowIso <= endOf(week),
    );
    return (containing ?? this.weeks.find((w) => w.start > tomorrowIso))?.number ?? null;
  });

  /** Semana que toca anunciar, o `null` si el plan no cubre estas fechas. */
  readonly announcedWeek = computed<BibleReadingWeekView | null>(() => {
    const number = this.announcedNumber();
    const week = this.weeks.find((w) => w.number === number);
    return week ? this.toView(week) : null;
  });

  readonly hasReading = computed<boolean>(() => this.announcedWeek() !== null);

  /**
   * El plan completo, mes a mes, con cada semana marcada como pasada, actual
   * o futura: para la vista «toda la programación» de la web.
   */
  readonly planOverview = computed<readonly BibleReadingMonthView[]>(() =>
    BIBLE_READING_PLAN.months.map((month) => ({
      id: month.id,
      label: month.label,
      scope: month.scope,
      weeks: month.weeks.map((week) => this.toView({ ...week, month })),
    })),
  );

  /** Total de semanas y extremos del plan, para el rótulo del desplegable. */
  readonly planSpan = computed<{ readonly weeks: number; readonly start: string; readonly end: string } | null>(
    () => {
      const first = this.weeks[0];
      const last = this.weeks[this.weeks.length - 1];
      if (!first || !last) return null;
      return { weeks: this.weeks.length, start: first.start, end: endOf(last) };
    },
  );

  private toView(week: PlannedWeek): BibleReadingWeekView {
    const today = startOfDay(new Date(this.clock.now()));
    const todayIso = toIsoDate(today);
    const tomorrowIso = toIsoDate(addDays(today, 1));
    const announced = this.announcedNumber();
    const end = endOf(week);

    const start = parseIsoDate(week.start);
    const days = week.readings.map<BibleReadingDayView>((passage, index) => {
      const date = toIsoDate(addDays(start, index));
      return {
        date,
        passage,
        newTestament: week.newTestament?.[index] ?? null,
        isToday: date === todayIso,
        isPast: date < todayIso,
      };
    });

    // Pasada = ya no se anuncia (el domingo, la semana que termina hoy ya cede
    // el sitio a la siguiente): por eso se compara con mañana, no con hoy.
    const status: BibleReadingWeekStatus =
      week.number === announced ? 'current' : end < tomorrowIso ? 'past' : 'upcoming';

    return {
      number: week.number,
      summary: week.summary,
      start: week.start,
      end,
      days,
      month: week.month,
      startsTomorrow: week.start === tomorrowIso,
      status,
    };
  }

  /** «21 – 27 septembrie 2026» / «28 septembrie – 4 octombrie 2026», localizado. */
  formatRange(startIso: string, endIso: string): string {
    const lang = this.lang();
    const start = parseIsoDate(startIso);
    const end = parseIsoDate(endIso);
    try {
      const day = new Intl.DateTimeFormat(lang, { day: 'numeric' });
      const dayMonth = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' });
      const full = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' });
      const sameMonth =
        start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      return `${sameMonth ? day.format(start) : dayMonth.format(start)} – ${full.format(end)}`;
    } catch {
      return `${startIso} – ${endIso}`;
    }
  }

  /** Día de la semana completo («luni»), localizado. */
  /**
   * Día de la semana («luni» / «lun»). La forma corta es para la proyección,
   * donde «miercuri» o «duminică» partían la fila en dos líneas.
   */
  formatWeekday(iso: string, form: 'long' | 'short' = 'long'): string {
    try {
      return new Intl.DateTimeFormat(this.lang(), { weekday: form })
        .format(parseIsoDate(iso))
        .replace(/.$/, '');
    } catch {
      return iso;
    }
  }

  /** Día del mes («21»). */
  formatDayNumber(iso: string): string {
    return String(parseIsoDate(iso).getDate());
  }

  private lang(): string {
    return this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
  }
}

/** Último día con lectura de la semana (`YYYY-MM-DD`). */
function endOf(week: BibleReadingWeek): string {
  return toIsoDate(addDays(parseIsoDate(week.start), Math.max(0, week.readings.length - 1)));
}
