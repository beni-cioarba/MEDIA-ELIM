import { DEPARTMENT_SLUGS, DepartmentId } from './navigation/app-paths';
import { IconName } from './ui/icon-name';
import type { HeroSlide } from './church.config';
import { MonthlyRule } from './util/recurrence';

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

/**
 * Foto que representa al departamento en miniatura (mosaico de la portada de
 * Departamente y panel de la cabecera). La portada de su página es el
 * carrusel (`heroSlides`).
 */
export interface DepartmentCover {
  readonly image: string;
  readonly medium: string;
  readonly thumb: string;
}

/** Actividad con icono; su texto vive en `departments.<id>.activities.<key>`. */
export interface DepartmentActivity {
  readonly key: string;
  readonly icon: IconName;
}

/**
 * Reunión mensual fija del departamento (`kind: 'monthly'`). Textos en
 * `departments.<id>.monthly.<key>.*` (paquete de traducciones).
 */
export interface DepartmentMonthly {
  readonly kind: 'monthly';
  /** Sub-clave de textos y sufijo del `.ics`. */
  readonly key: string;
  readonly rule: MonthlyRule;
  /** `HH:MM`. */
  readonly time: string;
  readonly durationMin: number;
  /** Qué se ve esa noche: `departments.<id>.monthly.<key>.parts.<part>`. */
  readonly parts: readonly { readonly key: string; readonly icon: IconName }[];
}

/**
 * Encuentro semanal (`kind: 'weekly'`): el día y la hora salen del programa
 * semanal (`weeklyProgram[].id`), no se repiten aquí. Textos en
 * `departments.<id>.weekly.<key>.*`.
 */
export interface DepartmentWeekly {
  readonly kind: 'weekly';
  readonly key: string;
  readonly weeklyProgramId: string;
  readonly durationMin: number;
  readonly parts: readonly { readonly key: string; readonly icon: IconName }[];
  /**
   * Pieza propia dentro del bloque. `youth-meal`: la masa de después del
   * programa con la app ADM-TINERET (quién prepara cada vineri, accesos).
   */
  readonly companion?: 'youth-meal';
}

/** Foto de una crónica: base de los `.webp` de `assets/drive-media/` y su tamaño real. */
export interface StoryPhoto {
  /** `ancorat_2026_sala` → `<base>.webp`, `-960.webp`, `-thumb.webp`. */
  readonly base: string;
  readonly width: number;
  readonly height: number;
  /**
   * Ocupa 2 × 2 en el mosaico. Sirve para cuadrar la rejilla de 4 columnas
   * (vertical = 1 × 2, apaisada = 2 × 1): con una destacada, 4 verticales y
   * 2 apaisadas llenan 4 × 4 sin huecos.
   */
  readonly featured?: boolean;
}

/** Vídeo propio (en `assets/video/`, fuera de la caché de la PWA). */
export interface StoryVideo {
  readonly src: string;
  readonly poster: string;
  /**
   * Segundo desde el que se reproduce (recorte sin reprocesar el fichero:
   * fragmento `#t=` + el reproductor no deja volver antes). Para quitar un
   * arranque defectuoso.
   */
  readonly start?: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Crónica de algo que ya pasó (conferencia, tabără…). Textos en
 * `departments.<id>.stories.<storyId>.{title,lead,points.*,caption?}`.
 * Sin fotos, la tarjeta se queda en su versión compacta («fotos en breve»).
 */
export interface DepartmentStory {
  readonly id: string;
  readonly kind: 'conference' | 'camp' | 'concert' | 'campaign' | 'visit' | 'evangelism';
  readonly icon: IconName;
  /**
   * Fechas exactas, si se saben. Sin `start`, la crónica muestra su periodo
   * en texto (`departments.<id>.stories.<storyId>.period`, p. ej.
   * «Decembrie 2025»): mejor eso que una fecha inventada.
   */
  readonly start?: string;
  readonly end?: string;
  /** Nombre propio, no se traduce. */
  readonly place: string;
  readonly guest?: string;
  readonly points: readonly { readonly key: string; readonly icon: IconName }[];
  readonly photos: readonly StoryPhoto[];
  readonly video?: StoryVideo;
  /** Carpeta pública de Drive con todas las fotos (sólo el ID). */
  readonly driveFolderId?: string;
  /** Cita bíblica: `departments.<id>.stories.<storyId>.verse.{text,ref}`. */
  readonly verse?: boolean;
}

/**
 * Bloque de contenido propio de un departamento. Unión discriminada: cada
 * `kind` es una pieza que la página sabe pintar.
 *  - `weekly`     → su encuentro semanal (próxima fecha, qué pasa, `.ics`) y,
 *    si lo tiene, su pieza propia (la masa de tineret con ADM-TINERET).
 *  - `monthly`    → su reunión mensual (próxima fecha, siguientes, `.ics`).
 *  - `stories`    → crónicas de lo que ya pasó, con fotos y vídeo.
 *  - `events`     → sus eventos futuros (`upcomingEvents` con
 *    `departments` que lo incluyan). Sin eventos, no se pinta.
 */
export type DepartmentModule =
  | DepartmentWeekly
  | DepartmentMonthly
  | { readonly kind: 'stories'; readonly stories: readonly DepartmentStory[] }
  | { readonly kind: 'events' };

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
  /**
   * Portada como la de inicio: carrusel a pantalla completa
   * (`app-hero-carousel`). Rótulos en `departments.<id>.hero.slides.<i18nKey>`.
   * Vacío o ausente: la misma portada a pantalla completa en navy con el
   * icono del departamento (Misiune externă, sin fotos todavía). Mejor apaisadas; una vertical entra
   * si su `focus` deja en el marco (≈ 2,2 : 1 en escritorio) a la gente.
   */
  readonly heroSlides?: readonly HeroSlide[];
}

