import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Botezuri: portada, un botez y el perfil de cada candidato (hay menores → noindex). Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
const BAPTISMS_SEO = { titleKey: 'seo.baptisms.title', descriptionKey: 'seo.baptisms.description', noindex: true };

export const BAPTISMS_PAGES = definePages({
  home: { path: APP_PATHS.baptisms, seo: BAPTISMS_SEO },
  date: { path: `${APP_PATHS.baptisms}/:date`, seo: BAPTISMS_SEO },
  candidate: { path: `${APP_PATHS.baptisms}/:date/:candidate`, seo: BAPTISMS_SEO },
});
