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
  about: 'despre-noi',
  leadership: 'conducere',
  /** Mărturisirea de credință completa (30 artículos). */
  credo: 'marturisirea-de-credinta',
  /** Escenario multimedia completo (y raíz de los bloques individuales). */
  media: 'media',
  /** Página de contacto: formulario, datos directos y cómo llegar. */
  contact: 'contact',
  /** Donativos: transferencia bancaria y por qué se dona. */
  donate: 'doneaza',
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
  socials: 'retele',
  streams: 'transmisiuni',
  gallery: 'galerie',
  weekly: 'program',
  upcoming: 'evenimente',
  location: 'locatie',
} as const satisfies Record<StageBlockId, string>;

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
