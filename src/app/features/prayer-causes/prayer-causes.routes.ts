import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { PRAYER_CAUSES_PAGES } from './prayer-causes.pages';

export const PRAYER_CAUSES_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(PRAYER_CAUSES_PAGES.main, {
      loadComponent: () => import('./prayer-causes.component').then((m) => m.PrayerCausesComponent),
    }),
  ],
};
