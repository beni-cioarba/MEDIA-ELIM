import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Mărturisirea de credință (el texto de los 30 artículos viaja en su paquete). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const CREDO_PAGES = definePages({
  main: { path: APP_PATHS.credo, seo: { titleKey: 'seo.credo.title', descriptionKey: 'seo.credo.description' } },
});
