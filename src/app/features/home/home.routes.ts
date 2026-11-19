import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { HOME_PAGES } from './home.pages';

export const HOME_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(HOME_PAGES.main, {
      pathMatch: 'full',
      loadComponent: () => import('./home.component').then((m) => m.HomeComponent),
    }),
  ],
};
