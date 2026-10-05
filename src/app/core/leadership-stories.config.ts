import { PersonId, PersonProfile, PersonTier, personTier } from './leadership.config';

/**
 * PERFILES DEL ORGANIGRAMA — biografía y explicaciones de cada persona
 * ====================================================================
 *
 * El organigrama (`leadership.config.ts`) dice **qué hace** cada persona; este
 * fichero dice **quién es**: lo que se lee en su página propia
 * (`/conducere/<id>`) y el resumen de su tarjeta.
 *
 * Es contenido personal y va tal cual lo entregue cada uno (como los avisos:
 * no se traduce). Se rellena persona a persona: quien no tiene entrada en
 * `PERSON_STORIES` muestra el texto de maqueta de su nivel, así ninguna página
 * se queda vacía mientras llegan los textos reales.
 *
 * ── Cómo añadir el perfil real de alguien ─────────────────────────────
 *   PERSON_STORIES['pavel-negrusier'] = {
 *     summary: 'Una o dos frases: lo que se lee en la tarjeta.',
 *     bio: ['Primer párrafo…', 'Segundo párrafo…'],
 *     sections: [{ title: 'Viziunea', body: '…' }],
 *     verse: { text: '…', ref: 'Ioan 10:11' },
 *     since: 2004,
 *   };
 *
 * Cuando todas las personas tengan el suyo, `PLACEHOLDER_STORIES` pasa a
 * `false` y desaparecen los textos de maqueta.
 */

/** Bloque de explicación con título («Viziunea», «Cum slujește»…). */
export interface StorySection {
  readonly title: string;
  readonly body: string;
}

/** Perfil narrativo de una persona. Todo salvo `summary` y `bio` es opcional. */
export interface PersonStory {
  /** Una o dos frases: tarjeta destacada y entradilla del perfil. */
  readonly summary: string;
  /** Biografía, un párrafo por elemento. */
  readonly bio: readonly string[];
  /** Explicaciones de su slujire, cada una con su título. */
  readonly sections?: readonly StorySection[];
  /** Versículo que la persona elige para su perfil. */
  readonly verse?: { readonly text: string; readonly ref: string };
  /** Año desde el que sirve en la iglesia. */
  readonly since?: number;
}

/** Perfiles reales. Vacío hasta que lleguen los textos. */
export const PERSON_STORIES: Partial<Record<PersonId, PersonStory>> = {};

/** Mientras falten perfiles reales, se pinta el texto de maqueta. */
export const PLACEHOLDER_STORIES = true;

// ---------------------------------------------------------------------
// Texto de maqueta (lorem ipsum), más largo cuanto más visible es el perfil
// ---------------------------------------------------------------------

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla, vestibulum id ligula porta felis euismod semper.',
  'Curabitur blandit tempus porttitor. Maecenas faucibus mollis interdum. Nullam quis risus eget urna mollis ornare vel eu leo. Cras mattis consectetur purus sit amet fermentum, aenean lacinia bibendum nulla sed consectetur.',
  'Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Sed posuere consectetur est at lobortis.',
] as const;

const SECTIONS: readonly StorySection[] = [
  {
    title: 'Lorem ipsum',
    body: 'Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.',
  },
  {
    title: 'Dolor sit amet',
    body: 'Etiam porta sem malesuada magna mollis euismod. Aenean eu leo quam, pellentesque ornare sem lacinia quam venenatis vestibulum.',
  },
  {
    title: 'Consectetur',
    body: 'Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
  },
  {
    title: 'Adipiscing elit',
    body: 'Nulla vitae elit libero, a pharetra augue. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
  },
];

const PLACEHOLDER: Record<PersonTier, PersonStory> = {
  pastor: {
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, posuere velit aliquet.',
    bio: LOREM,
    sections: SECTIONS,
    verse: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.', ref: 'Lorem 1:1' },
    since: 2000,
  },
  assistant: {
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus.',
    bio: LOREM.slice(0, 2),
    sections: SECTIONS.slice(0, 3),
    verse: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', ref: 'Lorem 2:4' },
    since: 2005,
  },
  leader: {
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    bio: LOREM.slice(0, 2),
    sections: SECTIONS.slice(0, 2),
    since: 2010,
  },
  member: {
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    bio: LOREM.slice(0, 1),
    sections: SECTIONS.slice(0, 2),
  },
};

/** Perfil de una persona: el real si lo hay; si no, el de maqueta de su nivel. */
export function storyOf(person: PersonProfile): PersonStory | null {
  return PERSON_STORIES[person.id as PersonId] ?? (PLACEHOLDER_STORIES ? PLACEHOLDER[personTier(person)] : null);
}
