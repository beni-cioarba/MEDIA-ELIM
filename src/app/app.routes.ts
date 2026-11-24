import { Routes } from '@angular/router';
import { ModuleRoutes } from './core/modules/page-route';
import type { SearchSource } from './core/search/search.model';
import { ABOUT_ROUTES } from './features/about/about.routes';
import { ANNOUNCEMENTS_ROUTES } from './features/announcements/announcements.routes';
import { BAPTISMS_ROUTES } from './features/baptisms/baptisms.routes';
import { CONTACT_ROUTES } from './features/contact/contact.routes';
import { CREDO_ROUTES } from './features/credo/credo.routes';
import { DEPARTMENTS_ROUTES } from './features/departments/departments.routes';
import { DONATE_ROUTES } from './features/donate/donate.routes';
import { FAMILY_PRAYER_ROUTES } from './features/family-prayer/family-prayer.routes';
import { FAQ_ROUTES } from './features/faq/faq.routes';
import { GUESTS_ROUTES } from './features/guests/guests.routes';
import { HOME_ROUTES } from './features/home/home.routes';
import { IMPREUNA_ROUTES } from './features/impreuna/impreuna.routes';
import { LEADERSHIP_ROUTES } from './features/leadership/leadership.routes';
import { LEGAL_ROUTES } from './features/legal/legal.routes';
import { NAV_HUB_ROUTES } from './features/nav-hub/nav-hub.routes';
import { PRAYER_CAUSES_ROUTES } from './features/prayer-causes/prayer-causes.routes';
import { PRESENTER_ROUTES } from './features/presenter/presenter.routes';
import { STAGE_ROUTES } from './features/stage/stage.routes';
import { STYLEGUIDE_ROUTES } from './features/styleguide/styleguide.routes';
import { TALENT_CONTEST_ROUTES } from './features/talent-contest/talent-contest.routes';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

/**
 * Los módulos de la web, **una línea cada uno**.
 *
 * Cada módulo declara sus páginas en `features/<x>/<x>.pages.ts` (ruta y SEO,
 * datos puros) y sus rutas en `<x>.routes.ts` (componente perezoso,
 * resolvers, guardas). De las páginas salen también las páginas estáticas,
 * el sitemap y el robots.txt del despliegue (`scripts/generate-route-pages.mjs`
 * las lee directamente). Módulo nuevo: `node scripts/new-module.mjs <id>` y
 * añadirlo aquí. Ver `docs/ai/10-architecture.md`.
 *
 * El orden sólo importa dentro de cada módulo (el router prueba en orden: las
 * redirecciones de `/media/<x>` van antes de `/media/:blockId`, y así).
 */
const MODULES: readonly ModuleRoutes[] = [
  HOME_ROUTES,
  NAV_HUB_ROUTES,
  ABOUT_ROUTES,
  CREDO_ROUTES,
  LEADERSHIP_ROUTES,
  DEPARTMENTS_ROUTES,
  ANNOUNCEMENTS_ROUTES,
  STAGE_ROUTES,
  PRESENTER_ROUTES,
  FAMILY_PRAYER_ROUTES,
  PRAYER_CAUSES_ROUTES,
  BAPTISMS_ROUTES,
  TALENT_CONTEST_ROUTES,
  IMPREUNA_ROUTES,
  GUESTS_ROUTES,
  FAQ_ROUTES,
  CONTACT_ROUTES,
  DONATE_ROUTES,
  LEGAL_ROUTES,
  STYLEGUIDE_ROUTES,
];

/**
 * Lo que cada módulo aporta al buscador, perezoso (`SEARCH_SOURCES`). El id es
 * el de su primera página: sólo sirve de prefijo y para el registro de errores.
 */
export const APP_SEARCH_SOURCES: readonly SearchSource[] = MODULES.flatMap((module) =>
  module.search ? [{ id: module.shell[0]?.path ?? '', load: module.search }] : [],
);

/**
 * Mapa de rutas: primero lo que va **sin maqueta** (panel de control, ventana
 * de proyección, hojas de imprimir: herramientas que no llevan cabecera ni
 * pie), después todas las páginas dentro de `MainLayoutComponent` —lo único
 * eager— y, al final, la página «no encontrada».
 */
export const APP_ROUTES: Routes = [
  ...MODULES.flatMap((module) => module.bare ?? []),
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      ...MODULES.flatMap((module) => module.shell),
      {
        // Cualquier dirección desconocida: GitHub Pages sirve `404.html`
        // (= `index.html`) con estado 404 y el router acaba aquí.
        path: '**',
        loadComponent: () => import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
        data: {
          seo: { titleKey: 'seo.not_found.title', descriptionKey: 'seo.not_found.description', noindex: true },
        },
      },
    ],
  },
];
