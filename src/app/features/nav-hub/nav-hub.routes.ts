import { ModulePage } from '../../core/modules/module.model';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { NAV_HUB_PAGES } from './nav-hub.pages';

/**
 * Un solo componente y un solo chunk para las tres portadas: lo que cambia es
 * `data.navGroup` (el `id` del grupo de `MAIN_NAV`). Ver `NavHubComponent`.
 */
const hub = (page: ModulePage, group: string) =>
  pageRoute(page, {
    loadComponent: () => import('./nav-hub.component').then((m) => m.NavHubComponent),
    data: { navGroup: group },
  });

export const NAV_HUB_ROUTES: ModuleRoutes = {
  shell: [hub(NAV_HUB_PAGES.church, 'about'), hub(NAV_HUB_PAGES.program, 'program'), hub(NAV_HUB_PAGES.media, 'media')],
};
