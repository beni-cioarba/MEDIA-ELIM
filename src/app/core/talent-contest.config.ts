/**
 * «Talantul în Negoț» — concurso bíblico del Departamento de Niños del Culto
 * Cristiano Pentecostal de Rumanía (CCP), abierto a iglesias pentecostales y
 * evangélicas de Rumanía y de la diáspora.
 *
 * ── Qué hay aquí ─────────────────────────────────────────────────────────
 * **Todo el dato oficial de la edición**, auditado el 30/09/2026 en
 * talantulinnegot.com y en sus documentos públicos de Google Drive
 * (bibliografía 2027, folleto 2027, hoja de respuestas V3.0, baremos de la
 * fase internacional 2026 y de memorización 2027). Sólo lo que interesa al
 * participante: nada de la plataforma ni de la inscripción de líderes.
 *
 * ── Por qué en rumano ─────────────────────────────────────────────────────
 * El concurso se hace en rumano, con la Biblia Cornilescu (SBR Oradea 2006).
 * Libros, referencias y versículos se dejan **tal cual el material oficial**:
 * es lo que el participante tiene que estudiar y escribir de memoria. Lo que
 * se traduce (ES/RO) son los textos de la página, en `talent_contest.*`.
 *
 * ── Nueva edición ─────────────────────────────────────────────────────────
 * Se cambian este fichero (fechas de las fases, pasaje de memorización,
 * cifras y enlaces) y `talent-contest.categories.ts` (libros y versículos de
 * cada categoría; aparte porque sólo lo necesita la página, no la portada).
 * Si cambia una categoría (en 2027 «18-45» pasó a «18-35»), añade su clave
 * `talent_contest.categories.<id>` en los dos JSON de idioma.
 */

/** Las cinco fases, de la iglesia a la final. */
export type ContestPhaseId = 'church' | 'county' | 'regional' | 'national' | 'international';

export interface ContestPhase {
  readonly id: ContestPhaseId;
  /** Primer día (`YYYY-MM-DD`). */
  readonly start: string;
  /** Último día, sólo si dura más de uno (la internacional son tres). */
  readonly end?: string;
}

export interface ContestVerse {
  /** Referencia tal cual la bibliografía («1 Corinteni 13:13»). */
  readonly ref: string;
  /** Texto Cornilescu, copiado de la bibliografía oficial. */
  readonly text: string;
}

/**
 * Categorías de la edición, en orden. La lista vive aquí (ligera) para que la
 * portada y la proyección las nombren sin cargar los versículos; cada entrada
 * de `CONTEST_CATEGORIES` usa uno de estos ids (lo comprueba el compilador).
 */
export const CONTEST_CATEGORY_IDS = ['p-1', '2-3', '4-5', '6-7', '8-9', '10-11', '18-35', '35-plus'] as const;

export type ContestCategoryId = (typeof CONTEST_CATEGORY_IDS)[number];

export interface ContestCategory {
  /** Clave estable: URL (`?categoria=`) e i18n (`talent_contest.categories.<id>`). */
  readonly id: ContestCategoryId;
  /** Libros a estudiar para la prueba clásica. */
  readonly books: readonly string[];
  /** Los diez versículos a memorizar de la categoría. */
  readonly verses: readonly ContestVerse[];
}

/**
 * Partes del examen de la sección clásica. Fuente: test y baremo de la fase
 * internacional 2026 (los cinco apartados de la hoja de respuestas V3.0).
 * `items` × `points` suman 100.
 */
export interface ContestExamPart {
  readonly id: 'true_false' | 'single' | 'match' | 'multiple' | 'order';
  readonly items: number;
  readonly points: number;
}

export interface ContestResource {
  readonly id: 'bibliography' | 'brochure' | 'answer_sheet' | 'memorization_key' | 'exam_keys';
  readonly url: string;
  /** Formato que verá quien lo abra. */
  readonly kind: 'drive' | 'pdf';
}

export interface ContestVideo {
  /** Id de YouTube. */
  readonly id: string;
  /** Título publicado en el canal (rumano, tal cual). */
  readonly title: string;
}

/**
 * Persona de la iglesia que apunta a los participantes (dato local, no de la
 * web oficial). Mismas reglas que `ChurchConfig.contact`: `phone` para `tel:`,
 * `whatsapp` sólo dígitos para `wa.me/` y `phoneDisplay` tal como se dicta.
 */
export interface ContestEnroller {
  readonly name: string;
  readonly phone: string;
  readonly phoneDisplay: string;
  readonly whatsapp: string;
}

/** Apartado de la web oficial útil para el participante (sin la parte de líderes). */
export interface ContestOfficialLink {
  readonly id: 'about' | 'resources' | 'news' | 'videos' | 'contact';
  readonly url: string;
}

