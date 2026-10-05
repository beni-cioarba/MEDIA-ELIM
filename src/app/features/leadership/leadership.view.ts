import { APP_PATHS } from '../../core/navigation/app-paths';
import { IconName } from '../../core/ui/icon-name';
import {
  CHURCH_COMMITTEE,
  LEADERSHIP_OFFICES,
  PEOPLE_INDEX,
  PEOPLE_IN_ORDER,
  PersonId,
  PersonProfile,
  PersonTier,
  PersonTitle,
  SERVICE_AREAS,
  ServiceRole,
  personTier,
} from '../../core/leadership.config';

/**
 * MODELOS DE VISTA DE «CONDUCERE»
 * ===============================
 *
 * El organigrama es **constante**: no cambia mientras la página está
 * abierta. Así que todo lo que las plantillas necesitan (nivel de cada
 * persona, cuántas slujiri tiene, su subtítulo, el directorio con las
 * personas ya resueltas, las cifras) se calcula **una vez al cargar el
 * módulo** y las plantillas sólo leen campos. Antes se llamaba a
 * `servicePostings()` / `profile()` varias veces por tarjeta en cada ciclo de
 * detección de cambios.
 *
 * Lo único que depende del idioma (los nombres traducidos de departamentos,
 * para buscar) lo resuelve el componente en un `computed` por idioma.
 */

// ---------------------------------------------------------------------
// Persona
// ---------------------------------------------------------------------

/** Lo que pinta cualquier tarjeta, píldora o fila de una persona. */
export interface PersonCard {
  readonly id: PersonId;
  readonly name: string;
  readonly photo?: string;
  readonly tier: PersonTier;
  readonly titles: readonly PersonTitle[];
  /** Departamentos en los que sirve (sin contar cargos de gobierno). */
  readonly serviceCount: number;
  /** Clave del primer departamento, para el subtítulo si no tiene cargo. */
  readonly firstDepartmentKey: string | null;
  /** Claves de todos sus departamentos (para buscar por departamento). */
  readonly departmentKeys: readonly string[];
  /** Nombre en minúsculas y sin diacríticos, para buscar. */
  readonly searchName: string;
  /** Enlace del router a su perfil. */
  readonly link: string[];
}

/** Enlace del router al perfil de una persona: `/conducere/<id>`. */
export function personLink(id: string): string[] {
  return ['/', APP_PATHS.leadership, id];
}

/** Departamentos de servicio de una persona (sin los cargos de gobierno). */
export function servicePostings(person: PersonProfile): PersonProfile['postings'] {
  return person.postings.filter((posting) => posting.areaKey !== null);
}

function toCard(person: PersonProfile): PersonCard {
  const postings = servicePostings(person);
  return {
    id: person.id as PersonId,
    name: person.name,
    photo: person.photo,
    tier: personTier(person),
    titles: person.titles ?? [],
    serviceCount: postings.length,
    firstDepartmentKey: postings[0]?.departmentKey ?? null,
    departmentKeys: postings.map((posting) => posting.departmentKey),
    searchName: normalize(person.name),
    link: personLink(person.id),
  };
}

/** Todas las personas, en orden de lectura, ya como tarjetas. */
export const PERSON_CARDS: readonly PersonCard[] = PEOPLE_IN_ORDER.map(toCard);

const CARDS_BY_ID = new Map(PERSON_CARDS.map((card) => [card.id, card]));

/** Tarjeta de una persona. Nunca falla: `PersonId` está tipado. */
export function cardOf(id: PersonId): PersonCard {
  return CARDS_BY_ID.get(id) as PersonCard;
}

/** Pastor y pastor asistente, en ese orden: las tarjetas destacadas. */
export const FEATURED_CARDS: readonly PersonCard[] = (['pastor', 'assistant'] as const)
  .map((tier) => PERSON_CARDS.find((card) => card.tier === tier))
  .filter((card): card is PersonCard => card !== undefined);

/** El resto de cargos de gobierno (prezbiteri, diaconi, secretar…). */
export const LEADER_CARDS: readonly PersonCard[] = PERSON_CARDS.filter((card) => card.tier === 'leader');

/** El comité, en el orden del acta. */
export const COMMITTEE_CARDS: readonly PersonCard[] = CHURCH_COMMITTEE.map(cardOf);

// ---------------------------------------------------------------------
// Directorio
// ---------------------------------------------------------------------

