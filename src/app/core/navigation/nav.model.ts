/**
 * Modelo declarativo de navegación.
 *
 * El menú **no** se escribe a mano en la plantilla: se declara como datos en
 * `navigation.config.ts` y `TopNavComponent` lo renderiza. Añadir un módulo
 * nuevo a la app es añadir una entrada aquí, no tocar el HTML de la cabecera.
 */

import { IconName } from '../ui/icon-name';

export interface NavItem {
  /** Identificador estable, usado como `track` y en tests. */
  readonly id: string;
  /** Clave i18n del rótulo (`nav.*`). */
  readonly labelKey: string;
  /** Ruta interna **absoluta** (`/despre-noi`). Excluyente con `externalUrl`. */
  readonly path?: string;
  /** Enlace externo (se abre en pestaña nueva). Excluyente con `path`. */
  readonly externalUrl?: string;
  /** Clave i18n de la descripción corta que se muestra en el desplegable. */
  readonly descriptionKey?: string;
  readonly icon?: IconName;
  /** Sub-entradas: renderiza un desplegable en escritorio y un grupo en móvil. */
  readonly children?: readonly NavItem[];
  /**
   * Marca la entrada como llamada a la acción en vez de como enlace de
   * contenido. En escritorio no aparece en la lista de navegación, sino en la
   * zona de acciones de la derecha:
   *  - `live`    → CTA principal (píldora dorada con punto pulsante).
   *  - `support` → CTA secundaria (píldora perfilada).
   * En móvil siguen dentro del cajón, donde no hay problema de espacio.
   */
  readonly cta?: 'live' | 'support';
}

/** ¿La entrada abre un destino externo? */
export function isExternalNavItem(
  item: NavItem,
): item is NavItem & { readonly externalUrl: string } {
  return typeof item.externalUrl === 'string' && item.externalUrl.length > 0;
}

/** ¿La entrada agrupa hijos en vez de navegar ella misma? */
export function isNavGroup(
  item: NavItem,
): item is NavItem & { readonly children: readonly NavItem[] } {
  return Array.isArray(item.children) && item.children.length > 0;
}
