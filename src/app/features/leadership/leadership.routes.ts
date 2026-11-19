import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { LEADERSHIP_PAGES } from './leadership.pages';

export const LEADERSHIP_ROUTES: ModuleRoutes = {
  shell: [
    pageRoute(LEADERSHIP_PAGES.main, {
      loadComponent: () => import('./leadership.component').then((m) => m.LeadershipComponent),
      resolve: { i18n: routePacks('leadership') },
      // `/conducere#<id>` (ficha antigua en diálogo) → perfil de la persona.
      canActivate: [
        (route: ActivatedRouteSnapshot) => {
          const router = inject(Router);
          return import('./leadership.guards').then((m) => m.legacyPersonAnchor(route, router));
        },
      ],
    }),
    pageRoute(LEADERSHIP_PAGES.profile, {
      loadComponent: () => import('./person-profile/person-profile.component').then((m) => m.PersonProfileComponent),
      resolve: { i18n: routePacks('leadership') },
      // Sin perfil → al directorio filtrado por su nombre, antes de pintar.
      canActivate: [
        (route: ActivatedRouteSnapshot) => {
          const router = inject(Router);
          return import('./leadership.guards').then((m) => m.personHasProfile(route, router));
        },
      ],
    }),
  ],
};
