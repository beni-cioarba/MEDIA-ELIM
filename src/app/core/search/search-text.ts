/**
 * Texto para buscar: plegado (sin mayúsculas ni diacríticos), palabras, raíz
 * y resaltado. Puro y sin Angular: lo usan el buscador de la web y los
 * buscadores propios de una página («Conducere», la confesión de fe).
 */

/** Marcas combinantes que deja `NFD` (tildes, sedila, coma inferior, breve…). */
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Minúsculas y sin diacríticos: «tomoiaga» encuentra a «Tomoiagă», y «ţ»
 * (sedila, la de los teclados antiguos) es lo mismo que «ț» (coma).
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

/** Palabras plegadas de un texto: sólo letras y números. */
export function words(text: string): string[] {
  return fold(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Palabras que no distinguen nada en ninguno de los dos idiomas. Se quitan de
 * la **consulta** («unde este biserica» busca «biserica»), nunca del índice.
 */
const STOPWORDS = new Set(
  (
    'a al ale ai am are as ca ce cu cum de del deci din e el ea este eu fi in la le lui mai ne nu o pe pentru sa sau se ' +
    'si sunt un una unde unei unui va vreau cand care ' +
    'como con cual cuando de del donde el en es esta hay la las lo los me mi para por que quien se ser sobre su un una y'
  ).split(' '),
);

export interface QueryTerm {
  /** La palabra, plegada. */
  readonly text: string;
  /**
   * La persona puede estar escribiéndola todavía (la última, sin espacio
   * detrás): vale como prefijo aunque sea de una letra.
   */
  readonly open: boolean;
}

/** Palabras útiles de lo que se ha escrito, en orden y sin repetir. */
export function queryTerms(query: string): readonly QueryTerm[] {
  const all = words(query);
  const open = /[\p{L}\p{N}]$/u.test(query);
  const terms = all.map((text, i) => ({ text, open: open && i === all.length - 1 }));
  // La última palabra, si aún se escribe, no se descarta: «de» puede ir camino
  // de «departamente». Si todo son palabras vacías, se buscan tal cual.
  const useful = terms.filter((t) => t.open || !STOPWORDS.has(t.text));
  const kept = useful.length > 0 ? useful : terms;
  return kept.filter((t, i) => kept.findIndex((u) => u.text === t.text) === i);
}

/**
 * Terminaciones de plural, artículo y caso, de la más larga a la más corta.
 * No es un stemmer lingüístico: sólo hace que «familii», «familia», «familie»
 * y «familias» —o «botez», «botezuri», «botezul»— caigan en la misma raíz.
 */
const ENDINGS = [
  'urilor', 'urile', 'elor', 'ilor', 'ului', 'iile', 'uri', 'ele', 'iei', 'iile', 'lor', 'ile', 'ul', 'ii', 'ei',
  'ia', 'ie', 'io', 'ias', 'ios', 'es', 'as', 'os', 'le', 'a', 'e', 'i', 'o', 'u', 's',
].sort((a, b) => b.length - a.length);

/** Lo que queda al quitar la terminación, si queda palabra (≥ 4 letras). */
export function stem(word: string): string {
  if (word.length < 5) return word;
  const ending = ENDINGS.find((e) => word.endsWith(e) && word.length - e.length >= 4);
  return ending ? word.slice(0, -ending.length) : word;
}

/**
 * ¿Están `a` y `b` a `max` erratas o menos? (Damerau-Levenshtein: sobra,
 * falta, cambia una letra o se bailan dos seguidas). Corta en cuanto se pasa.
 */
export function withinEdits(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2] + 1);
      }
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return false;
    beforePrevious = previous;
    previous = row;
  }
  return previous[b.length] <= max;
}

// ---------------------------------------------------------------------
// Resaltado
// ---------------------------------------------------------------------

/** Trozo de texto con o sin coincidencia, para resaltar con `<mark>`. */
export interface TextSegment {
  readonly text: string;
  readonly hit: boolean;
}

