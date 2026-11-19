import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Rugăciune pentru familii (fotos y nombres de familias con menores → noindex). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const FAMILY_PRAYER_PAGES = definePages({
  current: { path: APP_PATHS.familyPrayer, seo: { titleKey: 'seo.family_prayer.title', descriptionKey: 'seo.family_prayer.description', noindex: true } },
  // `:week` es el domingo (`YYYY-MM-DD`) de una semana del archivo.
  week: { path: `${APP_PATHS.familyPrayer}/:week`, seo: { titleKey: 'seo.family_prayer.title', descriptionKey: 'seo.family_prayer.description', noindex: true } },
});
