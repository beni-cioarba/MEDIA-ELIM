import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Anunțuri: la lista y un anuncio (enlace para compartir). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const ANNOUNCEMENTS_PAGES = definePages({
  list: { path: APP_PATHS.announcements, seo: { titleKey: 'seo.announcements.title', descriptionKey: 'seo.announcements.description' } },
  // Una página estática por anuncio: la genera el script desde los datos.
  one: { path: `${APP_PATHS.announcements}/:id`, seo: { titleKey: 'seo.announcements.title', descriptionKey: 'seo.announcements.description' } },
});
