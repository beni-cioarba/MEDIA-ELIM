/**
 * Mosaico «justificado» (como Google Fotos o el collage del PowerPoint de la
 * iglesia): las fotos, **enteras y a su proporción**, en filas que llenan el
 * ancho; todas las de una fila comparten alto.
 *
 * Se prueban todas las formas de partir la secuencia en 1…`maxRows` filas
 * **sin cambiar el orden** (01, 02… se leen de izquierda a derecha y de
 * arriba abajo) y se queda la que **más superficie cubre** de la caja. Con
 * 5-10 fotos son como mucho unas decenas de particiones: fuerza bruta,
 * exacta y sin heurísticas.
 *
 * Función pura (sin Angular ni DOM): recibe proporciones y medidas, devuelve
 * rectángulos. Así se puede razonar sobre ella —y probarla— aparte.
 */

export interface JustifiedTile {
  /** Índice en la lista de entrada. */
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

export interface JustifiedRow {
  readonly height: number;
  readonly tiles: readonly JustifiedTile[];
}

export interface JustifiedLayout {
  readonly rows: readonly JustifiedRow[];
  /** Ancho real usado (≤ caja): si hubo que reducir para caber en alto, es menor. */
  readonly width: number;
  readonly height: number;
  /** Fracción de la caja cubierta por fotos (0-1). */
  readonly coverage: number;
}

/**
 * @param ratios  ancho / alto de cada foto, en orden.
 * @param width   ancho de la caja.
 * @param height  alto de la caja.
 * @param gap     separación entre fotos (misma unidad que la caja).
 * @param maxRows filas como máximo (3 por defecto: con más, las fotos quedan
 *                demasiado pequeñas para reconocer a nadie).
 */
export function justifiedLayout(
  ratios: readonly number[],
  width: number,
  height: number,
  gap: number,
  maxRows = 3,
): JustifiedLayout | null {
  if (ratios.length === 0 || width <= 0 || height <= 0) return null;

  let best: JustifiedLayout | null = null;
  for (const partition of partitions(ratios.length, Math.min(maxRows, ratios.length))) {
    const layout = layoutFor(partition, ratios, width, height, gap);
    if (!best || layout.coverage > best.coverage) best = layout;
  }
  return best;
}

/** Coloca una partición concreta (tamaños de cada fila) en la caja. */
function layoutFor(
  sizes: readonly number[],
  ratios: readonly number[],
  width: number,
  height: number,
  gap: number,
): JustifiedLayout {
  // Alto natural de cada fila para llenar el ancho: h = (W − huecos) / Σ ratios.
  let start = 0;
  const natural = sizes.map((size) => {
    const slice = ratios.slice(start, start + size);
    start += size;
    const sum = slice.reduce((a, b) => a + b, 0);
    return { size, sum, height: (width - gap * (size - 1)) / sum };
  });

  const gapsY = gap * (sizes.length - 1);
  const naturalHeight = natural.reduce((a, row) => a + row.height, 0) + gapsY;

  // Si no cabe en alto, se reduce todo en proporción (y sobra ancho).
  const scale = naturalHeight > height ? (height - gapsY) / (naturalHeight - gapsY) : 1;

  let index = 0;
  let area = 0;
  let usedWidth = 0;
  const rows = natural.map((row) => {
    const rowHeight = row.height * scale;
    const tiles: JustifiedTile[] = [];
    let rowWidth = gap * (row.size - 1);
    for (let i = 0; i < row.size; i++, index++) {
      const tileWidth = ratios[index] * rowHeight;
      tiles.push({ index, width: tileWidth, height: rowHeight });
      rowWidth += tileWidth;
      area += tileWidth * rowHeight;
    }
    usedWidth = Math.max(usedWidth, rowWidth);
    return { height: rowHeight, tiles };
  });

  const usedHeight = rows.reduce((a, row) => a + row.height, 0) + gapsY;
  return { rows, width: usedWidth, height: usedHeight, coverage: area / (width * height) };
}

/** Todas las composiciones de `n` en 1…`maxParts` partes positivas, en orden. */
function* partitions(n: number, maxParts: number): Generator<number[]> {
  function* build(remaining: number, parts: number[]): Generator<number[]> {
    if (remaining === 0) {
      yield parts;
      return;
    }
    if (parts.length === maxParts) return;
    for (let take = 1; take <= remaining; take++) {
      yield* build(remaining - take, [...parts, take]);
    }
  }
  yield* build(n, []);
}
