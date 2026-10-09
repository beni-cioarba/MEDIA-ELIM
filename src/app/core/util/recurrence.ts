import { startOfDay, toIsoDate } from './iso-date';

/** Días en iCalendar, en el orden de `Date.getDay()`. */
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Día de la semana, convención `Date.getDay()` (0 = domingo). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Las próximas `count` fechas (`YYYY-MM-DD`) de un día de la semana desde
 * `from` incluido (si hoy es ese día, hoy es la primera).
 */
export function nextWeeklyDates(weekday: Weekday, from: Date, count: number): string[] {
  const first = startOfDay(from);
  first.setDate(first.getDate() + ((weekday - first.getDay() + 7) % 7));
  return Array.from({ length: count }, (_, i) =>
    toIsoDate(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7)),
  );
}

/** `RRULE` de una reunión semanal (`FREQ=WEEKLY;BYDAY=FR`). */
export function weeklyRrule(weekday: Weekday): string {
  return `FREQ=WEEKLY;BYDAY=${ICS_DAYS[weekday]}`;
}

/**
 * Reuniones fijas: semanales (el encuentro de tineret de cada viernes) y
 * mensuales («la n-ésima <día> de cada mes»: la seară de tineret del primer
 * domingo). Puro y sin Angular.
 */
export interface MonthlyRule {
  readonly weekday: Weekday;
  /** Qué ocurrencia del mes: 1–4, o −1 para la última. */
  readonly nth: 1 | 2 | 3 | 4 | -1;
}

/** Fecha de la ocurrencia de `rule` en el mes `month` (0–11) de `year`. */
export function monthlyOccurrence(rule: MonthlyRule, year: number, month: number): Date {
  if (rule.nth === -1) {
    const last = new Date(year, month + 1, 0);
    return new Date(year, month, last.getDate() - ((last.getDay() - rule.weekday + 7) % 7));
  }
  const first = new Date(year, month, 1);
  const offset = (rule.weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (rule.nth - 1) * 7);
}

/**
 * Las próximas `count` fechas (`YYYY-MM-DD`) desde `from` incluido: si hoy
 * toca, hoy es la primera.
 */
export function nextMonthlyDates(rule: MonthlyRule, from: Date, count: number): string[] {
  const today = startOfDay(from).getTime();
  const out: string[] = [];
  for (let i = 0; out.length < count && i < count + 2; i++) {
    const date = monthlyOccurrence(rule, from.getFullYear(), from.getMonth() + i);
    if (date.getTime() >= today) out.push(toIsoDate(date));
  }
  return out;
}

/** `RRULE` de una reunión mensual (`FREQ=MONTHLY;BYDAY=1SU`, `-1FR`…). */
export function monthlyRrule(rule: MonthlyRule): string {
  return `FREQ=MONTHLY;BYDAY=${rule.nth}${ICS_DAYS[rule.weekday]}`;
}
