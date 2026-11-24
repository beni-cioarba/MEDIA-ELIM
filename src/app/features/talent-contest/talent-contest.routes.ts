import { routePacks } from '../../core/i18n/route-packs';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { TALENT_CONTEST_PAGES } from './talent-contest.pages';

export const TALENT_CONTEST_ROUTES: ModuleRoutes = {
  search: () => import('./talent-contest.search').then((m) => m.TALENT_CONTEST_SEARCH),
  shell: [
    pageRoute(TALENT_CONTEST_PAGES.main, {
      loadComponent: () => import('./talent-contest.component').then((m) => m.TalentContestComponent),
      resolve: { i18n: routePacks('talent-contest') },
    }),
  ],
};
