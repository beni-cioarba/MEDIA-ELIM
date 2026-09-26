/**
 * Descompone el título de una emisión de YouTube en sus tres partes.
 *
 * Los títulos del canal siguen todos el mismo patrón, puesto a mano al subir
 * cada vídeo:
 *
 *   «Slujbă de seară - (Pilda robului nemilos) Duminică 20 Septembrie 2026»
 *    └── tipo ────┘    └── tema ───────────┘ └── fecha ──────────────┘
 *
 * Pintado en crudo dentro de una tarjeta, ese título ocupa cuatro líneas o se
 * corta a media palabra («Slujbă de seară - (Pilda robului nemilos) Duminică
 * 20…»), que es como se veía en la pantalla de proyección. Separado en tres
 * campos se lee de una ojeada: el tipo como antetítulo, el tema como titular y
 * la fecha como pie.
 *
 * **Degrada bien**: si un título no sigue el patrón —porque alguien lo escribe
 * distinto— se devuelve entero como titular y los otros dos campos vacíos. La
 * tarjeta sigue funcionando; sólo pierde la jerarquía.
 */

export interface TituloEmision {
  /** Tipo de servicio: «Slujbă de seară», «Seară de tineret»… Puede ir vacío. */
  readonly tipo: string;
  /** El titular: el tema si lo hay y, si no, lo que quede del título. */
  readonly titulo: string;
  /** La fecha o el pasaje, cuando el tema ya ocupa el titular. Puede ir vacío. */
  readonly meta: string;
}

/**
 * Separador entre el tipo y el resto. Se admiten los tres guiones porque en el
 * canal conviven: el corto que escribe el teclado y el medio/largo que mete
 * la corrección automática del móvil.
 */
const SEPARADOR = /\s+[-–—]\s+/;

/** El tema va entre paréntesis. El espacio interior sobra: «( Ascultă…)». */
const TEMA = /\(([^)]+)\)/;

export function partirTitulo(titulo: string): TituloEmision {
  const limpio = titulo.trim();
  if (!limpio) return { tipo: '', titulo: '', meta: '' };

  const corte = SEPARADOR.exec(limpio);
  if (!corte || corte.index === 0) {
    return { tipo: '', titulo: limpio, meta: '' };
  }

  const tipo = limpio.slice(0, corte.index).trim();
  const resto = limpio.slice(corte.index + corte[0].length).trim();

  const tema = TEMA.exec(resto);
  if (!tema) {
    // Sin tema: lo que queda es la fecha, y es lo único que distingue una
    // emisión de otra dentro del mismo tipo. Va al titular, no al pie.
    return { tipo, titulo: resto, meta: '' };
  }

  const fecha = resto.replace(TEMA, ' ').replace(/\s{2,}/g, ' ').trim();
  return { tipo, titulo: tema[1].trim(), meta: fecha };
}
