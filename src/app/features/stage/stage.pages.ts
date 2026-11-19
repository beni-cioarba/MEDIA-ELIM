import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Media: el panel completo, un bloque por URL y la ventana de proyección. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
/**
 * Bloques con página propia en la web (`/media/<slug>`). Los demás bloques
 * redirigen a su sección (anuncios, familias, causas, concurso, Împreună).
 */
const WEB_BLOCK_SLUGS = ['program', 'evenimente', 'citirea-bibliei', 'galerie', 'retele', 'transmisiuni', 'locatie'] as const;

export const STAGE_PAGES = definePages({
  panel: { path: APP_PATHS.media, seo: { titleKey: 'seo.media.title', descriptionKey: 'seo.media.description' } },
  // Título y descripción propios de cada bloque (`seo.block.<slug>`): con los
  // genéricos de Media, siete páginas compartían título y Google las trataba
  // como duplicadas.
  block: {
    path: `${APP_PATHS.media}/:blockId`,
    seo: {
      titleKey: 'seo.block.:blockId.title',
      descriptionKey: 'seo.block.:blockId.description',
      fallback: { titleKey: 'seo.media.title', descriptionKey: 'seo.media.description' },
    },
    staticPage: {
      expand: WEB_BLOCK_SLUGS.map((slug) => ({
        path: `${APP_PATHS.media}/${slug}`,
        seo: { titleKey: `seo.block.${slug}.title`, descriptionKey: `seo.block.${slug}.description` },
      })),
    },
  },
  // Ventana de proyección / vista previa (`?rol=preview`): sin maqueta.
  projection: {
    path: `${APP_PATHS.media}/${APP_PATHS.projection}`,
    seo: { titleKey: 'seo.projection.title', descriptionKey: 'seo.projection.description', noindex: true },
    tool: true,
  },
});
