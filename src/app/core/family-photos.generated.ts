/**
 * Manifiesto de fotos de «Rugăciune pentru familii» — GENERADO.
 *
 * No lo edites a mano: lo escribe `scripts/import-family-photos.mjs` leyendo
 * `src/assets/family-prayer/`. Clave `<domingo>/<id>`; `variants` son los
 * pares [lado mayor del fichero, ancho real en px] para montar el `srcset`.
 */

export interface FamilyPhotoManifestEntry {
  /** Medidas de la variante mayor (proporción de la foto). */
  readonly width: number;
  readonly height: number;
  /** [sufijo del fichero (lado mayor), ancho real], de menor a mayor. */
  readonly variants: readonly (readonly [number, number])[];
}

export const FAMILY_PHOTOS: Readonly<Record<string, FamilyPhotoManifestEntry>> = {
  '2026-09-06/albu-radu-araceli': { width: 1235, height: 1600, variants: [[480, 370], [960, 741], [1600, 1235]] },
  '2026-09-06/albu-radu-ionela': { width: 1600, height: 1187, variants: [[480, 480], [960, 960], [1600, 1600]] },
  '2026-09-06/albu-vasile-voichita': { width: 1457, height: 1600, variants: [[480, 437], [960, 874], [1600, 1457]] },
  '2026-09-06/andor-ioan-iuliana': { width: 1600, height: 900, variants: [[480, 480], [960, 960], [1600, 1600]] },
  '2026-09-06/andor-nelutu-dana': { width: 716, height: 1281, variants: [[480, 268], [960, 537], [1281, 716]] },
  '2026-09-13/andrei-daniela-florin': { width: 1497, height: 1600, variants: [[480, 449], [960, 898], [1600, 1497]] },
  '2026-09-13/apalaghiei-iulian-lenuta': { width: 1600, height: 1028, variants: [[480, 480], [960, 960], [1600, 1600]] },
  '2026-09-13/aparaschivei-cristina': { width: 1026, height: 1600, variants: [[480, 308], [960, 615], [1600, 1026]] },
  '2026-09-13/baceanu-emanuela': { width: 1213, height: 1600, variants: [[480, 364], [960, 728], [1600, 1213]] },
  '2026-09-13/bagosi-richard-marta': { width: 949, height: 1600, variants: [[480, 285], [960, 569], [1600, 949]] },
  '2026-09-20/bahmata-daniel-mihaela': { width: 1301, height: 1600, variants: [[480, 390], [960, 781], [1600, 1301]] },
  '2026-09-20/baleanu-antonel-rodica': { width: 1114, height: 1600, variants: [[480, 334], [960, 668], [1600, 1114]] },
  '2026-09-20/barba-bogdan-magdalena': { width: 1324, height: 1600, variants: [[480, 397], [960, 795], [1600, 1324]] },
  '2026-09-20/bena-andreas': { width: 1200, height: 1600, variants: [[480, 360], [960, 720], [1600, 1200]] },
  '2026-09-20/bena-iosua': { width: 1434, height: 1600, variants: [[480, 430], [960, 860], [1600, 1434]] },
  '2026-09-27/bena-maria-mircea': { width: 1600, height: 918, variants: [[480, 480], [960, 960], [1600, 1600]] },
  '2026-09-27/bindea-dorel-ana': { width: 1457, height: 1600, variants: [[480, 437], [960, 874], [1600, 1457]] },
  '2026-09-27/biris-florin-anca': { width: 1600, height: 1523, variants: [[480, 480], [960, 960], [1600, 1600]] },
  '2026-09-27/birle-otniel-cristina': { width: 1275, height: 1600, variants: [[480, 382], [960, 765], [1600, 1275]] },
  '2026-09-27/birle-sebastian-maria': { width: 1570, height: 1600, variants: [[480, 471], [960, 942], [1600, 1570]] },
};