/** El texto plegado y, por cada letra plegada, de qué carácter viene. */
function foldWithOrigin(chars: readonly string[]): { readonly folded: string; readonly origin: readonly number[] } {
  const origin: number[] = [];
  let folded = '';
  chars.forEach((char, index) => {
    const part = fold(char);
    for (let i = 0; i < part.length; i++) origin.push(index);
    folded += part;
  });
  return { folded, origin };
}

/** Parte `chars` por los tramos `[desde, hasta)` marcados, sin trozos vacíos. */
function cut(chars: readonly string[], marks: readonly boolean[]): readonly TextSegment[] {
  const out: { text: string; hit: boolean }[] = [];
  chars.forEach((char, i) => {
    const last = out.at(-1);
    if (last && last.hit === marks[i]) last.text += char;
    else out.push({ text: char, hit: marks[i] });
  });
  return out;
}

/**
 * Parte `text` alrededor de la primera coincidencia de `needle` (ya
 * plegada), **sin perder los diacríticos del original**: «tomo» resalta
 * «Tomo» en «Tomoiagă» y «ana» resalta «ană».
 */
export function highlight(text: string, needle: string): readonly TextSegment[] {
  if (!needle) return [{ text, hit: false }];
  const chars = [...text];
  const { folded, origin } = foldWithOrigin(chars);
  const at = folded.indexOf(needle);
  if (at < 0) return [{ text, hit: false }];
  const start = origin[at];
  const end = origin[at + needle.length - 1];
  return cut(chars, chars.map((_, i) => i >= start && i <= end));
}

/**
 * Como `highlight`, con **varias palabras** y sólo a principio de palabra
 * (resaltar la «a» de en medio de cada palabra es ruido). Si la palabra del
 * texto no empieza por lo escrito pero comparte raíz («botezuri» ↔ «Botez»)
 * o es una errata reconocida, se resalta entera.
 */
export function highlightTerms(text: string, terms: readonly string[]): readonly TextSegment[] {
  const wanted = terms.filter(Boolean);
  if (wanted.length === 0 || !text) return [{ text, hit: false }];
  const chars = [...text];
  const { folded, origin } = foldWithOrigin(chars);
  const marks = chars.map(() => false);
  for (const match of folded.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = match[0];
    const length = wanted.reduce((best, term) => Math.max(best, matchedLength(word, term)), 0);
    for (let i = 0; i < length; i++) marks[origin[match.index + i]] = true;
  }
  return cut(chars, marks);
}

/** Letras de `word` que hay que resaltar para `term` (0 = no coincide). */
function matchedLength(word: string, term: string): number {
  if (word.startsWith(term)) return term.length;
  if (stem(word) === stem(term)) return word.length;
  const max = allowedEdits(term);
  return max > 0 && word[0] === term[0] && withinEdits(word, term, max) ? word.length : 0;
}

/** Erratas que se perdonan: ninguna en palabras cortas, donde todo se parece. */
export function allowedEdits(word: string): number {
  if (word.length < 5) return 0;
  return word.length < 8 ? 1 : 2;
}

/**
 * Trozo de `body` alrededor de la primera coincidencia, para enseñar **por
 * qué** sale un resultado cuando lo buscado está en el texto y no en el título.
 */
export function excerpt(body: string, terms: readonly string[], length = 110): string | null {
  const { folded, origin } = foldWithOrigin([...body]);
  for (const match of folded.matchAll(/[\p{L}\p{N}]+/gu)) {
    if (!terms.some((term) => matchedLength(match[0], term) > 0)) continue;
    const chars = [...body];
    const at = origin[match.index];
    let start = Math.max(0, at - Math.round(length / 4));
    // No se empieza a mitad de palabra.
    while (start > 0 && start < at && /\S/.test(chars[start - 1])) start++;
    let end = Math.min(chars.length, start + length);
    while (end < chars.length && end > at && /\S/.test(chars[end])) end--;
    if (end <= at) end = Math.min(chars.length, start + length);
    const text = chars.slice(start, end).join('').trim();
    return `${start > 0 ? '… ' : ''}${text}${end < chars.length ? ' …' : ''}`;
  }
  return null;
}
