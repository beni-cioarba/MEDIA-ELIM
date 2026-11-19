import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { ABOUT_PAGES } from './about.pages';

export const ABOUT_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(ABOUT_PAGES.main, {
      loadComponent: () => import('./about.component').then((m) => m.AboutComponent),
      resolve: { i18n: routePacks('about') },
    }),
  ],
};
