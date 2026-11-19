import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Proiectul Împreună: hoy, un día, el plan y la hoja A4. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
const DAY_SEO = { titleKey: 'seo.impreuna.title', descriptionKey: 'seo.impreuna.description' };

export const IMPREUNA_PAGES = definePages({
  today: { path: APP_PATHS.impreuna, seo: DAY_SEO },
  // Los 365 días tienen página estática: la genera el script desde el plan.
  day: { path: `${APP_PATHS.impreuna}/${APP_PATHS.impreunaDay}/:day`, seo: DAY_SEO },
  plan: { path: `${APP_PATHS.impreuna}/${APP_PATHS.impreunaPlan}`, seo: { titleKey: 'seo.impreuna_plan.title', descriptionKey: 'seo.impreuna_plan.description' } },
  // Hoja imprimible de un mes (`?luna=11`): sin maqueta.
  print: {
    path: `${APP_PATHS.impreuna}/${APP_PATHS.impreunaPrint}`,
    seo: { titleKey: 'seo.impreuna_print.title', descriptionKey: 'seo.impreuna.description', noindex: true },
    tool: true,
  },
});
