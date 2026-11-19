import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { CONTACT_PAGES } from './contact.pages';

export const CONTACT_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(CONTACT_PAGES.main, {
      loadComponent: () => import('./contact.component').then((m) => m.ContactComponent),
    }),
  ],
};
