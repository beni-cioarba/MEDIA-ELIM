import { InjectionToken } from '@angular/core';
import type { TranslationPackLoader } from '../i18n/translation-pack.service';
import type { AppLanguage } from '../services/language.service';
import type { IconName } from '../ui/icon-name';

/**
 * Contrato del buscador de la web.
 *
 * El buscador **no conoce el contenido**: cada módulo aporta sus entradas con
 * un proveedor (`features/<x>/<x>.search.ts`) que declara en sus rutas
 * (`ModuleRoutes.search`). Módulo nuevo = su proveedor; aquí no se toca nada.
 * Receta: `docs/ai/78-search.md`.
 */

/**
 * Tipo de resultado: los grupos de la lista. Cada uno tiene su rótulo en
 * `search.kinds.<kind>` (`search.{ro,es}.json`). El orden en pantalla lo da
 * la relevancia; éste sólo desempata.
 */
export const SEARCH_KINDS = [
  'page',
  'announcement',
  'event',
  'program',
  'department',
  'people',
  'bible',
  'prayer',
  'belief',
  'help',
  'media',
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

/** Algo que se puede encontrar: un destino **dentro** de la web. */
export interface SearchEntry {
  /** Único dentro de su proveedor. */
  readonly id: string;
  readonly kind: SearchKind;
  /** Rótulo, ya en el idioma activo. */
  readonly title: string;
  /**
   * El rótulo en el otro idioma (`ctx.alt`): no se enseña y pesa casi como el
   * título. Quien usa la web en español también escribe «tineret».
   */
  readonly altTitle?: string;
  /** Segunda línea: dónde está o cuándo es. También se busca. */
  readonly context?: string;
  /** Ruta absoluta. **Siempre** de `APP_PATHS` / `blockPath()` / `departmentPath()`. */
  readonly path: string;
  readonly fragment?: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly icon: IconName;
  /**
   * Otras formas de buscarlo, que no se enseñan (sinónimos, de qué grupo es).
   * Lista o texto seguido.
   */
  readonly keywords?: string | readonly string[];
  /** Texto largo: se busca (pesa poco) y se enseña el trozo que coincide. */
  readonly body?: string;
  /** Multiplica la puntuación (1 por defecto): una página pesa más que un día suelto. */
  readonly boost?: number;
  /** Se ofrece al abrir, antes de escribir. Menor = antes. */
  readonly suggest?: number;
}

/** Lo que el buscador da a cada proveedor. */
export interface SearchContext {
  readonly lang: AppLanguage;
  /** Texto de la interfaz en el idioma activo. */
  t(key: string, params?: Readonly<Record<string, string | number>>): string;
  /** Como `t`, pero `null` si la clave no existe. */
  maybe(key: string): string | null;
  /**
   * El mismo texto **en el otro idioma** (`''` si no está). Va en `altTitle`:
   * media congregación usa la web en rumano y escribe en español, o al revés.
   */
  alt(key: string, params?: Readonly<Record<string, string | number>>): string;
  /**
   * Carga un paquete de textos de página (el mismo que usa su ruta), en los
   * dos idiomas, antes de leerlo con `t` / `alt`.
   */
  pack(id: string, loader: TranslationPackLoader): Promise<void>;
}

/**
 * Proveedor de un módulo. Se llama **en contexto de inyección** y con la hora
 * del reloj compartido: los `inject()` van antes del primer `await`, y la
 * vigencia se toma de los servicios (nunca se filtra por fecha a mano).
 */
export type SearchProvider = (context: SearchContext) => readonly SearchEntry[] | Promise<readonly SearchEntry[]>;

/** Proveedor perezoso, con su módulo: lo que se declara en las rutas. */
export interface SearchSource {
  /** Módulo que lo aporta (`announcements`): prefijo de sus ids. */
  readonly id: string;
  readonly load: () => Promise<SearchProvider>;
}

/** Todos los proveedores de la web. Los reúne `app.routes.ts` desde los módulos. */
export const SEARCH_SOURCES = new InjectionToken<readonly SearchSource[]>('SEARCH_SOURCES', {
  providedIn: 'root',
  factory: () => [],
});
