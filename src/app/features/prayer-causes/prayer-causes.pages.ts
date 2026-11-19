import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Cauzele Bisericii Elim (nombres de enfermos → noindex). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const PRAYER_CAUSES_PAGES = definePages({
  main: { path: APP_PATHS.prayerCauses, seo: { titleKey: 'seo.prayer_causes.title', descriptionKey: 'seo.prayer_causes.description', noindex: true } },
});
