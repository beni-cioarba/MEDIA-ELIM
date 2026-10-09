import { DEPARTMENT_SLUGS, DepartmentId } from './navigation/app-paths';
import { IconName } from './ui/icon-name';

/**
 * DEPARTAMENTE
 * ============
 *
 * Una entrada por departamento. **Todo lo que la web enseña de un
 * departamento sale de aquí** (estructura) y de `departments.<id>.*` en
 * es/ro.json (textos): la portada `/departamente`, su página
 * `/departamente/<slug>`, el panel de la cabecera, el cajón y la barra de
 * accesos rápidos.
 *
 * ── Cómo crece ────────────────────────────────────────────────────────
 *  · Departamento nuevo → slug en `DEPARTMENT_SLUGS` (app-paths), entrada
 *    aquí, hijo en `MAIN_NAV` y sus textos. Ni componente ni ruta nuevos.
 *  · Contenido nuevo dentro de uno → otra clave en `pillars` / `activities`
 *    (más su texto) o un módulo más en `modules`.
 *  · Una pieza que hoy no existe (galería propia, documentos, inscripción…)
 *    → un `kind` nuevo en `DepartmentModule` y su `case` en la página. Así
 *    las páginas no se bifurcan: todas son la misma plantilla con distintos
 *    datos.
 *
 * Responsables: **no se escriben aquí**. `leadership` apunta al
 * departamento del organigrama (`leadership.config.ts`) y los nombres se
 * derivan de allí; cambiar quién lleva el coro es un cambio en un sitio.
 *
 * Textos de 09/10/2026: provisionales, redactados para que la sección se vea
 * completa. TODO(iglesia): que cada departamento revise los suyos.
 */

/** Foto de portada (los `.webp` ya optimizados de `assets/drive-media/`). */
export interface DepartmentCover {
  readonly image: string;
  readonly medium: string;
  readonly thumb: string;
  /** Dónde está lo importante de la foto al recortarla. */
  readonly focus?: 'top' | 'center' | 'bottom';
}

/** Actividad con icono; su texto vive en `departments.<id>.activities.<key>`. */
export interface DepartmentActivity {
  readonly key: string;
  readonly icon: IconName;
}

/**
 * Bloque de contenido propio de un departamento. Unión discriminada: cada
 * `kind` es una pieza que la página sabe pintar.
 *  - `youth-meal` → la app de programación de la masa de tineret
 *    (ADM-TINERET): qué es, para quién, próximos turnos y accesos.
 *  - `events`     → sus eventos futuros (`upcomingEvents` con
 *    `departments` que lo incluyan). Sin eventos, no se pinta.
 */
export type DepartmentModule = { readonly kind: 'youth-meal' } | { readonly kind: 'events' };

export interface DepartmentConfig {
  readonly id: DepartmentId;
  readonly slug: string;
  readonly icon: IconName;
  /** Sin foto, la portada es navy con el icono en grande: no hace falta inventarla. */
  readonly cover?: DepartmentCover;
  /** Id del departamento en `SERVICE_AREAS` (organigrama), si lo tiene. */
  readonly leadership?: string;
  /** Culto del programa semanal en el que se reúne (`weeklyProgram[].id`). */
  readonly weeklyProgramId?: string;
  /** Pilares (3–4): `departments.<id>.pillars.<key>.{title,text}`. */
  readonly pillars: readonly string[];
  /** Qué hace: `departments.<id>.activities.<key>.{title,text}`. */
  readonly activities: readonly DepartmentActivity[];
  readonly modules: readonly DepartmentModule[];
  /** Ocupa la celda grande del mosaico de la portada. Uno como mucho. */
  readonly featured?: boolean;
}

const cover = (name: string, focus?: DepartmentCover['focus']): DepartmentCover => ({
  image: `assets/drive-media/${name}.webp`,
  medium: `assets/drive-media/${name}-960.webp`,
  thumb: `assets/drive-media/${name}-thumb.webp`,
  focus,
});

