import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Conducere: directorio y perfil propio. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const LEADERSHIP_PAGES = definePages({
  main: { path: APP_PATHS.leadership, seo: { titleKey: 'seo.leadership.title', descriptionKey: 'seo.leadership.description' } },
  // Sólo quien tiene perfil (`PERSON_PROFILES`); sus páginas estáticas salen de los datos.
  profile: { path: `${APP_PATHS.leadership}/:id`, seo: { titleKey: 'seo.leadership.title', descriptionKey: 'seo.leadership.description' } },
});