/**
 * Crónicas de Tineret. Fotos: carpeta «ANCORAT › POZE CONFERINTA - NAOMI»
 * de «ELIM - MEDIA POZE» (planos de sala, ponentes, oración y alabanza: sin
 * primeros planos de menores) + IMG_3026 / 3050 / 3091, que facilitó el
 * usuario (cântare, predică, interviu). Vídeo: «VIDEO FINAL - INTRARE».
 * La tabără aún no tiene fotos en Drive (sus dos carpetas, vacías al
 * 09/10/2026): cuando las haya, `photos` + optimizar con
 * `scripts/optimize-images.js`.
 */
const YOUTH_STORIES: readonly DepartmentStory[] = [
  {
    id: 'ancorat_2026',
    kind: 'conference',
    icon: 'megaphone',
    // Sólo el sábado 26 (la evanghelizare del domingo 27 es un punto aparte).
    start: '2026-09-26',
    place: 'Biserica Elim, Arganda del Rey',
    guest: 'Daniel Popa (Timișoara)',
    points: [
      { key: 'message', icon: 'book' },
      { key: 'qa', icon: 'users' },
      { key: 'wall', icon: 'heart' },
      { key: 'sunday', icon: 'church' },
    ],
    // Orden pensado para la rejilla (4 × 4, sin huecos): destacada,
    // vertical, vertical, apaisada, vertical, vertical, apaisada.
    photos: [
      { base: 'ancorat_2026_sala', width: 1600, height: 1067, featured: true },
      { base: 'ancorat_2026_predica', width: 1080, height: 1620 },
      { base: 'ancorat_2026_interviu', width: 1080, height: 1620 },
      { base: 'ancorat_2026_ecran', width: 1600, height: 1067 },
      { base: 'ancorat_2026_rugaciune', width: 1080, height: 1620 },
      { base: 'ancorat_2026_lauda', width: 1080, height: 1620 },
      { base: 'ancorat_2026_cantare', width: 1600, height: 1067 },
    ],
    video: {
      src: 'assets/video/ancorat-2026-intrare.mp4',
      // Portada: fotograma de 16,2 s (las chicas alrededor del mural), elegido por el usuario.
      poster: 'assets/video/ancorat-2026-intrare-poster.webp',
      // El primer segundo es la entrada vacía (fallo de la grabación).
      start: 1,
      width: 576,
      height: 1024,
    },
    // Drive: «ELIM - MEDIA POZE › ANCORAT › POZE CONFERINTA - NAOMI» (50 fotos)
    driveFolderId: '1bzwggHsitKUKdterJ_wkie7vbQsXdpQO',
    verse: true,
  },
  {
    id: 'tabara_2026',
    kind: 'camp',
    icon: 'map-pin',
    start: '2026-07-25',
    end: '2026-07-26',
    place: 'Granja Casavieja, Ávila',
    points: [
      { key: 'together', icon: 'users' },
      { key: 'word', icon: 'book' },
      { key: 'nature', icon: 'sprout' },
    ],
    photos: [],
  },
];

/** Diapositiva del carrusel de portada desde una foto de `assets/drive-media/`. */
const slide = (
  id: string,
  i18nKey: string,
  name: string,
  tone: string,
  focus?: HeroSlide['focus'],
): HeroSlide => ({
  id,
  i18nKey,
  image: `assets/drive-media/${name}.webp`,
  medium: `assets/drive-media/${name}-960.webp`,
  thumb: `assets/drive-media/${name}-thumb.webp`,
  tone,
  focus,
});

