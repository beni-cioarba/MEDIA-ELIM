import data from './bible-verses.json';
import { PassageRef } from './bible-refs';

/**
 * Cuánto texto es un pasaje: versículos y minutos de lectura aproximados.
 *
 * Datos: `bible-verses.json` (versículos por capítulo de la KJV y palabras por
 * versículo de cada libro; lo genera `scripts/generate-bible-verses.mjs`). Lo
 * importa sólo la página del día (su chunk): ~2 kB comprimido.
 */
interface BookStats {
  /** Palabras por versículo (media del libro en la KJV). */
  readonly wpv: number;
  /** Versículos de cada capítulo (índice 0 = capítulo 1). */
  readonly verses: readonly number[];
}

const BOOKS = (data as unknown as { readonly books: Readonly<Record<string, BookStats>> }).books;

/** Palabras por minuto leyendo con atención, en voz baja. */
const WORDS_PER_MINUTE = 180;
/** El rumano y el español usan ~10 % más palabras que el inglés de la KJV. */
const TRANSLATION_FACTOR = 1.1;

/** Versículos de un pasaje: el capítulo entero o el tramo `from–to`. */
export function passageVerses(ref: PassageRef): number {
  if (ref.from !== undefined) return Math.max(0, (ref.to ?? ref.from) - ref.from + 1);
  return BOOKS[ref.book]?.verses[ref.chapter - 1] ?? 0;
}

/** Minutos aproximados para leer unos pasajes: redondeado, y al menos 1 si hay texto. */
export function readingMinutes(refs: readonly PassageRef[]): number {
  const words = refs.reduce((sum, ref) => sum + passageVerses(ref) * (BOOKS[ref.book]?.wpv ?? 0), 0);
  return words > 0 ? Math.max(1, Math.round((words * TRANSLATION_FACTOR) / WORDS_PER_MINUTE)) : 0;
}
