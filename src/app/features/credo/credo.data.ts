import { IconName } from '../../core/ui/icon-name';

/**
 * Un artículo de la confesión de fe.
 *
 * `id` es la clave i18n (`credo.articles.<id>.{title,body,refs}`) y `n` el
 * número oficial del artículo en el documento del Culto Cristiano
 * Pentecostal, que se muestra para poder citarlo.
 */
export interface CredoArticle {
  readonly id: string;
  readonly n: number;
}

/** Una de las cuatro partes en las que se divide la confesión. */
export interface CredoPart {
  readonly id: string;
  /** Numeral romano tal y como aparece en el documento oficial. */
  readonly numeral: string;
  readonly icon: IconName;
  readonly articles: readonly CredoArticle[];
}

/**
 * Estructura de la **Mărturisirea de credință a Cultului Creștin Penticostal**
 * (adoptada en el Congreso del 8-10 de octubre de 2025).
 *
 * Aquí sólo vive el esqueleto: numeración, agrupación y orden. Todo el texto
 * está en `credo.*` de los ficheros i18n, porque debe existir en rumano y en
 * español. Añadir o reordenar un artículo es tocar este array y sus tres
 * claves de traducción.
 */
export const CREDO_PARTS: readonly CredoPart[] = [
  {
    id: 'doctrine',
    numeral: 'I',
    icon: 'book',
    articles: [
      { id: 'scripture', n: 1 },
      { id: 'trinity', n: 2 },
      { id: 'creation', n: 3 },
      { id: 'angels', n: 4 },
      { id: 'humanity', n: 5 },
      { id: 'fall', n: 6 },
      { id: 'christ', n: 7 },
      { id: 'redemption', n: 8 },
      { id: 'conversion', n: 9 },
      { id: 'new_birth', n: 10 },
      { id: 'sanctification', n: 11 },
      { id: 'spirit_baptism', n: 12 },
      { id: 'gifts', n: 13 },
      { id: 'healing', n: 14 },
      { id: 'fruit', n: 15 },
      { id: 'church', n: 16 },
      { id: 'ministers', n: 17 },
      { id: 'water_baptism', n: 18 },
      { id: 'lords_supper', n: 19 },
      { id: 'foot_washing', n: 20 },
      { id: 'child_blessing', n: 21 },
      { id: 'discipline', n: 22 },
      { id: 'authorities', n: 23 },
      { id: 'second_coming', n: 24 },
    ],
  },
  {
    id: 'practices',
    numeral: 'II',
    icon: 'sparkles',
    articles: [{ id: 'disciplines', n: 25 }],
  },
  {
    id: 'family',
    numeral: 'III',
    icon: 'users',
    articles: [
      { id: 'family', n: 26 },
      { id: 'civil_marriage', n: 27 },
    ],
  },
  {
    id: 'morals',
    numeral: 'IV',
    icon: 'heart',
    articles: [
      { id: 'conduct', n: 28 },
      { id: 'love', n: 29 },
      { id: 'life', n: 30 },
    ],
  },
];

/** Número total de artículos, para los rótulos («30 de articole»). */
export const CREDO_ARTICLE_COUNT = CREDO_PARTS.reduce(
  (total, part) => total + part.articles.length,
  0,
);

/**
 * Prefijo de las anclas de artículo dentro de la página del credo
 * (`/marturisirea-de-credinta#art-church`).
 */
export const CREDO_ANCHOR = 'art-';

/**
 * Cita a un artículo desde otra página: su número oficial y el fragmento de
 * URL que lo abre.
 *
 * El número **se busca, no se escribe a mano**: si mañana se reordena la
 * confesión, la referencia sigue apuntando al artículo correcto en vez de
 * quedarse mintiendo. Devuelve `n: 0` si el id no existe, que es visible al
 * instante en pantalla y no rompe la página.
 */
export function citarArticulo(id: string): { readonly n: number; readonly fragment: string } {
  const articulo = CREDO_PARTS.flatMap((parte) => parte.articles).find((a) => a.id === id);
  return { n: articulo?.n ?? 0, fragment: CREDO_ANCHOR + id };
}