/** Crónicas de los demás departamentos (carpetas de «ELIM - ACCES PUBLIC»). */
const BRASS_STORIES: readonly DepartmentStory[] = [
  {
    id: 'tarancon_2026',
    kind: 'visit',
    icon: 'map-pin',
    start: '2026-09-20',
    place: 'Tarancón',
    points: [],
    photos: [],
    // Drive: «Fanfara - Tarrancon - 2026/09/20» (fotos aún sin optimizar para la web)
    driveFolderId: '1ZONMdAMMZazHrwxCjl48ly4lbO2JPccL',
  },
];

const CHOIR_STORIES: readonly DepartmentStory[] = [
  {
    id: 'colinde_2025',
    kind: 'concert',
    icon: 'music',
    place: 'Biserica Elim, Arganda del Rey',
    points: [],
    photos: [{ base: 'concert_colinde_2025', width: 1600, height: 1067, featured: true }],
    // Drive: «Concert De Colinde Elim»
    driveFolderId: '1vnZxeXBrojLXcghG6o8HcgE5vbJ7MFUl',
  },
];

const RELIEF_STORIES: readonly DepartmentStory[] = [
  {
    id: 'zambetul_2025',
    kind: 'campaign',
    icon: 'gift',
    place: 'Biserica Elim, Arganda del Rey',
    points: [],
    photos: [{ base: 'zambetul_cutie_2025', width: 1600, height: 1067, featured: true }],
    // Drive: «Zambetul din cutie - 2025»
    driveFolderId: '1ADjG_UdCDXSEthe6Hr1GcYNXIWRKxXw-',
  },
];

const EVANGELISM_STORIES: readonly DepartmentStory[] = [
  {
    id: 'martie_2026',
    kind: 'evangelism',
    icon: 'megaphone',
    start: '2026-03-13',
    end: '2026-03-15',
    place: 'Biserica Elim, Arganda del Rey',
    guest: 'Gabi Zagrean · Frații Strugariu',
    points: [],
    photos: [],
    // Drive: «Evanghelizare - 13/15-03-2026 - Gabi Zagrean / Frati Strugariu»
    driveFolderId: '1ii8Kpq_qKKqV7JRZV7s3xpYx1_lwlmP6',
  },
];

const cover = (name: string): DepartmentCover => ({
  image: `assets/drive-media/${name}.webp`,
  medium: `assets/drive-media/${name}-960.webp`,
  thumb: `assets/drive-media/${name}-thumb.webp`,
});

