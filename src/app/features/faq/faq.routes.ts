import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { FAQ_PAGES } from './faq.pages';

export const FAQ_ROUTES: ModuleRoutes = {
  search: () => import('./faq.search').then((m) => m.FAQ_SEARCH),
  shell: [
    pageRoute(FAQ_PAGES.main, {
      loadComponent: () => import('./faq.component').then((m) => m.FaqComponent),
      resolve: { i18n: routePacks('faq') },
    }),
  ],
};
