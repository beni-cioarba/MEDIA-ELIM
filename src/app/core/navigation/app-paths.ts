import type { PresentationBlockId } from '../services/presentation-blocks.service';

/**
 * Rutas de la aplicación en un único sitio.
 *
 * **Nunca** escribas una ruta como literal en una plantilla o en un servicio:
 * importa `APP_PATHS` / `blockPath()`. Así renombrar una sección es un cambio
 * de una línea y el compilador encuentra todos los usos.
 */
export const APP_PATHS = {
  home: '',
  /**
   * Portadas de sección (hubs): la página propia de cada grupo de `MAIN_NAV`.
   * Resumen vivo de cada entrada del grupo y acceso a todas. Son el destino
   * de la barra de pestañas del móvil y de la migaja de pan del grupo.
   * `multimedia` y no `media`: `/media` ya es el panel completo (y la raíz de
   * los bloques y de las rutas del operador), y no se rompe una URL que ya
   * circula en QR y enlaces.
   */
  churchHub: 'biserica',
  programHub: 'program',
  mediaHub: 'multimedia',
  /**
   * Departamente: portada propia (`DepartmentsHomeComponent`, no la portada
   * genérica) y una página por departamento en `/departamente/<slug>`
   * (`DEPARTMENT_SLUGS`).
   */
  departments: 'departamente',
  about: 'despre-noi',
  leadership: 'conducere',
  /** Mărturisirea de credință completa (30 artículos). */
  credo: 'marturisirea-de-credinta',
  /** Escenario multimedia completo (y raíz de los bloques individuales). */
  media: 'media',
  /**
   * Rutas del operador, hijas de `media` pero **fuera** del shell público
   * (sin cabecera ni pie): el panel de control y la ventana de proyección.
   */
  control: 'control',
  projection: 'ecran',
  /** Anunțuri vigentes; admite `/anunturi/:id` como enlace propio de cada uno. */
  announcements: 'anunturi',
  /**
   * Rugăciune pentru familii: la semana en curso; admite
   * `/rugaciune-pentru-familii/<domingo>` para una semana concreta.
   */
  familyPrayer: 'rugaciune-pentru-familii',
  /** Cauzele Bisericii Elim: la lista vigente de causas de oración. */
  prayerCauses: 'cauze-de-rugaciune',
  /** Talantul în Negoț: el concurso bíblico, contado para quien quiera participar. */
  talentContest: 'talantul-in-negot',
  /** Página de contacto: formulario, datos directos y cómo llegar. */
  contact: 'contact',
  /** Donativos: transferencia bancaria y por qué se dona. */
  donate: 'doneaza',
  /**
   * Guía de estilos viva: el catálogo de tokens y primitivas de la app.
   * Es una herramienta de construcción (como el panel de control), no una
   * sección pública: no entra en el menú ni en el sitemap.
   */
  styleguide: 'stil',
} as const;

export type AppPathKey = keyof typeof APP_PATHS;

/**
 * Bloques que pueden mostrarse como página propia.
 * Es el conjunto de bloques proyectables + `location`, que sólo existe en la
 * web pública (no se proyecta).
 */
export type StageBlockId = PresentationBlockId | 'location';

/**
 * Slug de URL de cada bloque. En rumano porque es el idioma por defecto del
 * público objetivo; los slugs son parte de la marca y no se traducen.
 */
export const STAGE_BLOCK_SLUGS = {
  announcements: 'anunturi',
  socials: 'retele',
  streams: 'transmisiuni',
  gallery: 'galerie',
  weekly: 'program',
  upcoming: 'evenimente',
  bible: 'citirea-bibliei',
  families: 'rugaciune-pentru-familii',
  causes: 'cauze-de-rugaciune',
  // Web: `/media/talantul-in-negot` redirige a la página del concurso.
  talent: 'talantul-in-negot',
  // Sólo proyección (en la web ya se está en el sitio): `/media/site` → portada.
  website: 'site',
  location: 'locatie',
} as const satisfies Record<StageBlockId, string>;

/**
 * Slug de cada departamento (`/departamente/<slug>`). Como los de los
 * bloques: en rumano y parte de la marca, no se traducen. Añadir un
 * departamento empieza aquí; el compilador obliga a darle datos en
 * `core/departments.config.ts`.
 */
export const DEPARTMENT_SLUGS = {
  youth: 'tineret',
  brass: 'fanfara',
  choir: 'cor',
  missions: 'misiune-externa',
  relief: 'ajutorare',
  evangelism: 'evanghelizare',
} as const;

export type DepartmentId = keyof typeof DEPARTMENT_SLUGS;

/** Ruta absoluta de la página de un departamento. */
export function departmentPath(id: DepartmentId): string {
  return `/${APP_PATHS.departments}/${DEPARTMENT_SLUGS[id]}`;
}

export type StageBlockSlug = (typeof STAGE_BLOCK_SLUGS)[StageBlockId];

/** Índice inverso slug → id, para resolver el parámetro de ruta. */
const SLUG_TO_BLOCK = new Map<string, StageBlockId>(
  (Object.entries(STAGE_BLOCK_SLUGS) as readonly [StageBlockId, string][]).map(
    ([id, slug]) => [slug, id],
  ),
);

/** Ruta absoluta de un bloque como página independiente. */
export function blockPath(id: StageBlockId): string {
  return `/${APP_PATHS.media}/${STAGE_BLOCK_SLUGS[id]}`;
}

/** Resuelve el parámetro `:blockId` de la URL. `null` si no es válido. */
export function blockIdFromSlug(slug: string | null | undefined): StageBlockId | null {
  if (!slug) return null;
  return SLUG_TO_BLOCK.get(slug) ?? null;
}