export interface TalentContestConfig {
  readonly edition: number;
  /** Web oficial del concurso. */
  readonly website: string;
  readonly email: string;
  /** Versión bíblica del concurso. */
  readonly bibleVersion: string;
  /** Parábola de la que toma el nombre. */
  readonly parable: string;
  /** Pasaje de la sección «Memorarea Scripturii» (común a todas las categorías). */
  readonly memorization: string;
  /** Fecha antes de la cual hay que haber cumplido 35 años para «35+». */
  readonly seniorCutoff: string;
  readonly phases: readonly ContestPhase[];
  readonly exam: readonly ContestExamPart[];
  /** Cifras de la edición anterior, tal como las publica la web. */
  readonly lastEdition: { readonly year: number; readonly countries: number; readonly churches: number; readonly participants: number };
  readonly resources: readonly ContestResource[];
  readonly videos: readonly ContestVideo[];
  readonly playlist: string;
  /** Apartados de la web oficial para «saber más» (cierre de la página). */
  readonly officialLinks: readonly ContestOfficialLink[];
  /** Quién inscribe en nuestra iglesia: la página, el anuncio y la diapositiva los nombran. */
  readonly enrollers: readonly ContestEnroller[];
}

export const TALENT_CONTEST: TalentContestConfig = {
  edition: 2027,
  website: 'https://talantulinnegot.com/',
  email: 'contact@talantulinnegot.com',
  bibleVersion: 'Dumitru Cornilescu · SBR Oradea 2006',
  parable: 'Matei 25:14-30',
  memorization: 'Apocalipsa 1-5',
  seniorCutoff: '2027-01-01',

  // Folleto oficial 2027 («Faze și date»).
  phases: [
    { id: 'church', start: '2027-03-20' },
    { id: 'county', start: '2027-04-10' },
    { id: 'regional', start: '2027-05-08' },
    { id: 'national', start: '2027-06-05' },
    { id: 'international', start: '2027-08-06', end: '2027-08-08' },
  ],

  exam: [
    { id: 'true_false', items: 10, points: 2 },
    { id: 'single', items: 10, points: 4 },
    { id: 'match', items: 5, points: 2 },
    { id: 'multiple', items: 3, points: 5 },
    { id: 'order', items: 15, points: 1 },
  ],

  lastEdition: { year: 2026, countries: 17, churches: 500, participants: 13_500 },

  // Enlaces «cortos» de la web oficial: redirigen a Drive y la organización
  // promete mantenerlos durante toda la edición aunque cambie el fichero.
  resources: [
    { id: 'bibliography', url: 'https://talantulinnegot.com/fisiere/bibliografie-2027', kind: 'drive' },
    { id: 'brochure', url: 'https://talantulinnegot.com/fisiere/pliant-de-prezentare-2027', kind: 'drive' },
    { id: 'answer_sheet', url: 'https://talantulinnegot.com/fisiere/model-foaia-cu-raspunsuri', kind: 'drive' },
    { id: 'memorization_key', url: 'https://talantulinnegot.com/fisiere/barem-memorare-2027', kind: 'pdf' },
    { id: 'exam_keys', url: 'https://talantulinnegot.com/fisiere/bareme-teste-internationala', kind: 'drive' },
  ],

  videos: [
    { id: 'FcehQCKtLK8', title: 'Invitație la Implicare: Talantul în Negoț 2027' },
    { id: 'YKJUqmS0D74', title: 'Interviuri Participanți: Faza Internațională 2026' },
    { id: '34hn75q2txM', title: 'Atmosferă Incredibilă la Sibiu!' },
    { id: 'VJe2xjp9D6c', title: 'Prezentare Oficială: Faza Internațională 2026' },
  ],
  playlist: 'https://talantulinnegot.com/videoclipuri',

  // Menú de la web oficial, sin «Înscriere lider», «Foaia cu răspunsuri» ni
  // la plataforma: son herramientas del líder, no del participante.
  officialLinks: [
    { id: 'about', url: 'https://talantulinnegot.com/despre-proiect' },
    { id: 'resources', url: 'https://talantulinnegot.com/resurse' },
    { id: 'news', url: 'https://talantulinnegot.com/noutati' },
    { id: 'videos', url: 'https://talantulinnegot.com/videoclipuri' },
    { id: 'contact', url: 'https://talantulinnegot.com/contact' },
  ],

  // Las educatoras de niños llevan las inscripciones de la iglesia (facilitado
  // por la iglesia el 30/09/2026). El orden es el que dio la iglesia.
  enrollers: [
    { name: 'Simona Pintilei', phone: '+34667829438', phoneDisplay: '+34 667 82 94 38', whatsapp: '34667829438' },
    { name: 'Mari Dobre', phone: '+34677085128', phoneDisplay: '+34 677 08 51 28', whatsapp: '34677085128' },
  ],
};
