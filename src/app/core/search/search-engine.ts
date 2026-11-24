import { allowedEdits, excerpt, queryTerms, stem, withinEdits, words } from './search-text';
import { SEARCH_KINDS, SearchEntry, SearchKind } from './search.model';

/**
 * Motor del buscador: índice invertido en memoria y puntuación por campos.
 * Puro, sin Angular ni dependencias.
 *
 * ── Por qué propio y no MiniSearch / Fuse / FlexSearch / Pagefind ─────
 * Son ~700 entradas cortas en dos idiomas, calculadas en el navegador a partir
 * de los datos (caducan solas). A esta escala el motor son 2-3 kB y lo que
 * importa —diacríticos rumanos y españoles, raíz común de plurales y
 * artículos, errata sólo si no hay otra cosa, peso por tipo— habría que
 * escribirlo igualmente encima de la librería. Comparación en
 * `docs/ai/78-search.md`. La interfaz (`SearchIndex.search`) es estrecha: si
 * algún día hacen falta decenas de miles de entradas, se cambia sólo esto.
 *
 * ── Cómo puntúa ───────────────────────────────────────────────────────
 * Cada palabra de la consulta se busca en el vocabulario (exacta > prefijo >
 * misma raíz > dentro de palabra > errata) y suma por el **mejor** campo en
 * que aparece (título, en cualquiera de los dos idiomas > sinónimos > contexto > texto), más cuanto más rara es
 * la palabra. Tienen que aparecer **todas**; si no hay ninguna entrada así, se
 * admiten las que tengan al menos la mitad (`partial`).
 */

export interface SearchHit {
  readonly entry: SearchEntry;
  readonly score: number;
  /** Trozo del texto que coincide, si el título no lo explica. */
  readonly excerpt: string | null;
}

export interface SearchResult {
  readonly hits: readonly SearchHit[];
  /** Palabras de la consulta, plegadas: para resaltar. */
  readonly terms: readonly string[];
  /** Ninguna entrada tiene todas las palabras: son las más cercanas. */
  readonly partial: boolean;
}

/** Resultados de un mismo tipo. */
export interface SearchHitGroup {
  readonly kind: SearchKind;
  readonly hits: readonly SearchHit[];
}

type Field = 'title' | 'alt' | 'keywords' | 'context' | 'body';

const WEIGHT: Readonly<Record<Field, number>> = { title: 10, alt: 9, keywords: 6, context: 3, body: 1 };

/** Calidad de la coincidencia de una palabra. */
const EXACT = 1;
const PREFIX = 0.8;
const STEM = 0.7;
const INSIDE = 0.35;
const TYPO = 0.45;

/** Letras mínimas para buscar dentro de una palabra («bot» en «cibot»): con menos, todo sale. */
const INSIDE_MIN = 4;

interface Posting {
  readonly doc: number;
  readonly field: Field;
}

export class SearchIndex {
  private readonly vocabulary = new Map<string, Posting[]>();
  /** Título y título en el otro idioma, en palabras plegadas. */
  private readonly titles: readonly (readonly string[])[];

  constructor(readonly entries: readonly SearchEntry[]) {
    this.titles = entries.map((entry) =>
      [entry.title, entry.altTitle ?? ''].map((title) => words(title).join(' ')).filter(Boolean),
    );
    entries.forEach((entry, doc) => {
      this.add(doc, 'title', entry.title);
      this.add(doc, 'alt', entry.altTitle);
      this.add(doc, 'keywords', typeof entry.keywords === 'string' ? entry.keywords : entry.keywords?.join(' '));
      this.add(doc, 'context', entry.context);
      this.add(doc, 'body', entry.body);
    });
  }

  search(query: string, limit = 200): SearchResult {
    const terms = queryTerms(query);
    const texts = terms.map((t) => t.text);
    if (terms.length === 0) return { hits: [], terms: texts, partial: false };

    const scores = new Map<number, { score: number; matched: number; bodyOnly: boolean }>();
    for (const term of terms) {
      for (const [doc, best] of this.matchTerm(term.text, term.open)) {
        const acc = scores.get(doc) ?? { score: 0, matched: 0, bodyOnly: true };
        acc.score += best.score;
        acc.matched += 1;
        acc.bodyOnly &&= best.field === 'body';
        scores.set(doc, acc);
      }
    }

    const all = [...scores].filter(([, s]) => s.matched === terms.length);
    const partial = all.length === 0 && terms.length > 1;
    const chosen = partial ? [...scores].filter(([, s]) => s.matched >= terms.length / 2) : all;

    const phrase = words(query).join(' ');
    const hits = chosen
      .map(([doc, s]) => {
        const entry = this.entries[doc];
        const score = (s.score + this.phraseBonus(doc, phrase)) * (entry.boost ?? 1);
        return { doc, score, entry, bodyOnly: s.bodyOnly };
      })
      .sort((a, b) => b.score - a.score || kindOrder(a.entry.kind) - kindOrder(b.entry.kind) || a.doc - b.doc)
      .slice(0, limit)
      .map(({ entry, score, bodyOnly }) => ({
        entry,
        score,
        excerpt: bodyOnly && entry.body ? excerpt(entry.body, texts) : null,
      }));

    return { hits, terms: texts, partial: partial && hits.length > 0 };
  }

