import { IconName } from './ui/icon-name';

/**
 * ORGANIGRAMA DE LA IGLESIA
 * =========================
 *
 * Vive fuera de `church.config.ts` porque tiene una forma propia (un grafo
 * personas ↔ departamentos) y porque se actualiza con otra cadencia: el
 * organigrama cambia cuando cambia la iglesia, no cuando cambia la web.
 *
 * ── La decisión de diseño importante ──────────────────────────────────
 * Una misma persona sirve en varios sitios: el pastor aparece en cuatro
 * departamentos, Samuel Bogdan en tres. Si cada departamento guardara el
 * nombre suelto habría cuatro copias que se desincronizan a la primera
 * corrección ortográfica, y sería imposible responder a «¿qué hace esta
 * persona en la iglesia?» sin leerse el fichero entero.
 *
 * Por eso hay **un registro de personas** (`PEOPLE`) y los departamentos
 * sólo guardan **referencias** (`PersonId`). Consecuencias:
 *
 *  1. El nombre se escribe una vez. Corregirlo se hace en un sitio.
 *  2. `PersonId` es una unión derivada de `PEOPLE`: referenciar a alguien
 *     que no existe **no compila**.
 *  3. El perfil de cada persona (todos sus cargos) se *deriva*, no se
 *     mantiene a mano. Ver `PEOPLE_INDEX`.
 *
 * ── Cómo actualizarlo ─────────────────────────────────────────────────
 *  · Persona nueva  → añádela a `PEOPLE` y refiérela desde su departamento.
 *  · Cargo nuevo    → `PersonTitle` o `ServiceRole` + su clave en es/ro.json.
 *  · Departamento   → añádelo al área que le corresponda y crea
 *                     `leadership.departments.<clave>` en ambos idiomas.
 */

// ---------------------------------------------------------------------
// Vocabulario
// ---------------------------------------------------------------------

/**
 * Cargo **permanente** de una persona en la iglesia, independiente del
 * departamento. Es un atributo suyo y viaja con ella a todas partes.
 * Cada valor necesita su clave en `leadership.titles.*`.
 */
export type PersonTitle =
  | 'pastor'
  | 'assistant_pastor'
  | 'elder'
  | 'deacon'
  | 'secretary'
  | 'treasurer'
  | 'censor'
  | 'lawyer';

/**
 * Función **dentro de un departamento concreto**. La misma persona puede
 * ser responsable en uno y colaboradora en otro.
 * Cada valor necesita su clave en `leadership.roles.*`.
 */
export type ServiceRole = 'lead' | 'assistant' | 'conductor' | 'delegate';

/** Persona del organigrama. `titles` son sus cargos permanentes. */
export interface Person {
  readonly id: string;
  /** Nombre propio — nunca se traduce. */
  readonly name: string;
  readonly titles?: readonly PersonTitle[];
}

