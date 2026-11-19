import { Route } from '@angular/router';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { ModuleRoutes, pageRoute } from '../../core/modules/page-route';
import { STAGE_PAGES } from './stage.pages';

const stage: Route['loadComponent'] = () => import('./stage.component').then((m) => m.StageComponent);

/** Bloques que en la web tienen su propia sección: `/media/<slug>` lleva allí. */
const redirect = (slug: string, to: string): Route => ({ path: `${APP_PATHS.media}/${slug}`, redirectTo: to });

export const STAGE_ROUTES: ModuleRoutes = {
  // Va antes de la maqueta: `media/:blockId` la capturaría como un bloque.
  bare: [
    pageRoute(STAGE_PAGES.projection, {
      loadComponent: () => import('./projection/projection.component').then((m) => m.ProjectionComponent),
    }),
  ],
  shell: [
    pageRoute(STAGE_PAGES.panel, { loadComponent: stage }),
    // Las redirecciones, ANTES de `:blockId` (el router prueba en orden).
    redirect(APP_PATHS.announcements, APP_PATHS.announcements),
    redirect(APP_PATHS.familyPrayer, APP_PATHS.familyPrayer),
    // La diapositiva del QR sólo tiene sentido proyectada.
    redirect('site', APP_PATHS.home),
    redirect(APP_PATHS.prayerCauses, APP_PATHS.prayerCauses),
    redirect(APP_PATHS.talentContest, APP_PATHS.talentContest),
    redirect(APP_PATHS.impreuna, APP_PATHS.impreuna),
    // Un bloque como página (`/media/galerie`…): mismo componente y chunk.
    pageRoute(STAGE_PAGES.block, { loadComponent: stage }),
  ],
};