  private add(doc: number, field: Field, text: string | undefined): void {
    if (!text) return;
    for (const word of new Set(words(text))) {
      const postings = this.vocabulary.get(word);
      if (postings) postings.push({ doc, field });
      else this.vocabulary.set(word, [{ doc, field }]);
    }
  }

  /** Mejor puntuación de cada entrada para una palabra. */
  private matchTerm(term: string, open: boolean): ReadonlyMap<number, { score: number; field: Field }> {
    const root = stem(term);
    const found = new Map<string, number>();
    for (const word of this.vocabulary.keys()) {
      const quality = matchQuality(word, term, root, open);
      if (quality > 0) found.set(word, quality);
    }
    // Las erratas sólo entran cuando no hay nada mejor: si «cor» existe, quien
    // escribe «cor» no quiere «cora».
    const edits = allowedEdits(term);
    if (found.size === 0 && edits > 0) {
      for (const word of this.vocabulary.keys()) {
        // Con la primera letra igual: casi nadie se equivoca en ella y evita
        // parecidos absurdos. Lo que se está escribiendo se compara con el
        // principio de la palabra («evanghlz» ↔ «evangheliz-are»).
        if (word[0] !== term[0]) continue;
        const head = open && word.length > term.length ? word.slice(0, term.length) : word;
        if (withinEdits(word, term, edits) || withinEdits(head, term, Math.min(edits, 1))) found.set(word, TYPO);
      }
    }

    const best = new Map<number, { score: number; field: Field }>();
    for (const [word, quality] of found) {
      const postings = this.vocabulary.get(word)!;
      const rarity = Math.log(1 + this.entries.length / postings.length);
      for (const { doc, field } of postings) {
        const score = WEIGHT[field] * quality * rarity;
        const current = best.get(doc);
        if (!current || score > current.score) best.set(doc, { score, field });
      }
    }
    return best;
  }

  /** El título **es** lo buscado, empieza por ello o lo contiene seguido. */
  private phraseBonus(doc: number, phrase: string): number {
    if (!phrase) return 0;
    return this.titles[doc].reduce((best, title) => Math.max(best, bonusOf(title, phrase)), 0);
  }
}

function bonusOf(title: string, phrase: string): number {
  // «botez» es «Botezuri» tanto como «Botez»: con la misma raíz, el tipo decide.
  if (title === phrase || (!phrase.includes(' ') && stem(title) === stem(phrase))) return 60;
  if (title.startsWith(phrase)) return 25;
  return ` ${title}`.includes(` ${phrase}`) ? 12 : 0;
}

function matchQuality(word: string, term: string, root: string, open: boolean): number {
  if (word === term) return EXACT;
  // Un prefijo vale más cuanto más entera está la palabra. Con una o dos
  // letras sólo si se está escribiendo (si no, «la » traería media web).
  if (word.startsWith(term) && (open || term.length >= 3)) return PREFIX * (0.7 + 0.3 * (term.length / word.length));
  if (root.length >= 4 && stem(word) === root) return STEM;
  if (term.length >= INSIDE_MIN && word.includes(term)) return INSIDE;
  return 0;
}

function kindOrder(kind: SearchKind): number {
  return SEARCH_KINDS.indexOf(kind);
}

/**
 * Agrupa por tipo, **en el orden de su mejor resultado**: lo más probable
 * queda arriba aunque su grupo sólo tenga una entrada.
 */
export function groupHits(hits: readonly SearchHit[]): readonly SearchHitGroup[] {
  const groups = new Map<SearchKind, SearchHit[]>();
  for (const hit of hits) {
    const list = groups.get(hit.entry.kind);
    if (list) list.push(hit);
    else groups.set(hit.entry.kind, [hit]);
  }
  return [...groups].map(([kind, list]) => ({ kind, hits: list }));
}
