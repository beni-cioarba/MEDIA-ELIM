/**
 * Collage de la semana en **filas de la misma altura** que forman un
 * rectángulo exacto.
 *
 * ── El criterio: misma altura = misma escala de las personas ──────────
 * Son fotos de grupo de pie, de 2 a 10 personas. Si todas las fotos tienen la
 * misma altura, todas las personas salen al mismo tamaño: una foto es más
 * ancha sólo porque hay más gente en ella, no porque «importe» más. Es lo que
 * el ojo lee como justo.
 *
 * ── Alternativas descartadas (revisión del 03/10/2026, medidas) ───────
 *  - Mosaico justificado libre: cada fila toma la altura que le da su ancho;
 *    una fila de dos salía 2-3 veces más grande que una de tres.
 *  - Marcos iguales: una foto apaisada en un marco vertical se quedaba en la
 *    mitad de superficie; y 5 = 3 + 2 deja huecos a los lados.
 *  - Superficie igual: justo en área pero filas de anchos y alturas
 *    distintos; el conjunto quedaba deshilachado y con mucho aire sin usar.
 *  Con fotos enteras (nunca se recorta a nadie) y formatos distintos no se
 *  puede tener a la vez superficie idéntica y un bloque sin huecos; la altura
 *  común es el compromiso que mejor aprovecha la caja (68-87 % de foto nítida
 *  con las semanas reales, frente a 68-74 % con superficie igual).
 *
 * ── Cómo se coloca ───────────────────────────────────────────────────
 * Se prueban las particiones de la secuencia en 1…`maxRows` filas **parejas**
 * (difieren como mucho en una foto: 3 + 2, nunca 4 + 1) **sin cambiar el
 * orden**, porque la lista se lee en el mismo orden que las fotos. Para cada
 * una:
 *
 *  1. Altura natural de cada fila = la que le hace llenar el ancho.
 *  2. Ninguna fila pasa de `rowTolerance` × la más baja (1,12: diferencia
 *     imperceptible, y evita bandas grandes cuando una fila llenaría con poco).
 *  3. Si no cabe en alto, todo se reduce en proporción y el bloque estrecha
 *     (el ancho que suelta se lo lleva la lista: no queda hueco).
 *  4. La fila que no llega al ancho del bloque ensancha sus marcos en
 *     proporción; ese margen lo rellena la propia foto difuminada
 *     (`FamilyPhotoComponent`), así el bloque es un rectángulo exacto.
 *
 * Gana la partición con más superficie de foto nítida, penalizando el relleno
 * difuminado. Unas decenas de particiones como mucho: fuerza bruta, exacta y
 * sin heurísticas. Función pura (sin Angular ni DOM).
 */

export interface EvenRowsTile {
  /** Índice en la lista de entrada. */
  readonly index: number;
  /** Medida del marco (la foto va entera dentro, a toda su altura). */
  readonly width: number;
  readonly height: number;
}

export interface EvenRowsRow {
  readonly height: number;
  readonly tiles: readonly EvenRowsTile[];
}

export interface EvenRowsLayout {
  readonly rows: readonly EvenRowsRow[];
  /** Caja real usada (≤ la disponible): el ancho que sobra es para la lista. */
  readonly width: number;
  readonly height: number;
}

export interface EvenRowsOptions {
  /** Filas como máximo: con más, no se reconoce a nadie a distancia. */
  readonly maxRows?: number;
  /** Cociente máximo entre la fila más alta y la más baja. */
  readonly rowTolerance?: number;
  /** Cuánto resta del criterio cada unidad de superficie difuminada (0-1). */
  readonly blurPenalty?: number;
}

/**
 * @param ratios ancho / alto de cada foto, en orden.
 * @param width  ancho disponible.
 * @param height alto disponible.
 * @param gap    separación entre fotos (misma unidad que la caja).
 */
export function evenRowsLayout(
  ratios: readonly number[],
  width: number,
  height: number,
  gap: number,
  { maxRows = 3, rowTolerance = 1.12, blurPenalty = 0.5 }: EvenRowsOptions = {},
): EvenRowsLayout | null {
  if (ratios.length === 0 || width <= 0 || height <= 0) return null;

  let best: { score: number; layout: EvenRowsLayout } | null = null;
  for (const sizes of balancedPartitions(ratios.length, Math.min(maxRows, ratios.length))) {
    const candidate = layoutFor(sizes, ratios, width, height, gap, rowTolerance, blurPenalty);
    if (candidate && (!best || candidate.score > best.score)) best = candidate;
  }
  return best?.layout ?? null;
}

function layoutFor(
  sizes: readonly number[],
  ratios: readonly number[],
  width: number,
  height: number,
  gap: number,
  rowTolerance: number,
  blurPenalty: number,
): { score: number; layout: EvenRowsLayout } | null {
  // Proporciones de cada fila, en orden.
  let start = 0;
  const rows = sizes.map((size) => {
    const slice = ratios.slice(start, start + size);
    const first = start;
    start += size;
    return { first, ratios: slice, sum: slice.reduce((a, b) => a + b, 0) };
  });

  // 1-2. Altura que llena el ancho, acotada a `rowTolerance` × la más baja.
  const natural = rows.map((row) => (width - gap * (row.ratios.length - 1)) / row.sum);
  const lowest = Math.min(...natural);
  let heights = natural.map((h) => Math.min(h, lowest * rowTolerance));

  // 3. Si no cabe en alto, todo a escala (el bloque estrecha).
  const gapsY = gap * (rows.length - 1);
  if (gapsY >= height) return null;
  const total = heights.reduce((a, b) => a + b, 0);
  if (total + gapsY > height) {
    const scale = (height - gapsY) / total;
    heights = heights.map((h) => h * scale);
  }

  // 4. Ancho del bloque = la fila más ancha; las demás ensanchan sus marcos.
  const content = rows.map((row, r) => heights[r] * row.sum + gap * (row.ratios.length - 1));
  const blockWidth = Math.max(...content);

  let sharp = 0;
  let blurred = 0;
  const laidRows = rows.map((row, r) => {
    const h = heights[r];
    const extra = blockWidth - content[r];
    blurred += extra * h;
    const tiles = row.ratios.map((ratio, i) => {
      sharp += h * h * ratio;
      return { index: row.first + i, width: h * ratio + extra * (ratio / row.sum), height: h };
    });
    return { height: h, tiles };
  });

  return {
    score: sharp - blurPenalty * blurred,
    layout: {
      rows: laidRows,
      width: blockWidth,
      height: heights.reduce((a, b) => a + b, 0) + gapsY,
    },
  };
}

/**
 * Composiciones de `n` en 1…`maxParts` filas **parejas** (la más llena y la
 * más vacía difieren como mucho en una), en orden: 5 → [5], [3,2], [2,3],
 * [2,2,1], [2,1,2], [1,2,2].
 */
function* balancedPartitions(n: number, maxParts: number): Generator<number[]> {
  for (let parts = 1; parts <= maxParts; parts++) {
    yield* chooseRows(parts, n % parts, [], Math.floor(n / parts));
  }
}

function* chooseRows(left: number, extra: number, acc: number[], base: number): Generator<number[]> {
  if (left === 0) {
    if (extra === 0) yield acc;
    return;
  }
  if (extra > 0) yield* chooseRows(left - 1, extra - 1, [...acc, base + 1], base);
  if (left > extra) yield* chooseRows(left - 1, extra, [...acc, base], base);
}
