/**
 * Documento que se puede abrir en los visores de la app (visor documental y
 * galería). Es el **único contrato** entre quien muestra algo y los visores:
 * cada módulo traduce su modelo (una familia, una persona, un boletín…) a
 * esto y los visores no saben nada de familias ni de personas.
 *
 * Sólo `src` es obligatorio; todo lo demás enriquece la presentación.
 */
export interface ViewerDocument {
  /** URL del fichero (mismo origen: las descargas y la impresión lo necesitan). */
  readonly src: string;
  /** Nombre que se muestra en la cabecera; si falta, el del fichero de `src`. */
  readonly name?: string;
  /** Tipo MIME, si se conoce (manda sobre la extensión al decidir el motor). */
  readonly mimeType?: string;
  /** Fuerza la categoría (y con ella el motor) cuando no se puede deducir. */
  readonly category?: DocumentCategory;

  /** Imágenes: variantes (`srcset`), para que el navegador elija según la pantalla. */
  readonly srcset?: string;
  /** Miniatura (tira de la galería). */
  readonly thumb?: string;
  /** Texto alternativo; si falta, el nombre. */
  readonly alt?: string;

  /** Descripción breve (galería: pie de foto). */
  readonly description?: string;
  /** Fecha del documento, `YYYY-MM-DD` (se formatea en el idioma activo). */
  readonly date?: string;
  /** Datos extra de la cabecera, tras la fecha («Rugăciune pentru familii»). */
  readonly meta?: readonly string[];
  /** Distintivo de estado en el centro de la cabecera. */
  readonly status?: { readonly label: string; readonly tone?: StatusTone };
  /** Filas del panel de información (además de nombre, tipo y fecha). */
  readonly details?: readonly { readonly label: string; readonly value: string }[];

  /** Nombre del fichero al descargar; si falta, el de `src`. */
  readonly downloadName?: string;
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Familias de fichero: cada una tiene su motor, su icono y sus herramientas. */
export type DocumentCategory = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported';

/** Nombre del fichero de una URL (sin ruta, consulta ni ancla). */
export function fileNameOf(src: string): string {
  const path = src.split(/[?#]/)[0];
  return decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)) || src;
}

/** Nombre a mostrar: el declarado o el del fichero. */
export function displayName(doc: ViewerDocument): string {
  return doc.name ?? fileNameOf(doc.src);
}
