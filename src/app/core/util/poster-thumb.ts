/**
 * Miniatura de un cartel (`assets/posters/<nombre>.webp` →
 * `<nombre>-thumb.webp`, 160 px de lado mayor).
 *
 * Para donde el cartel se pinta como icono —la fila de la agenda de eventos,
 * 32-40 px—: con el fichero entero (1080 px) cada fila bajaba 50-130 kB.
 * La genera `npm run posters` junto a cada cartel; que exista lo vigila
 * `npm run check` (`check-content`).
 *
 * Un cartel que no sea `.webp` (no debería haberlo) se devuelve tal cual.
 */
export function posterThumb(poster: string): string {
  return poster.replace(/\.webp$/i, '-thumb.webp');
}
