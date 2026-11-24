/** Lógica pura de la página de preguntas (sin Angular; `faq.config.spec.ts`). */

/**
 * Parte una lista en dos columnas **seguidas** (se lee la primera entera y
 * después la segunda: el orden de pantalla es el del teclado) con el peso lo
 * más igualado posible. Con un elemento o ninguno, una sola columna.
 */
export function splitColumns<T>(items: readonly T[], weight: (item: T) => number): readonly (readonly T[])[] {
  if (items.length < 2) return items.length ? [items] : [];
  // +1 por elemento: cada tema lleva su título, que también ocupa.
  const weights = items.map((item) => weight(item) + 1);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cut = 1;
  let best = Infinity;
  for (let i = 1, left = 0; i < items.length; i++) {
    left += weights[i - 1];
    const gap = Math.abs(total - 2 * left);
    if (gap < best) {
      best = gap;
      cut = i;
    }
  }
  return [items.slice(0, cut), items.slice(cut)];
}
