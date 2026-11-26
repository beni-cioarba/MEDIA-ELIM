import { ComponentRef, Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  BaseRouteReuseStrategy,
  DetachedRouteHandle,
  Route,
} from '@angular/router';
import { MAIN_NAV } from './navigation.config';

/** Barra de pestañas visible: el mismo corte que la barra (`< lg`). */
const CON_BARRA = '(max-width: 1023.98px)';

/**
 * URL de cada pestaña del teléfono: el primer nivel de `MAIN_NAV` sin las
 * llamadas a la acción (la misma regla que `TabNavService`).
 */
const TAB_URLS: ReadonlySet<string> = new Set(
  MAIN_NAV.filter((item) => item.path !== undefined && item.cta === undefined).map((item) =>
    normalizar(item.path ?? ''),
  ),
);

/**
 * Las páginas de pestaña **no se destruyen al salir de ellas** en el teléfono
 * y la tableta: se guardan y, al volver, el router las vuelve a colgar tal
 * cual, como las pestañas de una app nativa.
 *
 * ── Por qué (26/11/2026) ──────────────────────────────────────────────
 * Al deslizar entre pestañas la navegación en sí tarda 7 ms, pero después el
 * hilo principal se quedaba **150 ms** (portátil; 0,6–1 s en un teléfono)
 * construyendo desde cero una página que el visitante acababa de ver. En ese
 * hueco el dedo no respondía: «se bloquea un segundo y no deja pasar a la
 * siguiente». Con la página guardada, volver a ella es mover su DOM ya hecho.
 *
 * ── Alcance ───────────────────────────────────────────────────────────
 * - Sólo las seis páginas raíz de pestaña (portada y portadas de sección),
 *   no las páginas de dentro: crecer en módulos no hace crecer la caché.
 * - Sólo se guardan con la barra de pestañas a la vista (`< lg`): en
 *   escritorio no hay deslizar y una página siempre nueva es lo esperado.
 * - Lo que conservan es su estado (un filtro, un formulario a medias), como
 *   cualquier app de pestañas. El scroll no: el router sube arriba al llegar.
 * - Una página de pestaña que arranque algo caro al construirse debe
 *   saber que puede vivir mucho: lo que haga trabajo propio debe pararse fuera
 *   de pantalla (el carrusel de la portada ya lo hace con su
 *   `IntersectionObserver`).
 */
@Injectable()
export class TabReuseStrategy extends BaseRouteReuseStrategy {
  private readonly guardadas = new Map<Route, DetachedRouteHandle>();

  override shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return esPestana(route) && conBarra();
  }

  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const config = route.routeConfig;
    if (!config) return;
    if (handle) this.guardadas.set(config, handle);
    else this.guardadas.delete(config);
  }

  override shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.routeConfig && this.guardadas.has(route.routeConfig);
  }

  override retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return route.routeConfig ? (this.guardadas.get(route.routeConfig) ?? null) : null;
  }

  /**
   * Destruye las páginas guardadas. Lo llama el shell (`MainLayoutComponent`)
   * al destruirse: las rutas del operador (`/media/control`, `/media/ecran`)
   * van fuera de él, y al ir allí las páginas guardadas quedarían vivas sin
   * nadie que las use (fuga) y, al volver, colgadas de un shell que ya no
   * existe.
   */
  vaciar(): void {
    for (const handle of this.guardadas.values()) {
      // El asa es opaca en la API pública; por dentro lleva su `componentRef`
      // (estable desde Angular 2). Si algún día no está, sólo se suelta.
      (handle as { componentRef?: ComponentRef<unknown> }).componentRef?.destroy();
    }
    this.guardadas.clear();
  }

  /** Páginas guardadas ahora mismo (pruebas y diagnóstico). */
  get tamano(): number {
    return this.guardadas.size;
  }
}

/** ¿Es la ruta hoja de una de las pestañas? */
function esPestana(route: ActivatedRouteSnapshot): boolean {
  const config = route.routeConfig;
  if (!config || (!config.loadComponent && !config.component)) return false;
  // Sólo hojas. El shell (`''` con hijos) también tiene URL «/» y, sin esta
  // condición, se guardaba entero al ir a las rutas del operador.
  if (route.children.length > 0 || config.children || config.loadChildren) return false;
  const url = route.pathFromRoot.flatMap((r) => r.url.map((s) => s.path)).join('/');
  return TAB_URLS.has(normalizar(url));
}

function normalizar(path: string): string {
  return '/' + path.replace(/^\/+|\/+$/g, '');
}

function conBarra(): boolean {
  return typeof matchMedia === 'function' && matchMedia(CON_BARRA).matches;
}
