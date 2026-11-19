import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Guía de estilos viva (herramienta interna). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const STYLEGUIDE_PAGES = definePages({
  main: {
    path: APP_PATHS.styleguide,
    seo: { titleKey: 'seo.styleguide.title', descriptionKey: 'seo.styleguide.description', noindex: true },
    tool: true,
  },
});
