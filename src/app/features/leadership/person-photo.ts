import { LEADERSHIP_PHOTOS } from '../../core/leadership-photos.generated';

/** Carpeta de las fotos de perfil (las escribe `scripts/import-leadership-photos.mjs`). */
export const PHOTO_ROOT = 'assets/leadership';

/**
 * Tipo de hueco donde se pinta la foto. Cada uno sólo ofrece al navegador
 * los anchos que le corresponden.
 *
 * Por qué: Chrome, si ya tiene en memoria una variante **mayor** del mismo
 * `srcset`, la reutiliza en vez de descargar la adecuada. Tras abrir el visor
 * (1600 px) una tarjeta de 190 px pintaba la de 1600 reducida ×8, y en tejidos
 * de rayas finas (trajes, listones del fondo) eso produce muaré. Con rangos
 * por hueco, lo peor que puede reutilizar es una variante ×2.
 */
export type PhotoSlot = 'tiny' | 'small' | 'card' | 'hero';

/** Anchos (px) que acepta cada hueco, de menor a mayor. */
const SLOT_RANGE: Readonly<Record<PhotoSlot, readonly [number, number]>> = {
  tiny: [0, 160], // avatares del directorio y «sirve junto a»: hasta 3 rem
  small: [0, 320], // filas de la vista por personas: hasta 4 rem
  card: [320, 640], // tarjetas de conducerea y del comité: 9–14 rem
  hero: [320, 960], // cabecera del perfil (a todo el ancho en móvil)
};

/** Foto de perfil lista para `<img>` en un hueco concreto. */
export interface PhotoSource {
  /** Variante mayor del hueco: `src` de reserva. */
  readonly src: string;
  readonly srcset: string;
  /** Medidas de la foto (reservan el hueco antes de cargar; todas 4:5). */
  readonly width: number;
  readonly height: number;
}

/** Foto de perfil de una persona: retrato 4:5 en varios anchos. */
export interface PersonPhoto {
  readonly id: string;
  /** Anchos disponibles, de menor a mayor. */
  readonly variants: readonly number[];
  readonly width: number;
  readonly height: number;
}

/**
 * Foto de una persona según el manifiesto generado, o nada si aún no hay.
 * Basta con importar la foto para que aparezca en todas las pantallas: la
 * configuración de personas no lleva nombres de fichero.
 */
export function personPhoto(id: string): PersonPhoto | undefined {
  const entry = LEADERSHIP_PHOTOS[id];
  return entry ? { id, variants: entry.variants, width: entry.width, height: entry.height } : undefined;
}

const fileOf = (photo: PersonPhoto, width: number) => `${PHOTO_ROOT}/${photo.id}-${width}.webp`;

/** `src`/`srcset` de la foto limitados a los anchos del hueco (`null` = todos: el visor). */
export function photoSource(photo: PersonPhoto, slot: PhotoSlot | null): PhotoSource {
  let widths = photo.variants;
  if (slot) {
    const [min, max] = SLOT_RANGE[slot];
    const inRange = widths.filter((w) => w >= min && w <= max);
    // Foto pequeña (sin ningún ancho del rango): la mayor que no se pase, o la menor.
    widths = inRange.length > 0 ? inRange : [widths.filter((w) => w <= max).at(-1) ?? widths[0]];
  }
  return {
    src: fileOf(photo, widths[widths.length - 1]),
    srcset: widths.map((w) => `${fileOf(photo, w)} ${w}w`).join(', '),
    width: photo.width,
    height: photo.height,
  };
}

/** Variante menor (miniatura del visor). */
export function photoThumb(photo: PersonPhoto): string {
  return fileOf(photo, photo.variants[0]);
}
