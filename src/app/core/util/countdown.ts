/**
 * Cuenta atrás corta y neutra en los dos idiomas: «45 min», «2 h»,
 * «2 h 15 min». La usan los chips de «lo próximo» de las portadas (inicio y
 * departamentos).
 */
export function formatIn(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Minutos desde que empieza una reunión durante los que cuenta como «en marcha». */
export const NOW_WINDOW_MIN = 120;
