import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { PRESENTER_PAGES } from './presenter.pages';

export const PRESENTER_ROUTES: ModuleRoutes = {
  shell: [],
  // Sin maqueta, y antes que ella (`media/:blockId` lo capturaría).
  bare: [
    pageRoute(PRESENTER_PAGES.main, {
      loadComponent: () => import('./presenter.component').then((m) => m.PresenterComponent),
      resolve: { i18n: routePacks('presenter') },
    }),
  ],
};
