import { credoTranslationsResolver } from './credo-translations.resolver';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { CREDO_PAGES } from './credo.pages';

export const CREDO_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(CREDO_PAGES.main, {
      loadComponent: () => import('./credo.component').then((m) => m.CredoComponent),
      resolve: { i18n: credoTranslationsResolver },
    }),
  ],
};