export interface DirectoryMember {
  readonly card: PersonCard;
  readonly roles?: readonly ServiceRole[];
}

export interface DirectoryDepartment {
  readonly id: string;
  readonly i18nKey: string;
  readonly members: readonly DirectoryMember[];
}

export interface DirectoryArea {
  readonly id: string;
  readonly i18nKey: string;
  readonly icon: IconName;
  readonly departments: readonly DirectoryDepartment[];
}

/** Las áreas con sus departamentos y las personas ya resueltas a tarjetas. */
export const DIRECTORY: readonly DirectoryArea[] = SERVICE_AREAS.map((area) => ({
  id: area.id,
  i18nKey: area.i18nKey,
  icon: area.icon,
  departments: area.departments.map((department) => ({
    id: department.id,
    i18nKey: department.i18nKey,
    members: department.members.map(({ person, roles }) => ({ card: cardOf(person), roles })),
  })),
}));

/** Cifras del organigrama. */
export const LEADERSHIP_STATS = {
  people: PEOPLE_INDEX.size,
  offices: LEADERSHIP_OFFICES.length,
  areas: SERVICE_AREAS.length,
  departments: SERVICE_AREAS.reduce((sum, area) => sum + area.departments.length, 0),
  serving: PERSON_CARDS.filter((card) => card.serviceCount > 0).length,
} as const;

// ---------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------

/** Minúsculas y sin diacríticos: «tomoiaga» encuentra a «Tomoiagă». */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Trozo de texto con o sin coincidencia, para resaltar con `<mark>`. */
export interface TextSegment {
  readonly text: string;
  readonly hit: boolean;
}

/**
 * Parte `text` alrededor de la primera coincidencia de `needle` (ya
 * normalizada), **sin perder los diacríticos del original**: se normaliza
 * carácter a carácter guardando de qué carácter viene cada letra, así
 * «tomo» resalta «Tomo» en «Tomoiagă» y «ana» resalta «ană».
 */
export function highlight(text: string, needle: string): readonly TextSegment[] {
  if (!needle) return [{ text, hit: false }];
  const chars = [...text];
  const origin: number[] = [];
  let folded = '';
  chars.forEach((char, index) => {
    const part = normalize(char);
    for (let i = 0; i < part.length; i++) origin.push(index);
    folded += part;
  });
  const at = folded.indexOf(needle);
  if (at < 0) return [{ text, hit: false }];
  const start = origin[at];
  const end = origin[at + needle.length - 1] + 1;
  return [
    { text: chars.slice(0, start).join(''), hit: false },
    { text: chars.slice(start, end).join(''), hit: true },
    { text: chars.slice(end).join(''), hit: false },
  ].filter((segment) => segment.text !== '');
}

// ---------------------------------------------------------------------
// Reparto del directorio en columnas
// ---------------------------------------------------------------------

/**
 * Alto relativo de un área en el directorio: cabecera + por cada
 * departamento su rótulo y sus filas de personas (caben ~2 píldoras por
 * fila). No tiene que ser exacto: sólo ordenar bien las áreas por tamaño.
 */
export function areaWeight(area: DirectoryArea): number {
  return area.departments.reduce((sum, d) => sum + 0.9 + Math.ceil(d.members.length / 2), 1.4);
}

/**
 * Reparte `items` en `n` columnas de alto parecido (LPT: de mayor a menor,
 * cada uno a la columna más baja) y conserva el orden original dentro de
 * cada columna. Las columnas CSS (`columns:`) llenan en orden y, con
 * bloques que no se parten, dejaban una columna mucho más baja que otra.
 */
export function packColumns<T>(items: readonly T[], weight: (item: T) => number, n: number): T[][] {
  const count = Math.max(1, Math.min(n, items.length));
  const columns = Array.from({ length: count }, () => ({ height: 0, entries: [] as { item: T; index: number }[] }));
  const order = items.map((item, index) => ({ item, index, w: weight(item) })).sort((a, b) => b.w - a.w);
  for (const entry of order) {
    const lowest = columns.reduce((min, col) => (col.height < min.height ? col : min));
    lowest.height += entry.w;
    lowest.entries.push(entry);
  }
  return columns
    .map((col) => col.entries.sort((a, b) => a.index - b.index).map((e) => e.item))
    .sort((a, b) => items.indexOf(a[0]) - items.indexOf(b[0]));
}
