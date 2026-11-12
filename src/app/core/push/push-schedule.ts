/**
 * Horas de un envío diario en una zona horaria concreta (p. ej. las 08:00 de
 * `Europe/Madrid`), sin librerías: `Intl` ya sabe los cambios de hora.
 *
 * Puras y sin Angular: las usan el interruptor de la página (para decir «la
 * próxima, mañana a las 08:00») y el envío diario
 * (`scripts/impreuna-push.mjs`, vía `scripts/lib/load-ts-module.mjs`), así
 * los dos calculan lo mismo.
 */

const DAY_MS = 86_400_000;

/** Fecha `YYYY-MM-DD` que marca el calendario de `timeZone` en el instante `ms`. */
export function zonedDate(ms: number, timeZone: string): string {
  // `en-CA` escribe las fechas como ISO (2026-11-13).
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ms),
  );
}

/** Diferencia (ms) entre la hora de `timeZone` y UTC en el instante `ms`. */
function offsetAt(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wall - Math.floor(ms / 1000) * 1000;
}

/**
 * Instante (ms) en que el reloj de `timeZone` marca `hour`:00 del día
 * `isoDate`. Dos pasadas: la segunda corrige el caso de que entre la
 * estimación y la hora buscada haya un cambio de hora.
 */
export function zonedInstant(isoDate: string, hour: number, timeZone: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, hour);
  const first = wall - offsetAt(wall, timeZone);
  return wall - offsetAt(first, timeZone);
}

/** `isoDate` más `days` días (calendario puro, sin horas). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Día del año (1 = 1 de enero) de una fecha `YYYY-MM-DD`. */
export function dayOfYear(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY_MS) + 1;
}

/** El próximo envío diario desde `now`: hoy si aún no ha llegado la hora; si no, mañana. */
export function nextDaily(now: number, hour: number, timeZone: string): { readonly date: string; readonly at: number } {
  const today = zonedDate(now, timeZone);
  const at = zonedInstant(today, hour, timeZone);
  if (now < at) return { date: today, at };
  const tomorrow = addDays(today, 1);
  return { date: tomorrow, at: zonedInstant(tomorrow, hour, timeZone) };
}
