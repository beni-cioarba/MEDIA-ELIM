import { Route, Routes } from '@angular/router';
import { ModulePage, prerenderPaths } from './module.model';

/** Lo que aporta un módulo al mapa de rutas. */
export interface ModuleRoutes {
  /** Páginas dentro de la maqueta (cabecera, pie, dock). */
  readonly shell: Routes;
  /** Fuera de la maqueta: herramientas del operador y hojas de imprimir. */
  readonly bare?: Routes;
}

/**
 * Ruta de Angular de una página de módulo: la ruta y el SEO salen de la
 * página (`<x>.pages.ts`), no se escriben otra vez. Las herramientas llevan
 * `data.preload: false` (ver `PublicPreloadingStrategy`); lo que se
 * prerenderiza va en `data.prerender` (lo lee `app.routes.server.ts`).
 */
export function pageRoute(page: ModulePage, route: Omit<Route, 'path'>): Route {
  const prerender = prerenderPaths(page);
  return {
    ...route,
    path: page.path,
    data: {
      ...route.data,
      seo: page.seo,
      ...(page.tool ? { preload: false } : {}),
      ...(prerender.length ? { prerender } : {}),
    },
  };
}
