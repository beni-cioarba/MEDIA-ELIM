import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { STYLEGUIDE_PAGES } from './styleguide.pages';

export const STYLEGUIDE_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(STYLEGUIDE_PAGES.main, {
      loadComponent: () => import('./styleguide.component').then((m) => m.StyleguideComponent),
    }),
  ],
};
