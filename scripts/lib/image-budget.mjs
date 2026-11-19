/**
 * Peso máximo razonable de un WebP según su ancho (el sufijo del nombre:
 * `-480.webp`, `-1600.webp`…). Lo usan `check-content.mjs` (avisa) y
 * `fit-image-budget.mjs` (recomprime lo que se pase).
 *
 * Referencia: una foto de 1600 px en WebP de calidad 78-82 pesa 120-280 kB.
 * Por encima de 300 kB casi siempre es una calidad 90+ que no se distingue en
 * pantalla y que se paga en cada visita (medido el 16/11/2026: retratos de la
 * conducere de hasta 1.043 kB).
 */
export const IMAGE_BUDGET_KB = [
  [/-thumb\.webp$/i, 80],
  [/-(160|320)\.webp$/i, 60],
  [/-480\.webp$/i, 120],
  [/-960\.webp$/i, 220],
  [/-1600\.webp$/i, 300],
  [/-2560\.webp$/i, 600],
];

/** Presupuesto en kB para un fichero, o `null` si su nombre no dice el ancho. */
export function imageBudgetKb(path) {
  return IMAGE_BUDGET_KB.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}
