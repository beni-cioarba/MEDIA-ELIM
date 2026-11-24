import { legalTranslationsResolver } from './legal-translations.resolver';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { LEGAL_PAGES } from './legal.pages';

export const LEGAL_ROUTES: ModuleRoutes = {
  search: () => import('./legal.search').then((m) => m.LEGAL_SEARCH),
  shell: [
    pageRoute(LEGAL_PAGES.main, {
      loadComponent: () => import('./legal.component').then((m) => m.LegalComponent),
      resolve: { i18n: legalTranslationsResolver },
    }),
  ],
};
