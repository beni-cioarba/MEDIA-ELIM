import { DEPARTMENT_SLUGS, DepartmentId } from '../../core/navigation/app-paths';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { DEPARTMENTS_PAGES } from './departments.pages';
import { departmentsTranslationsResolver } from './departments-translations.resolver';

export const DEPARTMENTS_ROUTES: ModuleRoutes = {
  search: () => import('./departments.search').then((m) => m.DEPARTMENTS_SEARCH),
  shell: [
    pageRoute(DEPARTMENTS_PAGES.home, {
      loadComponent: () =>
        import('./departments-home/departments-home.component').then((m) => m.DepartmentsHomeComponent),
      resolve: { i18n: departmentsTranslationsResolver },
    }),
    // El componente lee `data.department` (`DEPARTMENT_ROUTE_KEY`).
    ...(Object.keys(DEPARTMENT_SLUGS) as DepartmentId[]).map((id) =>
      pageRoute(DEPARTMENTS_PAGES[id], {
        loadComponent: () =>
          import('./department-page/department-page.component').then((m) => m.DepartmentPageComponent),
        resolve: { i18n: departmentsTranslationsResolver },
        data: { department: id },
      }),
    ),
  ],
};
