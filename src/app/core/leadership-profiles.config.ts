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
  // Sin biografía hasta que la entregue: la maqueta de lorem ipsum que hubo
  // aquí (07/10/2026) se retiró el 10/11/2026, a petición del usuario. La
  // página se arma con lo real (cargos, dónde sirve, con quién).
  'pavel-negrusier': null,
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
