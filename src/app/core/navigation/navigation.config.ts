import { APP_PATHS, blockPath, departmentPath } from './app-paths';
import { NavItem } from './nav.model';

/**
 * Menú principal de la aplicación.
 *
 * Reglas para escalar:
 *  1. Un módulo nuevo = una entrada nueva aquí (más su ruta en `app.routes.ts`).
 *  2. Máximo **dos niveles** (entrada → hijos). Si un grupo pide un tercer
 *     nivel, es señal de que necesita su propia página índice.
 *  3. Máximo ~7 entradas de primer nivel: por encima, el usuario deja de
 *     escanear el menú y hay que agrupar. Las entradas con `cta` no cuentan:
 *     no viven en la lista de enlaces sino en la zona de acciones.
 *  4. Todo rótulo es una clave i18n bajo `nav.*`, presente en `es` y `ro`.
 *  5. Todo grupo lleva `path` (su portada de sección, que monta
 *     `NavHubComponent` desde `app.routes.ts`) y `descriptionKey` (la
 *     entradilla de esa portada). La barra de pestañas del móvil enlaza ahí.
 *  6. El primer nivel **sin las `cta`** son las pestañas del móvil, en este
 *     orden (hoy seis). Seis es el techo: a 320 px cada una mide ~51 px y
 *     por debajo de 380 sólo la activa lleva rótulo. Si un rótulo no cabe
 *     en ~60 px, `tabLabelKey` le da uno corto.
 */
export const MAIN_NAV: readonly NavItem[] = [
  {
    id: 'home',
    labelKey: 'nav.home',
    path: `/${APP_PATHS.home}`,
    icon: 'home',
  },
  {
    id: 'about',
    labelKey: 'nav.about',
    descriptionKey: 'nav.about_desc',
    path: `/${APP_PATHS.churchHub}`,
    icon: 'users',
    children: [
      {
        id: 'about-us',
        labelKey: 'nav.about_us',
        descriptionKey: 'nav.about_us_desc',
        path: `/${APP_PATHS.about}`,
        icon: 'users',
      },
      {
        id: 'credo',
        labelKey: 'nav.credo',
        descriptionKey: 'nav.credo_desc',
        path: `/${APP_PATHS.credo}`,
        icon: 'book',
      },
      {
        id: 'leadership',
        labelKey: 'nav.leadership',
        descriptionKey: 'nav.leadership_desc',
        path: `/${APP_PATHS.leadership}`,
        icon: 'network',
      },
    ],
  },
  {
    id: 'program',
    labelKey: 'nav.program',
    descriptionKey: 'nav.program_desc',
    path: `/${APP_PATHS.programHub}`,
    icon: 'calendar',
    children: [
      {
        // Primero: es lo que caduca y lo que la congregación busca al entrar.
        id: 'announcements',
        labelKey: 'nav.announcements',
        descriptionKey: 'nav.announcements_desc',
        path: `/${APP_PATHS.announcements}`,
        icon: 'megaphone',
      },
      {
        id: 'weekly',
        labelKey: 'nav.weekly',
        descriptionKey: 'nav.weekly_desc',
        path: blockPath('weekly'),
        icon: 'calendar',
      },
      {
        id: 'upcoming',
        labelKey: 'nav.upcoming',
        descriptionKey: 'nav.upcoming_desc',
        path: blockPath('upcoming'),
        // No `calendar`: ya lo lleva el programa semanal y dos entradas
        // seguidas con el mismo icono parecían la misma cosa.
        icon: 'sparkles',
      },
      {
        id: 'bible',
        labelKey: 'nav.bible',
        descriptionKey: 'nav.bible_desc',
        path: blockPath('bible'),
        icon: 'book',
      },
      {
        id: 'family-prayer',
        labelKey: 'nav.family_prayer',
        descriptionKey: 'nav.family_prayer_desc',
        path: `/${APP_PATHS.familyPrayer}`,
        icon: 'family',
      },
      {
        id: 'prayer-causes',
        labelKey: 'nav.prayer_causes',
        descriptionKey: 'nav.prayer_causes_desc',
        path: `/${APP_PATHS.prayerCauses}`,
        icon: 'pray',
      },
      {
        // Último: no es semanal sino anual (fases de marzo a agosto).
        id: 'talent-contest',
        labelKey: 'nav.talent_contest',
        descriptionKey: 'nav.talent_contest_desc',
        path: `/${APP_PATHS.talentContest}`,
        icon: 'trophy',
      },
    ],
  },
  {
    // Ministerios de la iglesia. Portada propia (mosaico) y una página por
    // departamento, todas desde `core/departments.config.ts`.
    id: 'departments',
    labelKey: 'nav.departments',
    tabLabelKey: 'nav.departments_tab',
    // La portada de cada departamento ya dice dónde se está: sin migaja.
    noBreadcrumb: true,
    descriptionKey: 'nav.departments_desc',
    path: `/${APP_PATHS.departments}`,
    icon: 'layout-grid',
    children: [
      {
        id: 'dept-youth',
        labelKey: 'departments.youth.name',
        descriptionKey: 'nav.dept_youth_desc',
        path: departmentPath('youth'),
        icon: 'flame',
      },
      {
        id: 'dept-brass',
        labelKey: 'departments.brass.name',
        descriptionKey: 'nav.dept_brass_desc',
        path: departmentPath('brass'),
        icon: 'music',
      },
      {
        id: 'dept-choir',
        labelKey: 'departments.choir.name',
        descriptionKey: 'nav.dept_choir_desc',
        path: departmentPath('choir'),
        icon: 'mic-vocal',
      },
      {
        id: 'dept-missions',
        labelKey: 'departments.missions.name',
        descriptionKey: 'nav.dept_missions_desc',
        path: departmentPath('missions'),
        icon: 'globe',
      },
      {
        id: 'dept-relief',
        labelKey: 'departments.relief.name',
        descriptionKey: 'nav.dept_relief_desc',
        path: departmentPath('relief'),
        icon: 'hand-heart',
      },
      {
        id: 'dept-evangelism',
        labelKey: 'departments.evangelism.name',
        descriptionKey: 'nav.dept_evangelism_desc',
        path: departmentPath('evangelism'),
        icon: 'sprout',
      },
    ],
  },
  {
    id: 'media',
    labelKey: 'nav.media',
    descriptionKey: 'nav.media_desc',
    path: `/${APP_PATHS.mediaHub}`,
    icon: 'image',
    children: [
      {
        id: 'media-stage',
        labelKey: 'nav.media_stage',
        descriptionKey: 'nav.media_stage_desc',
        path: `/${APP_PATHS.media}`,
        icon: 'play',
      },
      {
        id: 'gallery',
        labelKey: 'nav.gallery',
        descriptionKey: 'nav.gallery_desc',
        path: blockPath('gallery'),
        icon: 'image',
      },
      {
        id: 'socials',
        labelKey: 'nav.socials',
        descriptionKey: 'nav.socials_desc',
        path: blockPath('socials'),
        icon: 'share',
      },
    ],
  },
  {
    id: 'contact',
    labelKey: 'nav.contact',
    path: `/${APP_PATHS.contact}`,
    icon: 'map-pin',
  },
  {
    id: 'donate',
    labelKey: 'nav.donate',
    path: `/${APP_PATHS.donate}`,
    icon: 'gift',
    cta: 'support',
  },
  {
    id: 'live',
    labelKey: 'nav.live',
    path: blockPath('streams'),
    icon: 'play',
    cta: 'live',
  },
];