// ---------------------------------------------------------------------
// Registro de personas — ÚNICA fuente de nombres
// ---------------------------------------------------------------------
// Criterio de nomenclatura: siempre «nombre + apellido», aunque el
// organigrama en papel alterne el orden. La consistencia es lo que hace
// que una lista de 30 nombres se lea de un vistazo.
const PEOPLE = [
  { id: 'pavel-negrusier', name: 'Pavel Negrușier', titles: ['pastor'] },
  { id: 'samuel-bogdan', name: 'Samuel Bogdan', titles: ['secretary', 'deacon'] },
  { id: 'pavel-santa', name: 'Pavel Șanta', titles: ['treasurer'] },
  { id: 'ioan-andor', name: 'Ioan Andor', titles: ['elder'] },
  { id: 'petrica-halas', name: 'Petrică Halas', titles: ['elder'] },
  { id: 'grigore-tomoiaga', name: 'Grigore Tomoiagă', titles: ['assistant_pastor'] },
  { id: 'ionel-sidor', name: 'Ionel Sidor', titles: ['elder'] },
  { id: 'gabriel-cifor', name: 'Gabriel Cifor', titles: ['censor'] },
  { id: 'vali-roman', name: 'Vali Roman', titles: ['censor'] },
  { id: 'ramona-fluerariu', name: 'Ramona Fluerariu', titles: ['lawyer'] },
  { id: 'sebastian-birle', name: 'Sebastian Bîrle' },
  { id: 'iosif-negru', name: 'Iosif Negru' },
  { id: 'otniel-birle', name: 'Otniel Bîrle' },
  { id: 'ilie-petrescu', name: 'Ilie Petrescu' },
  { id: 'ioan-lauran', name: 'Ioan Lauran' },
  { id: 'daniel-motrescu', name: 'Daniel Motrescu' },
  { id: 'adriana-gherasim', name: 'Adriana Gherasim' },
  { id: 'beni-galambicza', name: 'Beni Galambicza' },
  { id: 'kevin-mitoseriu', name: 'Kevin Mitoșeriu' },
  { id: 'luigi-halas', name: 'Luigi Halas' },
  { id: 'alin-negrusier', name: 'Alin Negrușier' },
  { id: 'emanuel-marcu', name: 'Emanuel Marcu' },
  { id: 'daniel-dulca', name: 'Daniel Dulcă' },
  { id: 'beni-cioarba', name: 'Beni Cioarbă' },
  { id: 'andrei-stanus', name: 'Andrei Stănuș' },
  { id: 'mihai-zagrean', name: 'Mihai Zăgrean' },
  { id: 'ioan-strugaru', name: 'Ioan Strugaru' },
  { id: 'vasile-valean', name: 'Vasile Vălean' },
  { id: 'silviu-dobre', name: 'Silviu Dobre' },
  { id: 'aurel-burdet', name: 'Aurel Burdeț' },
  { id: 'ionut-mitoseriu', name: 'Ionuț Mitoșeriu' },
  { id: 'dorel-bindea', name: 'Dorel Bindea' },
  { id: 'maria-copran', name: 'Maria Copran' },
] as const satisfies readonly Person[];

/** Unión derivada del registro: referenciar a alguien inexistente no compila. */
export type PersonId = (typeof PEOPLE)[number]['id'];

// ---------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------

/**
 * Una persona sirviendo en un departamento.
 * `roles` es una lista porque alguien puede acumular funciones en el mismo
 * sitio — el responsable del coro es además uno de sus directores — y
 * repetir su nombre en la tarjeta parecería un error de datos.
 */
export interface Assignment {
  readonly person: PersonId;
  readonly roles?: readonly ServiceRole[];
}

/** Departamento. `i18nKey` apunta a `leadership.departments.*`. */
export interface Department {
  readonly id: string;
  readonly i18nKey: string;
  /**
   * Cargo permanente que el propio rótulo del departamento ya anuncia.
   * Sólo lo usan los cargos de gobierno: sirve para no pintar la etiqueta
   * «Cenzor» debajo de un nombre en la tarjeta titulada «Cenzori».
   */
  readonly impliedTitle?: PersonTitle;
  readonly members: readonly Assignment[];
}

/**
 * Área de servicio: agrupa departamentos afines.
 *
 * Veintisiete departamentos en una sola lista son un muro. Agrupados en
 * siete áreas, la página se recorre por bloques y cada uno responde a una
 * pregunta distinta («¿quién cuida?», «¿quién enseña a mis hijos?»…).
 * `i18nKey` apunta a `leadership.areas.*` (name + description).
 */
export interface ServiceArea {
  readonly id: string;
  readonly i18nKey: string;
  readonly icon: IconName;
  readonly departments: readonly Department[];
}

/**
 * Cargos de gobierno. Se pintan aparte, arriba del todo: son las puertas a
 * las que llama alguien de fuera.
 *
 * El orden es jerárquico y deliberado: primero el liderazgo espiritual
 * (pastor, pastor asistente, presbiterio, diaconado) y después los cargos
 * administrativos (secretario, tesorero, censores). No se reordena
 * alfabéticamente ni por número de miembros.
 *
 * Cada entrada declara su `impliedTitle` para que el rótulo de la tarjeta
 * no se repita como etiqueta debajo de cada nombre. Ojo al efecto útil que
 * eso tiene con quien acumula cargos: Samuel Bogdan sale en «Secretario»
 * etiquetado como diácono y en «Diáconos» etiquetado como secretario.
 */
