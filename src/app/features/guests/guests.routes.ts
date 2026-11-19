import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { guestsTranslationsResolver } from './guests-translations.resolver';
import { GUESTS_PAGES } from './guests.pages';

const guests = () => import('./guests.component').then((m) => m.GuestsComponent);
// También usa la historia de «Quiénes somos».
const resolve = { i18n: guestsTranslationsResolver, about: routePacks('about') };

export const GUESTS_ROUTES: ModuleRoutes = {
  bare: [
    pageRoute(GUESTS_PAGES.qr, {
      loadComponent: () => import('./guests-qr/guests-qr.component').then((m) => m.GuestsQrComponent),
      resolve: { i18n: guestsTranslationsResolver },
    }),
  ],
  shell: [
    pageRoute(GUESTS_PAGES.ro, { loadComponent: guests, resolve }),
    pageRoute(GUESTS_PAGES.es, { loadComponent: guests, resolve, data: { lang: 'es' } }),
  ],
};
