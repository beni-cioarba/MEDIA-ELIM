import { BIBLE_READING_PLAN, BibleReadingPlan } from '../bible-reading.config';
import { addDays, parseIsoDate, toIsoDate } from '../util/iso-date';

/** Etiqueta del aviso diario de Citirea Bibliei (su valor es el idioma). */
export const BIBLE_PUSH_TOPIC = 'biblia';

/** La lectura de un día del plan de la iglesia. */
export interface ChurchReading {
  /** Texto del plan, con raya en los intervalos («Ezechiel 40–41»; NT incluido si lo hay). */
  readonly passage: string;
  readonly week: number;
  /** Tramo de la semana («Ezechiel 32–45»). */
  readonly summary: string;
  /** Día dentro de la semana (1 = lunes) y cuántos tiene. */
  readonly day: number;
  readonly days: number;
}

/** Guion entre cifras → raya («40-41» → «40–41»), como lo compone la web. */
const dash = (text: string): string => text.replace(/(\d)\s*-\s*(\d)/g, '$1–$2');

/**
 * Qué se lee el día `isoDate` (`YYYY-MM-DD`) en el plan de la iglesia, o
 * `null` si el plan no lo cubre. Pura y sin Angular: la usan la web (la
 * tarjeta del aviso) y el envío diario (`scripts/impreuna-push.mjs`).
 */
export function churchReadingOn(isoDate: string, plan: BibleReadingPlan = BIBLE_READING_PLAN): ChurchReading | null {
  for (const month of plan.months) {
    for (const week of month.weeks) {
      const index = week.readings.findIndex((_, i) => toIsoDate(addDays(parseIsoDate(week.start), i)) === isoDate);
      if (index < 0) continue;
      const nt = week.newTestament?.[index];
      return {
        passage: dash(nt ? `${week.readings[index]}, ${nt}` : week.readings[index]),
        week: week.number,
        summary: dash(week.summary),
        day: index + 1,
        days: week.readings.length,
      };
    }
  }
  return null;
}
