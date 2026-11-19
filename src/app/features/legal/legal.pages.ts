import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Informații legale și confidențialitate. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const LEGAL_PAGES = definePages({
  main: { path: APP_PATHS.legal, seo: { titleKey: 'seo.legal.title', descriptionKey: 'seo.legal.description' } },
});
