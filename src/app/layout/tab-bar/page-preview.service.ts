import { Injectable, Type, inject } from '@angular/core';
import {
  ActivatedRoute,
  Data,
  Params,
  Route,
  Router,
  convertToParamMap,
} from '@angular/router';
import { of } from 'rxjs';

/** Una página lista para montarse fuera del router. */
export interface PreviewPage {
  readonly component: Type<unknown>;
  /** `ActivatedRoute` con los datos y parámetros de esa ruta (ver `routeFor`). */
  readonly route: ActivatedRoute;
}

interface Resolved {
  readonly config: Route;
  readonly params: Params;
}

/**
 * Resuelve una URL de pestaña a **su componente real** y a un
 * `ActivatedRoute` equivalente, para montar la página vecina como vista
 * previa mientras se arrastra (`SwipePeekComponent`).
 *
 * ── Por qué la página real y no un esqueleto ──────────────────────────
 * Un esqueleto genérico no coincide nunca con cinco páginas distintas y el
 * salto se nota al soltar. Montando el mismo componente con los mismos datos,
 * lo que asoma **es** lo que se abre: el paso es continuo.
 *
 * ── Coste ─────────────────────────────────────────────────────────────
 * El router ya precarga todas las rutas (`PreloadAllModules`), y `warm()`
 * resuelve los componentes de las pestañas vecinas en reposo tras cada
 * navegación: al empezar el arrastre el componente está en memoria y se
 * monta en el mismo fotograma. La vista previa sólo existe mientras dura el
 * gesto.
 */
@Injectable({ providedIn: 'root' })
export class PagePreviewService {
  private readonly router = inject(Router);
  private readonly components = new Map<Route, Type<unknown>>();

  /** La página de esa URL si su componente ya está cargado; si no, `null`. */
  pageFor(url: string): PreviewPage | null {
    const resolved = this.resolve(url);
    if (!resolved) return null;
    const component = this.components.get(resolved.config) ?? resolved.config.component ?? null;
    return component ? { component, route: this.routeFor(resolved) } : null;
  }

  /** Carga en reposo los componentes de esas URLs (idempotente). */
  warm(urls: readonly string[]): void {
    for (const url of urls) {
      const resolved = this.resolve(url);
      const load = resolved?.config.loadComponent;
      if (!resolved || !load || this.components.has(resolved.config)) continue;
      void Promise.resolve(load()).then((loaded) => {
        const type = (loaded as { default?: Type<unknown> }).default ?? (loaded as Type<unknown>);
        this.components.set(resolved.config, type);
      });
    }
  }

  /**
   * Busca la ruta hija del shell que casa con la URL, en el orden del router
   * (la primera gana, como en el router). Sólo hace falta lo que usa la
   * tabla de rutas: segmentos fijos y `:parámetros`.
   */
  private resolve(url: string): Resolved | null {
    const shell = this.router.config.find((route) => route.path === '' && route.children);
    const segments = url.split(/[?#]/)[0]!.split('/').filter(Boolean);
    for (const config of shell?.children ?? []) {
      if (config.redirectTo !== undefined || config.path === '**' || config.path === undefined) continue;
      if (!config.loadComponent && !config.component) continue;
      const pattern = config.path.split('/').filter(Boolean);
      if (pattern.length !== segments.length) continue;
      const params: Params = {};
      const ok = pattern.every((part, i) => {
        if (part.startsWith(':')) {
          params[part.slice(1)] = segments[i];
          return true;
        }
        return part === segments[i];
      });
      if (ok) return { config, params };
    }
    return null;
  }

  /**
   * `ActivatedRoute` para la vista previa: el raíz real del router, con los
   * datos y parámetros de la ruta vecina por encima.
   *
   * Se hereda del raíz (`Object.create`) y no se inventa uno desde cero
   * porque los `routerLink` de la página lo usan como punto de partida para
   * construir sus URL, y necesitan el árbol real. Todos los enlaces de la app
   * son absolutos, así que partir del raíz los resuelve igual.
   */
  private routeFor({ config, params }: Resolved): ActivatedRoute {
    const root = this.router.routerState.root;
    const data: Data = config.data ?? {};
    const paramMap = convertToParamMap(params);
    const queryParamMap = convertToParamMap({});

    const snapshot = Object.create(root.snapshot, {
      data: { value: data },
      params: { value: params },
      paramMap: { value: paramMap },
      queryParams: { value: {} },
      queryParamMap: { value: queryParamMap },
      fragment: { value: null },
    });

    return Object.create(root, {
      snapshot: { value: snapshot },
      data: { value: of(data) },
      params: { value: of(params) },
      paramMap: { value: of(paramMap) },
      queryParams: { value: of({}) },
      queryParamMap: { value: of(queryParamMap) },
      fragment: { value: of(null) },
    }) as ActivatedRoute;
  }
}
