import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Panel de control de la proyección. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const PRESENTER_PAGES = definePages({
  main: {
    path: `${APP_PATHS.media}/${APP_PATHS.control}`,
    seo: { titleKey: 'seo.control.title', descriptionKey: 'seo.control.description', noindex: true },
    tool: true,
  },
});
