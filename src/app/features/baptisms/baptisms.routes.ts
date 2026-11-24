import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { BAPTISMS_PAGES } from './baptisms.pages';

const baptisms = () => import('./baptisms.component').then((m) => m.BaptismsComponent);

export const BAPTISMS_ROUTES: ModuleRoutes = {
  search: () => import('./baptisms.search').then((m) => m.BAPTISMS_SEARCH),
  shell: [
    pageRoute(BAPTISMS_PAGES.home, { loadComponent: baptisms, resolve: { i18n: routePacks('baptisms') } }),
    pageRoute(BAPTISMS_PAGES.date, {
      loadComponent: baptisms,
      resolve: { i18n: routePacks('baptisms') },
      canActivate: [
        (route: ActivatedRouteSnapshot) => {
          const router = inject(Router);
          return import('./baptisms.guards').then((m) => m.baptismExists(route, router));
        },
      ],
    }),
    pageRoute(BAPTISMS_PAGES.candidate, {
      loadComponent: () =>
        import('./candidate-profile/candidate-profile.component').then((m) => m.CandidateProfileComponent),
      resolve: { i18n: routePacks('baptisms') },
      canActivate: [
        (route: ActivatedRouteSnapshot) => {
          const router = inject(Router);
          return import('./baptisms.guards').then((m) => m.candidateExists(route, router));
        },
      ],
    }),
  ],
};
