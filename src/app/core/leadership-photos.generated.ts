/**
 * Manifiesto de fotos de perfil de «Conducere» — GENERADO.
 *
 * No lo edites a mano: lo escribe `scripts/import-leadership-photos.mjs`
 * leyendo `src/assets/leadership/`. Clave = `id` de la persona; `variants`
 * son los anchos disponibles (`<id>-<ancho>.webp`), de menor a mayor.
 */

export interface LeadershipPhotoManifestEntry {
  /** Medidas de la variante mayor (todas son retrato 4:5). */
  readonly width: number;
  readonly height: number;
  readonly variants: readonly number[];
}

export const LEADERSHIP_PHOTOS: Readonly<Record<string, LeadershipPhotoManifestEntry>> = {
  'gabriel-daniel-cifor': { width: 1003, height: 1254, variants: [160, 320, 640, 1003] },
  'grigore-tomoiaga': { width: 1600, height: 2000, variants: [160, 320, 640, 960, 1600] },
  'ilie-petrescu': { width: 1176, height: 1470, variants: [160, 320, 640, 960, 1176] },
  'ioan-andor': { width: 1600, height: 2000, variants: [160, 320, 640, 960, 1600] },
  'ioan-lauran': { width: 1018, height: 1273, variants: [160, 320, 640, 1018] },
  'petrica-halas': { width: 1600, height: 2000, variants: [160, 320, 640, 960, 1600] },
  'vali-roman': { width: 324, height: 405, variants: [160, 324] },
};
