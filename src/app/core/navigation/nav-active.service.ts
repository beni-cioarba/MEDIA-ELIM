import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { MAIN_NAV } from './navigation.config';
import { NavItem, isNavGroup } from './nav.model';

/**
 * Fuente única de verdad de «dónde estoy» dentro de `MAIN_NAV`.
 *
 * ── Por qué no basta `routerLinkActive` ───────────────────────────────
 *  1. Los disparadores de grupo («Biserica», «Program», «Media») son
 *     `<button>`, no enlaces: `routerLinkActive` no los alcanza, así que el
 *     usuario no veía en qué sección estaba hasta abrir el desplegable.
 *  2. Las rutas de esta app se solapan (`/media`, `/media/galerie`,
 *     `/media/locatie`). Con `exact: false` se marcarían varias entradas a la
 *     vez y con `exact: true` ninguna en las páginas hijas. Aquí resolvemos
 *     por **coincidencia más larga**, que es lo que espera el usuario.
 *  3. El rastro (`trail`) sirve además al menú móvil y a cualquier migaja de
 *     pan futura sin duplicar lógica.
 */
@Injectable({ providedIn: 'root' })
export class NavActiveService {
  private readonly router = inject(Router);

  /** URL activa normalizada (sin query, sin fragmento, sin barra final). */
  readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => normalize(event.urlAfterRedirects)),
    ),
    { initialValue: normalize(this.router.url) },
  );

  /**
   * Rastro activo de arriba abajo: `[]`, `[hoja]` o `[grupo, hoja]`.
   * Es la base de los estados activos y de una futura migaja de pan.
   */
  readonly trail = computed<readonly NavItem[]>(() => findTrail(MAIN_NAV, this.url()));

  /** Ids del rastro, para consultar en plantilla en O(1). */
  readonly activeIds = computed(() => new Set(this.trail().map((item) => item.id)));
}

/** `/media/galerie?x=1#y` → `/media/galerie`; `/` → `/`. */
function normalize(url: string): string {
  const clean = url.split(/[?#]/)[0] ?? '/';
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

/**
 * Puntuación de coincidencia entre la URL y la ruta de una entrada.
 * `-1` = no coincide. A mayor valor, coincidencia más específica.
 */
function score(path: string | undefined, url: string): number {
  if (path === undefined) return -1;
  const target = normalize(path);
  // La portada sólo se marca en coincidencia exacta: si no, estaría siempre
  // activa porque toda URL empieza por «/».
  if (target === '/') return url === '/' ? 0 : -1;
  if (url === target) return target.length;
  return url.startsWith(`${target}/`) ? target.length : -1;
}

/** Recorre el menú y devuelve el rastro de la coincidencia más específica. */
function findTrail(items: readonly NavItem[], url: string): readonly NavItem[] {
  let best: readonly NavItem[] = [];
  let bestScore = -1;

  const visit = (item: NavItem, ancestors: readonly NavItem[]): void => {
    const value = score(item.path, url);
    if (value > bestScore) {
      bestScore = value;
      best = [...ancestors, item];
    }
    if (isNavGroup(item)) {
      for (const child of item.children) visit(child, [...ancestors, item]);
    }
  };

  for (const item of items) visit(item, []);
  return best;
}
