import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { DONATE_PAGES } from './donate.pages';

export const DONATE_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(DONATE_PAGES.main, {
      loadComponent: () => import('./donate.component').then((m) => m.DonateComponent),
      resolve: { i18n: routePacks('donate') },
    }),
  ],
};
