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

  /** Semana que toca anunciar, o `null` si el plan no cubre estas fechas. */
  readonly announcedWeek = computed<BibleReadingWeekView | null>(() => {
    const today = startOfDay(new Date(this.clock.now()));
    const todayIso = toIsoDate(today);
    const tomorrowIso = toIsoDate(addDays(today, 1));

    const containing = this.weeks.find(
      (week) => week.start <= tomorrowIso && tomorrowIso <= endOf(week),
    );
    const week = containing ?? this.weeks.find((w) => w.start > tomorrowIso) ?? null;
    if (!week) return null;

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

    return {
      number: week.number,
      summary: week.summary,
      start: week.start,
      end: endOf(week),
      days,
      month: week.month,
      startsTomorrow: week.start === tomorrowIso,
    };
  });

  readonly hasReading = computed<boolean>(() => this.announcedWeek() !== null);

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
  formatWeekday(iso: string): string {
    try {
      return new Intl.DateTimeFormat(this.lang(), { weekday: 'long' }).format(parseIsoDate(iso));
    } catch {
      return iso;
    }
  }

  /** Día del mes («21»). */
  formatDayNumber(iso: string): string {
    return String(parseIsoDate(iso).getDate());
  }

  private lang(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'ro';
  }
}

/** Último día con lectura de la semana (`YYYY-MM-DD`). */
function endOf(week: BibleReadingWeek): string {
  return toIsoDate(addDays(parseIsoDate(week.start), Math.max(0, week.readings.length - 1)));
}
