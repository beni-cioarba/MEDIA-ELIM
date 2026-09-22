/**
 * Miniaturas de YouTube en **16:9 de verdad**.
 *
 * La API devuelve `hqdefault.jpg`, que mide 480×360 (**4:3**): YouTube recorta
 * los lados de la miniatura original —que la iglesia diseña en 16:9, con el
 * nombre del predicador en una banda lateral— para rellenar ese formato. Al
 * pintarla luego en una caja 16:9 con `object-fit: cover` se recorta otra vez,
 * ahora por arriba y por abajo. Resultado: la banda lateral desaparece y la
 * imagen se ve «comida» por los cuatro lados.
 *
 * Estos dos formatos sí son 16:9 exactos, así que la miniatura se ve **entera**:
 *  - `hq720.jpg` (1280×720): nitidez para pantallas grandes y densidad 2×.
 *    No existe en vídeos antiguos o subidos en baja resolución → 404.
 *  - `mqdefault.jpg` (320×180): existe **siempre**. Es el respaldo.
 *
 * Por eso la plantilla pide `hq720` y, si falla, cambia a `mqdefault`
 * (`youtubeThumbFallback`). No se toca el dato que llega del cron: la
 * corrección es de presentación.
 */

/** Id del vídeo a partir de una URL de `i.ytimg.com`, o `null` si no lo es. */
function videoIdFrom(url: string): string | null {
  const match = /i\.ytimg\.com\/vi\/([^/]+)\//.exec(url);
  return match ? match[1] : null;
}

/** URL 16:9 de máxima calidad para la miniatura de un vídeo. */
export function youtubeThumb(url: string): string {
  const id = videoIdFrom(url);
  return id ? `https://i.ytimg.com/vi/${id}/hq720.jpg` : url;
}

/**
 * Respaldo cuando `hq720` no existe (404): `mqdefault`, que sigue siendo 16:9.
 * Se llama desde el `(error)` de la imagen; si ya era el respaldo, no hace nada
 * (evita un bucle de errores).
 */
export function youtubeThumbFallback(event: Event): void {
  const img = event.target as HTMLImageElement;
  const id = videoIdFrom(img.src);
  if (!id || img.src.includes('mqdefault')) return;
  img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}
