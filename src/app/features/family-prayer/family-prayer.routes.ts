import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { FAMILY_PRAYER_PAGES } from './family-prayer.pages';

const component = () => import('./family-prayer.component').then((m) => m.FamilyPrayerComponent);

export const FAMILY_PRAYER_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(FAMILY_PRAYER_PAGES.current, { loadComponent: component }),
    pageRoute(FAMILY_PRAYER_PAGES.week, { loadComponent: component }),
  ],
};
