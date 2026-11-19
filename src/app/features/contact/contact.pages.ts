import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Contact. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const CONTACT_PAGES = definePages({
  main: { path: APP_PATHS.contact, seo: { titleKey: 'seo.contact.title', descriptionKey: 'seo.contact.description' } },
});
