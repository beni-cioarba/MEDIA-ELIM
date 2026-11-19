import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { ANNOUNCEMENTS_PAGES } from './announcements.pages';

const component = () => import('./announcements.component').then((m) => m.AnnouncementsComponent);

export const ANNOUNCEMENTS_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(ANNOUNCEMENTS_PAGES.list, { loadComponent: component }),
    pageRoute(ANNOUNCEMENTS_PAGES.one, { loadComponent: component }),
  ],
};
