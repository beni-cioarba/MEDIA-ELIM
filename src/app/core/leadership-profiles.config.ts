import { PersonId } from './leadership.config';

/**
 * PERFILES DEL ORGANIGRAMA — quién tiene página propia y qué cuenta en ella
 * =========================================================================
 *
 * El organigrama (`leadership.config.ts`) dice **qué hace** cada persona y
 * sale entero en `/conducere`. La página propia (`/conducere/<id>`) es
 * **opcional**: sólo la tiene quien la quiere. Este fichero es el único
 * control:
 *
 *  · **Clave presente** → la persona tiene perfil. Su tarjeta enlaza a él
 *    (con la marca «Vezi profilul») y entra en anterior / siguiente.
 *  · **Clave ausente**  → sin página: su tarjeta se pinta igual (foto, nombre,
 *    cargos) pero no enlaza, y `/conducere/<id>` lleva al directorio
 *    filtrado por su nombre.
 *
 * El valor es su relato, y vale de dos formas:
 *
 *  · `null` → perfil **sin biografía** (todavía no la ha entregado). La
 *    página se arma con lo que ya se sabe: cargos, dónde sirve y con quién.
 *  · `PersonStory` → perfil **con biografía**. Todos los campos son
 *    opcionales: se pinta lo que haya, sin huecos.
 *
 * Es contenido personal y va tal cual lo entregue cada uno (como los avisos:
 * no se traduce). Nunca texto de relleno: una página sin biografía es
 * válida; una con lorem ipsum, no.
 *
 * ── Dar perfil a alguien ──────────────────────────────────────────────
 *   'samuel-bogdan': null,
 *
 * ── Ponerle la biografía ──────────────────────────────────────────────
 *   'pavel-negrusier': {
 *     summary: 'Una o dos frases: tarjeta destacada y entradilla.',
 *     bio: ['Primer párrafo…', 'Segundo párrafo…'],
 *     sections: [{ title: 'Viziunea', body: '…' }],
 *     verse: { text: '…', ref: 'Ioan 10:11' },
 *     since: 2004,
 *   },
 */

/** Bloque de explicación con título («Viziunea», «Cum slujește»…). */
export interface StorySection {
  readonly title: string;
  readonly body: string;
}

/** Relato de una persona. Todo es opcional: se pinta lo que haya. */
export interface PersonStory {
  /** Una o dos frases: tarjeta destacada y entradilla del perfil. */
  readonly summary?: string;
  /** Biografía, un párrafo por elemento. */
  readonly bio?: readonly string[];
  /** Explicaciones de su slujire, cada una con su título. */
  readonly sections?: readonly StorySection[];
  /** Versículo que la persona elige para su perfil. */
  readonly verse?: { readonly text: string; readonly ref: string };
  /** Año desde el que sirve en la iglesia. */
  readonly since?: number;
}

/** Quién tiene perfil propio (clave) y su relato (`null` = aún sin biografía). */
export const PERSON_PROFILES: Partial<Record<PersonId, PersonStory | null>> = {
  // MAQUETA (lorem ipsum): muestra de un perfil con biografía completa.
  // Sustituir por el texto real en cuanto lo entregue.
  'pavel-negrusier': {
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, posuere velit aliquet.',
    bio: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla, vestibulum id ligula porta felis euismod semper.',
      'Curabitur blandit tempus porttitor. Maecenas faucibus mollis interdum. Nullam quis risus eget urna mollis ornare vel eu leo. Cras mattis consectetur purus sit amet fermentum, aenean lacinia bibendum nulla sed consectetur.',
      'Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Sed posuere consectetur est at lobortis.',
    ],
    sections: [
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
    ],
    verse: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.', ref: 'Lorem 1:1' },
    since: 2000,
  },
  'grigore-tomoiaga': null,
  'gabriel-daniel-cifor': null,
};

/** ¿Tiene página propia? */
export function hasProfile(id: PersonId): boolean {
  return Object.hasOwn(PERSON_PROFILES, id);
}

/** Relato de una persona, o `null` si no tiene (o aún no lo ha entregado). */
export function storyOf(id: PersonId): PersonStory | null {
  return PERSON_PROFILES[id] ?? null;
}

/** ¿El relato trae biografía de verdad (algo que leer en el cuerpo)? */
export function hasNarrative(story: PersonStory | null): story is PersonStory {
  return !!(story?.bio?.length || story?.sections?.length || story?.verse);
}
