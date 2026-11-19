import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { impreunaTranslationsResolver } from './impreuna-translations.resolver';
import { IMPREUNA_PAGES } from './impreuna.pages';

/** Hoy y un día comparten componente y chunk. */
const day = () => import('./impreuna.component').then((m) => m.ImpreunaComponent);
const resolve = { i18n: impreunaTranslationsResolver };

export const IMPREUNA_ROUTES: ModuleRoutes = {
  bare: [
    pageRoute(IMPREUNA_PAGES.print, {
      loadComponent: () => import('./impreuna-print/impreuna-print.component').then((m) => m.ImpreunaPrintComponent),
      resolve,
    }),
  ],
  shell: [
    pageRoute(IMPREUNA_PAGES.today, { loadComponent: day, resolve }),
    pageRoute(IMPREUNA_PAGES.day, { loadComponent: day, resolve }),
    pageRoute(IMPREUNA_PAGES.plan, {
      loadComponent: () => import('./impreuna-plan/impreuna-plan.component').then((m) => m.ImpreunaPlanComponent),
      resolve,
    }),
  ],
};
