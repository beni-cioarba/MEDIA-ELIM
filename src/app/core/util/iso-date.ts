/**
 * Fechas de contenido (`YYYY-MM-DD`) — helpers compartidos.
 *
 * Todo el contenido temporal de la iglesia (eventos, anuncios) se escribe como
 * fecha ISO **sin hora ni zona**. Se interpreta siempre en hora local: un
 * `new Date('2026-10-18')` se parsearía como UTC y en España marcaría el día
 * anterior a la 1:00 de la madrugada, que es justo cuando el operador prepara
 * la proyección del domingo.
 */

/** Parsea `YYYY-MM-DD` en hora local. Campos ausentes valen 1 (enero / día 1). */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Medianoche local del día de la fecha dada. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Milisegundos de un día natural (para contadores «faltan X días»). */
export const DAY_MS = 86_400_000;

/**
 * Suma días naturales respetando el calendario local. No se suma `DAY_MS`:
 * en los cambios de hora un día tiene 23 o 25 horas y el resultado se
 * desplazaría al día anterior o a la 01:00.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `Date` local → `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
