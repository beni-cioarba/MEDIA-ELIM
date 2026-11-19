import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Portada. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const HOME_PAGES = definePages({
  // La portada no lleva página estática aparte: es el propio `index.html`
  // (el script le pone título, canónica y JSON-LD).
  main: { path: APP_PATHS.home, seo: { titleKey: 'seo.home.title', descriptionKey: 'seo.home.description' }, staticPage: false },
});