export const LEADERSHIP_OFFICES: readonly Department[] = [
  {
    id: 'pastor',
    i18nKey: 'pastor',
    impliedTitle: 'pastor',
    members: [{ person: 'pavel-negrusier' }],
  },
  {
    id: 'assistant-pastor',
    i18nKey: 'assistant_pastor',
    impliedTitle: 'assistant_pastor',
    members: [{ person: 'grigore-tomoiaga' }],
  },
  {
    id: 'elders',
    i18nKey: 'elders',
    impliedTitle: 'elder',
    members: [
      { person: 'ioan-andor' },
      { person: 'petrica-halas' },
      { person: 'ionel-sidor' },
    ],
  },
  {
    id: 'deacons',
    i18nKey: 'deacons',
    impliedTitle: 'deacon',
    members: [{ person: 'samuel-bogdan' }],
  },
  {
    id: 'secretary',
    i18nKey: 'secretary',
    impliedTitle: 'secretary',
    members: [{ person: 'samuel-bogdan' }],
  },
  {
    id: 'treasurer',
    i18nKey: 'treasurer',
    impliedTitle: 'treasurer',
    members: [{ person: 'pavel-santa' }],
  },
  {
    id: 'censors',
    i18nKey: 'censors',
    impliedTitle: 'censor',
    members: [{ person: 'gabriel-cifor' }, { person: 'vali-roman' }],
  },
];

/**
 * Comitetul Bisericii — el comité de la iglesia.
 *
 * Es una **nómina**, no una estructura: el documento oficial lista a los
 * nueve miembros sin asignarles función dentro del comité, así que aquí
 * tampoco se inventa ninguna. El cargo que se ve bajo cada nombre en la
 * web es su `title` permanente, que ya vive en `PEOPLE`.
 *
 * Sólo guarda `PersonId`, como todo lo demás en este fichero: el comité y
 * el organigrama no se pueden desincronizar porque el nombre está escrito
 * en un único sitio. Referenciar a alguien que no existe no compila.
 *
 * El orden es el del documento; no se reordena alfabéticamente.
 */
export const CHURCH_COMMITTEE: readonly PersonId[] = [
  'pavel-negrusier',
  'grigore-tomoiaga',
  'petrica-halas',
  'ionel-sidor',
  'samuel-bogdan',
  'ilie-petrescu',
  'pavel-santa',
  'sebastian-birle',
  'iosif-negru',
];

