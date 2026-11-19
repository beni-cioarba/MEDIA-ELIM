import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Portadas de sección de los grupos del menú. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const NAV_HUB_PAGES = definePages({
  church: { path: APP_PATHS.churchHub, seo: { titleKey: 'nav.about', descriptionKey: 'nav.about_desc' } },
  program: { path: APP_PATHS.programHub, seo: { titleKey: 'nav.program', descriptionKey: 'nav.program_desc' } },
  media: { path: APP_PATHS.mediaHub, seo: { titleKey: 'nav.media', descriptionKey: 'nav.media_desc' } },
});
