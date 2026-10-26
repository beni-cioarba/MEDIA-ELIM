/**
 * «Povestea noastră»: los datos de la historia de la iglesia.
 *
 * Fuentes (nada de aquí se inventa):
 *  · El discurso de los 25 años (18/10/2026), transcrito en
 *    `docs/fuentes/discurs-25-ani.md`: el relato, las cifras y las obras.
 *  · El archivo audiovisual analizado para el vídeo del aniversario
 *    (`C:\workspace\elim-25`: catálogo de 2.043 clips y fotos de YouTube y
 *    Drive, ordenado por épocas). Cada hito de la cronología es una
 *    grabación o una carpeta con fecha; `video` es su id de YouTube.
 *    Resumen y huecos conocidos en `docs/fuentes/cronologie-elim.md`.
 *
 * Los textos viven en `about.story.*` (i18n); aquí sólo están los ids, el
 * orden, las fechas y los números. Pensado para crecer: un hito nuevo es una
 * línea aquí y su texto en `ro.json` / `es.json`; la rejilla no cambia.
 */

/** Capítulos del relato, en orden: principio, crecimiento, hoy. */
export const STORY_CHAPTERS = ['start', 'growth', 'today'] as const;

/** Cifra de la historia. `value` ya formateado: «~450» no es un número. */
export interface StoryFact {
  readonly id: string;
  readonly value: string;
}

/**
 * Cifras de la comunidad, **con fecha**: el número de miembros cambia y una
 * cifra sin fecha acaba mintiendo. Al actualizarlas, se actualiza también
 * `STORY_FACTS_AS_OF` (se pinta debajo) y `about.story.chapters.today`.
 */
export const STORY_FACTS_AS_OF = '2026-10';

/** Las cifras, sin el año de fundación (sale de `CHURCH_CONFIG.foundedYear`). */
export const STORY_FACTS: readonly StoryFact[] = [
  { id: 'members', value: '~450' },
  { id: 'adherents', value: '270' },
];

/** Hito de una época: fecha (`AAAA`, `AAAA-MM` o `AAAA-MM-DD`) y grabación opcional. */
export interface StoryMilestone {
  readonly id: string;
  readonly date: string;
  /** Id de YouTube de la grabación que lo documenta. */
  readonly video?: string;
}

/** Época de la cronología (las mismas cinco del vídeo de los 25 años). */
export interface StoryEra {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly milestones: readonly StoryMilestone[];
}

export const STORY_ERAS: readonly StoryEra[] = [
  {
    id: 'beginnings',
    from: 2001,
    to: 2005,
    milestones: [
      { id: 'founded', date: '2001' },
      // El coro cumplió 7 años el 09/11/2008.
      { id: 'choir', date: '2001-11' },
      { id: 'youth', date: '2002-03', video: '1ez6DFE_vD0' },
      { id: 'christmas', date: '2005-12', video: 'LaA1jVMxyhI' },
    ],
  },
  {
    id: 'growth',
    from: 2006,
    to: 2010,
    milestones: [
      { id: 'conference', date: '2006-04', video: 'KVkgqahhy1U' },
      { id: 'brass', date: '2007-03', video: 'cmiQbEZtf3A' },
      { id: 'mission', date: '2007-04', video: 'clo6yyDMBx8' },
      { id: 'youth_conf', date: '2007-10', video: '0RF-GvlzoeU' },
      { id: 'choir7', date: '2008-11', video: 'TWO08Sml4MQ' },
      { id: 'assembly', date: '2010-10' },
    ],
  },
  {
    id: 'fruit',
    from: 2011,
    to: 2020,
    milestones: [
      { id: 'ten', date: '2011-02', video: 'xTlJJEECjr4' },
      { id: 'cuellar', date: '2011-10' },
      { id: 'conferences', date: '2012' },
      { id: 'mission_conf', date: '2015-12' },
    ],
  },
  {
    id: 'generation',
    from: 2021,
    to: 2024,
    milestones: [
      { id: 'baptisms', date: '2021-11', video: 'grXGFevqzm8' },
      { id: 'ordination', date: '2022-11', video: 'ZLJCnudjlc4' },
      { id: 'uganda', date: '2023', video: 'kPM1r9TX-TI' },
      { id: 'children', date: '2024-10', video: '8FQxxLakDYU' },
    ],
  },
  {
    id: 'house',
    from: 2025,
    to: 2026,
    milestones: [
      { id: 'temple', date: '2025' },
      { id: 'anchored', date: '2025-09', video: 'bFodeHrFcKs' },
      { id: 'shoebox', date: '2025-12', video: 'CmIX8SlJeMM' },
      { id: 'hope', date: '2026-03', video: 'pUlwTXBRvSI' },
      { id: 'ordination', date: '2026-07', video: 'il82Oi5ugAE' },
      { id: 'jubilee', date: '2026-10-18' },
    ],
  },
];

/** Grupo de obras («Ce a lucrat Dumnezeu»): título + lista. */
export interface StoryWorkGroup {
  readonly id: string;
  readonly items: readonly string[];
}

/** Lo que el discurso enumera de estos 25 años, agrupado por naturaleza. */
export const STORY_WORKS: readonly StoryWorkGroup[] = [
  {
    id: 'events',
    items: ['evangelism', 'national', 'music', 'family', 'youth', 'mission'],
  },
  { id: 'mission', items: ['projects', 'churches', 'wells'] },
  { id: 'help', items: ['departments', 'shoebox', 'more'] },
  { id: 'servants', items: ['ordained', 'baptisms', 'children'] },
];