/** Departamentos agrupados por área. El orden es el de lectura de la web. */
export const SERVICE_AREAS: readonly ServiceArea[] = [
  {
    id: 'pastoral',
    i18nKey: 'pastoral',
    icon: 'church',
    departments: [
      {
        id: 'restoration',
        i18nKey: 'restoration',
        members: [
          { person: 'pavel-negrusier' },
          { person: 'ioan-andor' },
          { person: 'petrica-halas' },
          { person: 'ionel-sidor' },
        ],
      },
      {
        id: 'recovery',
        i18nKey: 'recovery',
        members: [{ person: 'sebastian-birle' }, { person: 'iosif-negru' }],
      },
      {
        id: 'intercession',
        i18nKey: 'intercession',
        members: [{ person: 'ionel-sidor' }, { person: 'otniel-birle' }],
      },
      {
        id: 'teaching',
        i18nKey: 'teaching',
        members: [{ person: 'ilie-petrescu' }, { person: 'ioan-lauran' }],
      },
      {
        id: 'spiritual_gifts',
        i18nKey: 'spiritual_gifts',
        members: [{ person: 'ioan-andor' }],
      },
    ],
  },
  {
    id: 'generations',
    i18nKey: 'generations',
    icon: 'sparkles',
    departments: [
      {
        id: 'youth',
        i18nKey: 'youth',
        members: [
          { person: 'samuel-bogdan', roles: ['lead'] },
          { person: 'gabriel-cifor' },
        ],
      },
      {
        id: 'teens',
        i18nKey: 'teens',
        members: [{ person: 'daniel-motrescu' }, { person: 'adriana-gherasim' }],
      },
      { id: 'children', i18nKey: 'children', members: [{ person: 'petrica-halas' }] },
    ],
  },
  {
    id: 'worship',
    i18nKey: 'worship',
    icon: 'music',
    departments: [
      {
        id: 'worship_groups',
        i18nKey: 'worship_groups',
        members: [{ person: 'beni-galambicza' }],
      },
      {
        id: 'choir',
        i18nKey: 'choir',
        members: [
          { person: 'sebastian-birle', roles: ['lead', 'conductor'] },
          { person: 'kevin-mitoseriu', roles: ['conductor'] },
          { person: 'luigi-halas', roles: ['conductor'] },
        ],
      },
      {
        id: 'brass_band',
        i18nKey: 'brass_band',
        members: [
          { person: 'samuel-bogdan' },
          { person: 'gabriel-cifor' },
          { person: 'alin-negrusier' },
          { person: 'emanuel-marcu' },
        ],
      },
    ],
  },
  {
    id: 'media',
    i18nKey: 'media',
    icon: 'image',
    departments: [
      {
        id: 'sound',
        i18nKey: 'sound',
        members: [{ person: 'daniel-motrescu' }, { person: 'daniel-dulca' }],
      },
      {
        id: 'projection',
        i18nKey: 'projection',
        members: [{ person: 'beni-cioarba' }, { person: 'andrei-stanus' }],
      },
      {
        id: 'live_stream',
        i18nKey: 'live_stream',
        members: [{ person: 'mihai-zagrean' }, { person: 'ioan-strugaru' }],
      },
    ],
  },
  {
    id: 'relations',
    i18nKey: 'relations',
    icon: 'share',
    departments: [
      {
        id: 'other_churches',
        i18nKey: 'other_churches',
        members: [{ person: 'pavel-negrusier' }, { person: 'grigore-tomoiaga' }],
      },
      {
        id: 'san_martin',
        i18nKey: 'san_martin',
        members: [{ person: 'grigore-tomoiaga', roles: ['delegate'] }],
      },
      {
        id: 'authorities',
        i18nKey: 'authorities',
        members: [{ person: 'ramona-fluerariu' }],
      },
    ],
  },
  {
    id: 'hospitality',
    i18nKey: 'hospitality',
    icon: 'users',
    departments: [
      { id: 'welcome', i18nKey: 'welcome', members: [{ person: 'ioan-lauran', roles: ['lead'] }] },
      { id: 'guests', i18nKey: 'guests', members: [{ person: 'ionut-mitoseriu', roles: ['lead'] }] },
      { id: 'travel', i18nKey: 'travel', members: [{ person: 'dorel-bindea', roles: ['lead'] }] },
    ],
  },
  {
    id: 'facilities',
    i18nKey: 'facilities',
    icon: 'home',
    departments: [
      {
        id: 'administration',
        i18nKey: 'administration',
        members: [
          { person: 'vasile-valean' },
          { person: 'silviu-dobre' },
          { person: 'aurel-burdet' },
        ],
      },
      { id: 'design', i18nKey: 'design', members: [{ person: 'silviu-dobre' }] },
      { id: 'cleaning', i18nKey: 'cleaning', members: [{ person: 'maria-copran' }] },
    ],
  },
];

// ---------------------------------------------------------------------
// Índice derivado — «¿qué hace esta persona en la iglesia?»
// ---------------------------------------------------------------------

/** Un puesto concreto de una persona, ya resuelto para pintarlo. */
export interface PersonPosting {
  /** Clave i18n del departamento (`leadership.departments.*`). */
  readonly departmentKey: string;
  /** Clave i18n del área, o `null` si es un cargo de gobierno. */
  readonly areaKey: string | null;
  readonly roles?: readonly ServiceRole[];
}

/** Persona con todos sus puestos ya reunidos. */
export interface PersonProfile extends Person {
  readonly postings: readonly PersonPosting[];
}

/**
 * Se construye una sola vez al cargar el módulo recorriendo la estructura.
 * Es O(n) sobre datos que caben en una pantalla, así que no merece ni
 * memoización ni un servicio: es una constante más.
 */
export const PEOPLE_INDEX: ReadonlyMap<PersonId, PersonProfile> = (() => {
  const index = new Map<PersonId, { -readonly [K in keyof PersonProfile]: PersonProfile[K] }>();

  for (const person of PEOPLE) {
    index.set(person.id, { ...person, postings: [] });
  }

  const collect = (departments: readonly Department[], areaKey: string | null): void => {
    for (const department of departments) {
      for (const { person, roles } of department.members) {
        const profile = index.get(person);
        if (!profile) continue;
        profile.postings = [
          ...profile.postings,
          { departmentKey: department.i18nKey, areaKey, roles },
        ];
      }
    }
  };

  collect(LEADERSHIP_OFFICES, null);
  for (const area of SERVICE_AREAS) collect(area.departments, area.i18nKey);

  return index;
})();

