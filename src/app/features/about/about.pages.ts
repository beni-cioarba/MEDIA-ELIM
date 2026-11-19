import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Cine suntem. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const ABOUT_PAGES = definePages({
  main: { path: APP_PATHS.about, seo: { titleKey: 'seo.about.title', descriptionKey: 'seo.about.description' } },
});
