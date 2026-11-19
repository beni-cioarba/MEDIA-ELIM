import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Donativos. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const DONATE_PAGES = definePages({
  main: { path: APP_PATHS.donate, seo: { titleKey: 'seo.donate.title', descriptionKey: 'seo.donate.description' } },
});
