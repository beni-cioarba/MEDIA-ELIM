import type { DepartmentId } from './navigation/app-paths';
import type { PersonId } from './leadership.config';
import type { IconName } from './ui/icon-name';

/**
 * INVITAȚI — la página de bienvenida para quien nos visita (`/invitati`)
 * =====================================================================
 *
 * Página **oculta** (sin menú, `noindex`): se llega por QR o tecleando la
 * dirección. Aquí sólo está la estructura; los textos viven en el paquete
 * `assets/i18n/guests.{ro,es}.json` y los datos de la iglesia (horario,
 * dirección, contacto, personas) salen de donde ya se publican. Nada se
 * inventa: una pregunta frecuente sin respuesta confirmada no se publica
 * (lista de pendientes en `docs/ai/33-guests.md`).
 */

/** Quien recibe al invitado: persona del organigrama + rótulo de su papel. */
export interface GuestHost {
  readonly person: PersonId;
  /** Clave i18n del rótulo (cargo o departamento), en el diccionario principal. */
  readonly roleKey: string;
}

/**
 * «Cine te primește»: los pastores y los responsables de primire. El nombre y
 * la foto salen del organigrama y del manifiesto de fotos: cambiar a alguien
 * de cargo allí lo cambia aquí.
 */
export const GUEST_HOSTS: readonly GuestHost[] = [
  { person: 'pavel-negrusier', roleKey: 'leadership.titles.pastor' },
  { person: 'grigore-tomoiaga', roleKey: 'leadership.titles.assistant_pastor' },
  { person: 'ioan-lauran', roleKey: 'leadership.departments.welcome' },
  // Ionuț Mitoșeriu (departamento «guests») NO va aquí: se ocupa de los
  // invitados especiales (predicadores, delegaciones), no de quien llega
  // por primera vez a la iglesia.
];

/**
 * «Pentru fiecare vârstă»: los departamentos con página propia, en el orden
 * en que le interesan a quien llega (jóvenes, música, misión).
 */
export const GUEST_DEPARTMENTS: readonly DepartmentId[] = [
  'youth',
  'choir',
  'brass',
  'evangelism',
  'missions',
  'relief',
];

/**
 * Preguntas frecuentes: `guests.faq.<id>.{q,a}`. Sólo las que tienen una
 * respuesta ya publicada en la web. Una nueva = un id aquí + su texto.
 */
export const GUEST_FAQ = [
  'language',
  'children',
  'communion',
  'online',
  'beliefs',
  'baptism',
  'talk',
] as const;

export type GuestFaqId = (typeof GUEST_FAQ)[number];

/** Secciones con ancla, en el orden de la página (índice de chips). */
export interface GuestSection {
  readonly id: string;
  readonly icon: IconName;
}

export const GUEST_SECTIONS: readonly GuestSection[] = [
  { id: 'expect', icon: 'church' },
  { id: 'program', icon: 'calendar' },
  { id: 'about', icon: 'heart' },
  { id: 'people', icon: 'users' },
  { id: 'ages', icon: 'sparkles' },
  { id: 'directions', icon: 'map-pin' },
  { id: 'faq', icon: 'info' },
];

/** Pasos de «Ce te așteaptă»: los mismos textos que «Despre noi» (`about.visit.items.*`). */
export const GUEST_STEPS: readonly { readonly id: string; readonly icon: IconName }[] = [
  { id: 'welcome', icon: 'hand-heart' },
  { id: 'worship', icon: 'music' },
  { id: 'word', icon: 'book' },
  { id: 'family', icon: 'family' },
];

/** Cuántos eventos próximos se enseñan (el resto, en su página). */
export const GUEST_EVENTS_MAX = 3;
