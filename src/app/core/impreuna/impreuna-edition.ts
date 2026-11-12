/**
 * Proiectul Împreună — la edición en curso: sus 365 lecturas ya interpretadas.
 *
 * Sólo depende del plan (`data/<año>.plan.json`, ~8 kB): lo puede importar el
 * resumen del menú sin arrastrar los vídeos. Los vídeos y el estado (lo leído,
 * la consulta a la web del proyecto) están en `ImpreunaService`.
 *
 * Edición nueva: `npm run impreuna:sync -- --plan --year <año>` y cambiar el
 * import de abajo (`docs/ai/32-impreuna.md` → «Edición nueva»).
 */
import plan from './data/2026.plan.json';
import {
  DayKind,
  PassageRef,
  dayKind,
  dayOfEdition,
  isoDateOfDay,
  parseReading,
  youversionDay,
} from './impreuna-plan';

export interface ImpreunaEdition {
  readonly year: number;
  /** Días de la edición (365 / 366). */
  readonly total: number;
  /** Plan de YouVersion que se sigue y días suyos que el proyecto se saltó. */
  readonly youversionPlan: number;
  readonly youversionSkipped: readonly number[];
}

/** Un día del plan, listo para pintar. */
export interface PlanDay {
  readonly day: number;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly refs: readonly PassageRef[];
  readonly kind: DayKind;
  /** El mismo día en el plan de la app Biblia (YouVersion). */
  readonly youversionDay: number;
}

export const IMPREUNA_EDITION: ImpreunaEdition = {
  year: plan.year,
  total: plan.readings.length,
  youversionPlan: plan.source.youversion,
  youversionSkipped: plan.source.skipped,
};

const DAYS: readonly PlanDay[] = plan.readings.map((reading, i) => {
  const refs = parseReading(reading);
  return {
    day: i + 1,
    date: isoDateOfDay(plan.year, i + 1),
    refs,
    kind: dayKind(refs),
    youversionDay: youversionDay(i + 1, plan.source.skipped),
  };
});

/** Todos los días de la edición, en orden. */
export const PLAN_DAYS: readonly PlanDay[] = DAYS;

/** Un día de la edición (1-based) o `null` si no existe. */
export function planDay(day: number): PlanDay | null {
  return DAYS[day - 1] ?? null;
}

/** En qué punto de la edición está una fecha. */
export type EditionStatus = 'before' | 'running' | 'ended';

/** Día de hoy en la edición (o el más cercano) y si la edición está en marcha. */
export function editionToday(now: Date): { readonly status: EditionStatus; readonly day: number } {
  const raw = dayOfEdition(now, IMPREUNA_EDITION.year);
  if (raw < 1) return { status: 'before', day: 1 };
  if (raw > IMPREUNA_EDITION.total) return { status: 'ended', day: IMPREUNA_EDITION.total };
  return { status: 'running', day: raw };
}

/** Cifras de la edición, sacadas del plan (no escritas a mano). */
export interface EditionStats {
  readonly days: number;
  readonly ntDays: number;
  readonly wisdomDays: number;
  readonly ntBooks: number;
  readonly psalms: number;
  readonly proverbs: number;
}

export const EDITION_STATS: EditionStats = (() => {
  const chapters = (book: string) => new Set(DAYS.flatMap((d) => d.refs.filter((r) => r.book === book).map((r) => r.chapter))).size;
  const ntBooks = new Set(DAYS.flatMap((d) => d.refs.filter((r) => r.book !== 'PSA' && r.book !== 'PRO').map((r) => r.book)));
  return {
    days: DAYS.length,
    ntDays: DAYS.filter((d) => d.kind === 'nt').length,
    wisdomDays: DAYS.filter((d) => d.kind === 'wisdom').length,
    ntBooks: ntBooks.size,
    psalms: chapters('PSA'),
    proverbs: chapters('PRO'),
  };
})();
