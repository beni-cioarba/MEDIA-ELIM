import { APP_PATHS, DEPARTMENT_SLUGS, DepartmentId } from '../../core/navigation/app-paths';
import { ModulePage, definePages } from '../../core/modules/module.model';

/** Departamente. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const DEPARTMENTS_PAGES = definePages({
  home: { path: APP_PATHS.departments, seo: { titleKey: 'nav.departments', descriptionKey: 'nav.departments_desc' } },
  // Una página por departamento —no `:slug`— para que cada una lleve su
  // título y su descripción; el componente y el chunk son el mismo.
  ...(Object.fromEntries(
    (Object.keys(DEPARTMENT_SLUGS) as DepartmentId[]).map((id) => [
      id,
      {
        path: `${APP_PATHS.departments}/${DEPARTMENT_SLUGS[id]}`,
        seo: { titleKey: `departments.${id}.name`, descriptionKey: `departments.${id}.tagline` },
      },
    ]),
  ) as Record<DepartmentId, ModulePage>),
});
