import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Întrebări frecvente. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const FAQ_PAGES = definePages({
  main: { path: APP_PATHS.faq, seo: { titleKey: 'seo.faq.title', descriptionKey: 'seo.faq.description' } },
});
