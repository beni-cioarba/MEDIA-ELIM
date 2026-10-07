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
import { hasProfile } from '../../core/leadership-profiles.config';
import { ViewerDocument } from '../../shared/viewer/core/viewer-document.model';
import { PersonPhoto, personPhoto, photoSource, photoThumb } from './person-photo';

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
  readonly photo?: PersonPhoto;
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
  /**
   * Enlace del router a su perfil, o `null` si no tiene página propia (ver
   * `PERSON_PROFILES`). Las plantillas lo pasan tal cual a `[routerLink]`:
   * con `null` el `<a>` se queda sin `href` (texto, no enlace: ni foco ni
   * clic), así una sola plantilla sirve para las dos clases de persona.
   */
  readonly link: string[] | null;
}

/** Valor de `?vista=` para la vista por personas del directorio. */
export const PEOPLE_VIEW_PARAM = 'persoane';

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
    photo: personPhoto(person.id),
    tier: personTier(person),
    titles: person.titles ?? [],
    serviceCount: postings.length,
    firstDepartmentKey: postings[0]?.departmentKey ?? null,
    departmentKeys: postings.map((posting) => posting.departmentKey),
    searchName: normalize(person.name),
    link: hasProfile(person.id as PersonId) ? personLink(person.id) : null,
  };
}

/** Todas las personas, en orden de lectura, ya como tarjetas. */
export const PERSON_CARDS: readonly PersonCard[] = PEOPLE_IN_ORDER.map(toCard);

const CARDS_BY_ID = new Map(PERSON_CARDS.map((card) => [card.id, card]));

/** Tarjeta de una persona. Nunca falla: `PersonId` está tipado. */
export function cardOf(id: PersonId): PersonCard {
  return CARDS_BY_ID.get(id) as PersonCard;
}

/** Quienes tienen página propia, en orden de lectura: anterior / siguiente. */
export const PROFILE_CARDS: readonly PersonCard[] = PERSON_CARDS.filter((card) => card.link !== null);

// ---------------------------------------------------------------------
// Fotos en el visor
// ---------------------------------------------------------------------

/**
 * Retrato de una persona para el visor (todas las variantes), o `null` si
 * aún no tiene foto: la silueta de maqueta no se amplía.
 */
export function photoDocument(card: Pick<PersonCard, 'photo' | 'name'>): ViewerDocument | null {
  const { photo, name } = card;
  if (!photo) return null;
  const { src, srcset } = photoSource(photo, null);
  return { src, srcset, thumb: photoThumb(photo), name, alt: name };
}

/**
 * Las fotos de un bloque de tarjetas como **una sola galería**: al ampliar
 * una se puede pasar a las demás del bloque con ‹ ›, en el mismo orden en
 * que se ven. Sólo entran las fotos reales.
 */
export interface PhotoGallery {
  readonly items: readonly ViewerDocument[];
  /** Posición de cada persona con foto dentro de `items`. */
  readonly at: ReadonlyMap<PersonId, number>;
}

export function photoGallery(cards: readonly PersonCard[]): PhotoGallery {
  const items: ViewerDocument[] = [];
  const at = new Map<PersonId, number>();
  for (const card of cards) {
    const doc = photoDocument(card);
    if (!doc) continue;
    at.set(card.id, items.length);
    items.push(doc);
  }
  return { items, at };
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
// Directorio en dos columnas
// ---------------------------------------------------------------------

/**
 * Filas aproximadas que ocupa un área en la tabla del directorio: su
 * cabecera y, por departamento, las líneas de personas (caben unas tres por
 * línea). Sólo sirve para repartir: no tiene que ser exacto.
 */
function areaRows(area: DirectoryArea): number {
  return area.departments.reduce((sum, d) => sum + Math.max(1, Math.ceil(d.members.length / 3)), 1.2);
}

/**
 * Parte las áreas en dos columnas **conservando el orden de lectura** (la
 * izquierda, de arriba abajo; después la derecha) por el punto que deja las
 * dos columnas más parejas. Así no hay tarjetas estiradas ni huecos, y una
 * columna se lee entera antes de pasar a la otra.
 */
export function splitInTwo(areas: readonly DirectoryArea[]): [DirectoryArea[], DirectoryArea[]] {
  const total = areas.reduce((sum, area) => sum + areaRows(area), 0);
  let best = 0;
  let bestGap = Infinity;
  let acc = 0;
  for (let i = 0; i <= areas.length; i++) {
    const gap = Math.abs(total - 2 * acc);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
    if (i < areas.length) acc += areaRows(areas[i]);
  }
  return [areas.slice(0, best), areas.slice(best)];
}
