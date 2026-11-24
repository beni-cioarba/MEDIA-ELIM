import { APP_PATHS } from '../../core/navigation/app-paths';
import { PRAYER_CAUSES } from '../../core/prayer-causes.config';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';

/**
 * Causas de oración **por intención** («România», «Tineretul bisericii»).
 *
 * Las que son por personas («Vindecare»: enfermos, por su nombre) no se
 * indexan, ni el nombre de nadie: son datos de salud, y un buscador los
 * convertiría en «escribe un nombre y mira qué le pasa».
 */
export const PRAYER_CAUSES_SEARCH: SearchProvider = (ctx) =>
  PRAYER_CAUSES.causes
    .filter((cause) => !cause.people?.length)
    .map(
      (cause): SearchEntry => ({
        id: cause.id,
        kind: 'prayer',
        title: cause.title,
        context: ctx.t('nav.prayer_causes'),
        path: `/${APP_PATHS.prayerCauses}`,
        icon: 'pray',
        keywords: ctx.alt('nav.prayer_causes'),
        body: cause.intent,
        boost: 0.9,
      }),
    );
