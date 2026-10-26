/**
 * «Povestea noastră»: los datos de la historia de la iglesia.
 *
 * Fuente: el discurso de los 25 años (18/10/2026), transcrito en
 * `docs/fuentes/discurs-25-ani.md`. Nada de aquí se inventa: cada capítulo,
 * cifra y obra sale de ese texto. Los textos viven en `about.story.*` (i18n);
 * aquí sólo están los ids, el orden y los números.
 *
 * Pensado para crecer: un capítulo, una cifra, un grupo de obras o una obra
 * nueva es una línea aquí y su texto en `ro.json` / `es.json`. La rejilla de
 * obras se reparte sola (`auto-fit`), así que con el doble de grupos tampoco
 * hay que tocar estilos.
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
 * `STORY_FACTS_AS_OF` (se pinta debajo).
 */
export const STORY_FACTS_AS_OF = '2026-10';

/** Las cifras, sin el año de fundación (sale de `CHURCH_CONFIG.foundedYear`). */
export const STORY_FACTS: readonly StoryFact[] = [
  { id: 'members', value: '~450' },
  { id: 'adherents', value: '270' },
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