/** El orden es el del menú y el del mosaico. */
export const DEPARTMENTS: readonly DepartmentConfig[] = [
  {
    id: 'youth',
    slug: DEPARTMENT_SLUGS.youth,
    icon: 'flame',
    // La misma foto que la segunda diapositiva de la portada.
    cover: cover('inchinare_tineret_2026'),
    leadership: 'youth',
    weeklyProgramId: 'vineri',
    pillars: ['worship', 'word', 'fellowship', 'service'],
    // Lo que no cuentan ya sus bloques (el encuentro de vineri, la masa y la
    // seară mensual tienen el suyo): no se repite.
    activities: [
      { key: 'worship', icon: 'music' },
      { key: 'conferences', icon: 'megaphone' },
      { key: 'camp', icon: 'map-pin' },
    ],
    modules: [
      {
        // Cada vineri: el encuentro y, dentro, la masa de después con su app.
        kind: 'weekly',
        key: 'friday',
        weeklyProgramId: 'vineri',
        durationMin: 150,
        parts: [
          { key: 'worship', icon: 'music' },
          { key: 'word', icon: 'book' },
          { key: 'table', icon: 'users' },
        ],
        companion: 'youth-meal',
      },
      {
        // Prima duminică a lunii, la serviciul de seară: programul îl duc în
        // mare parte tinerii.
        kind: 'monthly',
        key: 'sunday',
        rule: { weekday: 0, nth: 1 },
        time: '18:00',
        durationMin: 120,
        parts: [
          { key: 'worship', icon: 'music' },
          { key: 'testimonies', icon: 'megaphone' },
          { key: 'word', icon: 'book' },
        ],
      },
      { kind: 'events' },
      { kind: 'stories', stories: YOUTH_STORIES },
    ],
    // Portada en carrusel: el tineret en alabanza (la de la portada de
    // inicio) y ANCORAT (sala, alabanza, cântare, predică, interviu). Las
    // dos verticales llevan `focus` para que el recorte deje a las personas.
    heroSlides: [
      {
        id: 'youth_worship',
        i18nKey: 'worship',
        image: 'assets/drive-media/inchinare_tineret_2026.webp',
        medium: 'assets/drive-media/inchinare_tineret_2026-960.webp',
        thumb: 'assets/drive-media/inchinare_tineret_2026-thumb.webp',
        tone: '#6b645f',
        focus: 'center',
      },
      {
        id: 'youth_ancorat_hall',
        i18nKey: 'ancorat_hall',
        image: 'assets/drive-media/ancorat_2026_sala.webp',
        medium: 'assets/drive-media/ancorat_2026_sala-960.webp',
        thumb: 'assets/drive-media/ancorat_2026_sala-thumb.webp',
        tone: '#776760',
      },
      {
        id: 'youth_ancorat_worship',
        i18nKey: 'ancorat_worship',
        image: 'assets/drive-media/ancorat_2026_ecran.webp',
        medium: 'assets/drive-media/ancorat_2026_ecran-960.webp',
        thumb: 'assets/drive-media/ancorat_2026_ecran-thumb.webp',
        tone: '#867d78',
        focus: 'center',
      },
      {
        id: 'youth_ancorat_singing',
        i18nKey: 'ancorat_singing',
        image: 'assets/drive-media/ancorat_2026_cantare.webp',
        medium: 'assets/drive-media/ancorat_2026_cantare-960.webp',
        thumb: 'assets/drive-media/ancorat_2026_cantare-thumb.webp',
        tone: '#776b63',
        focus: 'center',
      },
      {
        id: 'youth_ancorat_sermon',
        i18nKey: 'ancorat_sermon',
        image: 'assets/drive-media/ancorat_2026_predica.webp',
        medium: 'assets/drive-media/ancorat_2026_predica-960.webp',
        thumb: 'assets/drive-media/ancorat_2026_predica-thumb.webp',
        tone: '#68665e',
        focus: 'center',
      },
      {
        id: 'youth_ancorat_interview',
        i18nKey: 'ancorat_interview',
        image: 'assets/drive-media/ancorat_2026_interviu.webp',
        medium: 'assets/drive-media/ancorat_2026_interviu-960.webp',
        thumb: 'assets/drive-media/ancorat_2026_interviu-thumb.webp',
        tone: '#645d58',
        focus: 'center',
      },
    ],
    featured: true,
  },
  {
    id: 'brass',
    slug: DEPARTMENT_SLUGS.brass,
    icon: 'music',
    cover: cover('fanfara_2026'),
    heroSlides: [slide('brass_band', 'band', 'fanfara_2026', '#7d7976')],
    leadership: 'brass_band',
    pillars: ['preparation', 'harmony', 'generations'],
    activities: [
      { key: 'services', icon: 'church' },
      { key: 'rehearsals', icon: 'clock' },
      { key: 'special', icon: 'sparkles' },
      { key: 'learners', icon: 'users' },
    ],
    modules: [{ kind: 'events' }, { kind: 'stories', stories: BRASS_STORIES }],
  },
  {
    id: 'choir',
    slug: DEPARTMENT_SLUGS.choir,
    icon: 'mic-vocal',
    cover: cover('cor_2026'),
    heroSlides: [
      slide('choir_service', 'service', 'cor_2026', '#78716d'),
      slide('choir_carols', 'carols', 'concert_colinde_2025', '#777e7e'),
    ],
    leadership: 'choir',
    pillars: ['worship', 'message', 'unity'],
    activities: [
      { key: 'services', icon: 'church' },
      { key: 'rehearsals', icon: 'clock' },
      { key: 'concerts', icon: 'sparkles' },
      { key: 'voices', icon: 'users' },
    ],
    modules: [{ kind: 'events' }, { kind: 'stories', stories: CHOIR_STORIES }],
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
    heroSlides: [slide('relief_boxes', 'boxes', 'zambetul_cutie_2025', '#736d74', 'top')],
    pillars: ['compassion', 'discretion', 'stewardship'],
    activities: [
      { key: 'families', icon: 'family' },
      { key: 'campaigns', icon: 'gift' },
      { key: 'collections', icon: 'heart' },
      { key: 'visits', icon: 'home' },
    ],
    modules: [{ kind: 'events' }, { kind: 'stories', stories: RELIEF_STORIES }],
  },
  {
    id: 'evangelism',
    slug: DEPARTMENT_SLUGS.evangelism,
    icon: 'sprout',
    // Concierto de villancicos abierto a la ciudad: evangelización en acto.
    cover: cover('concert_colinde_2025'),
    // La invitación (villancicos abiertos a la ciudad) y el fruto (bautismo).
    heroSlides: [
      slide('evangelism_carols', 'carols', 'concert_colinde_2025', '#777e7e'),
      slide('evangelism_candidates', 'candidates', 'candidati_botez_2026', '#918880', 'top'),
      slide('evangelism_baptism', 'baptism', 'botez_2025', '#91979f'),
    ],
    pillars: ['message', 'love', 'discipleship'],
    activities: [
      { key: 'evenings', icon: 'megaphone' },
      { key: 'concerts', icon: 'music' },
      { key: 'materials', icon: 'file-text' },
      { key: 'invitations', icon: 'send' },
    ],
    modules: [{ kind: 'events' }, { kind: 'stories', stories: EVANGELISM_STORIES }],
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