/** El orden es el del menú y el del mosaico. */
export const DEPARTMENTS: readonly DepartmentConfig[] = [
  {
    id: 'youth',
    slug: DEPARTMENT_SLUGS.youth,
    icon: 'flame',
    // La misma foto que la segunda diapositiva de la portada.
    cover: cover('inchinare_tineret_2026', 'center'),
    leadership: 'youth',
    weeklyProgramId: 'vineri',
    pillars: ['worship', 'word', 'fellowship', 'service'],
    activities: [
      { key: 'friday', icon: 'calendar' },
      { key: 'meal', icon: 'utensils' },
      { key: 'worship', icon: 'music' },
      { key: 'conferences', icon: 'megaphone' },
    ],
    modules: [{ kind: 'youth-meal' }, { kind: 'events' }],
    featured: true,
  },
  {
    id: 'brass',
    slug: DEPARTMENT_SLUGS.brass,
    icon: 'music',
    cover: cover('fanfara_2026'),
    leadership: 'brass_band',
    pillars: ['preparation', 'harmony', 'generations'],
    activities: [
      { key: 'services', icon: 'church' },
      { key: 'rehearsals', icon: 'clock' },
      { key: 'special', icon: 'sparkles' },
      { key: 'learners', icon: 'users' },
    ],
    modules: [{ kind: 'events' }],
  },
  {
    id: 'choir',
    slug: DEPARTMENT_SLUGS.choir,
    icon: 'mic-vocal',
    cover: cover('cor_2026'),
    leadership: 'choir',
    pillars: ['worship', 'message', 'unity'],
    activities: [
      { key: 'services', icon: 'church' },
      { key: 'rehearsals', icon: 'clock' },
      { key: 'concerts', icon: 'sparkles' },
      { key: 'voices', icon: 'users' },
    ],
    modules: [{ kind: 'events' }],
  },
  {
    id: 'missions',
    slug: DEPARTMENT_SLUGS.missions,
    icon: 'globe',
    pillars: ['prayer', 'support', 'sending'],
    activities: [
      { key: 'prayer', icon: 'pray' },
      { key: 'partners', icon: 'network' },
      { key: 'trips', icon: 'map-pin' },
      { key: 'news', icon: 'mail' },
    ],
    modules: [{ kind: 'events' }],
  },
  {
    id: 'relief',
    slug: DEPARTMENT_SLUGS.relief,
    icon: 'hand-heart',
    // «Zâmbetul din Cutie»: la campaña de cajas de regalo.
    cover: cover('zambetul_cutie_2025'),
    pillars: ['compassion', 'discretion', 'stewardship'],
    activities: [
      { key: 'families', icon: 'family' },
      { key: 'campaigns', icon: 'gift' },
      { key: 'collections', icon: 'heart' },
      { key: 'visits', icon: 'home' },
    ],
    modules: [{ kind: 'events' }],
  },
  {
    id: 'evangelism',
    slug: DEPARTMENT_SLUGS.evangelism,
    icon: 'sprout',
    // Concierto de villancicos abierto a la ciudad: evangelización en acto.
    cover: cover('concert_colinde_2025'),
    pillars: ['message', 'love', 'discipleship'],
    activities: [
      { key: 'evenings', icon: 'megaphone' },
      { key: 'concerts', icon: 'music' },
      { key: 'materials', icon: 'file-text' },
      { key: 'invitations', icon: 'send' },
    ],
    modules: [{ kind: 'events' }],
  },
];

const BY_ID = new Map(DEPARTMENTS.map((d) => [d.id, d]));
const BY_SLUG = new Map(DEPARTMENTS.map((d) => [d.slug, d]));

export function departmentById(id: string | null | undefined): DepartmentConfig | null {
  return (id && BY_ID.get(id as DepartmentId)) || null;
}

export function departmentBySlug(slug: string | null | undefined): DepartmentConfig | null {
  return (slug && BY_SLUG.get(slug)) || null;
}

// ---------------------------------------------------------------------
// App de la masa de tineret (ADM-TINERET)
// ---------------------------------------------------------------------

/**
 * La app hermana del Departament de Tineret: quién prepara la masa cada
 * vineri y qué părinți ayudan. Repo `INEB_ELIM_Administrativ/elim-admin`.
 *
 * La web **no copia sus datos**: lee el calendario público que la app
 * publica en cada despliegue (`toate.ics`, mismo dominio de GitHub Pages y
 * `Access-Control-Allow-Origin: *`) y enseña sólo fecha, equipo y horas.
 * Los nombres de tineri y părinți se quedan en la app.
 */
export const YOUTH_MEAL_APP = {
  url: 'https://beni-cioarba.github.io/ADM-TINERET/',
  feed: 'https://beni-cioarba.github.io/ADM-TINERET/assets/calendars/toate.ics',
  /** Pestañas de la app (rutas relativas a `url`), por público. */
  sections: {
    schedule: '',
    teams: 'echipe',
    youths: 'tineri',
    parents: 'parinti',
    rules: 'reguli',
  },
  /** Cuántos turnos se enseñan en la web (el resto, en la app). */
  turnsShown: 4,
} as const;

export type YouthMealSection = keyof typeof YOUTH_MEAL_APP.sections;

/** URL absoluta de una pestaña de la app. */
export function youthMealUrl(section: YouthMealSection): string {
  return YOUTH_MEAL_APP.url + YOUTH_MEAL_APP.sections[section];
}

/** El feed como suscripción (`webcal:`): el calendario del teléfono lo sigue solo. */
export function youthMealWebcal(): string {
  return YOUTH_MEAL_APP.feed.replace(/^https:/, 'webcal:');
}
