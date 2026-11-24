import { GUEST_FAQ } from '../../core/guests.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { loadGuests } from './guests-translations.resolver';

/**
 * Las preguntas de quien viene por primera vez (¿hay aparcamiento?, ¿en qué
 * idioma?). La página está fuera del menú, pero son justo las dudas que se
 * escriben en un buscador.
 */
export const GUESTS_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('guests', loadGuests);
  return GUEST_FAQ.map(
    (id): SearchEntry => ({
      id: `faq:${id}`,
      kind: 'help',
      title: ctx.t(`guests.faq.${id}.q`),
      altTitle: ctx.alt(`guests.faq.${id}.q`),
      context: ctx.t('guests.sections.faq.title'),
      path: `/${APP_PATHS.guests}`,
      fragment: 'gst-faq',
      icon: 'info',
      keywords: [ctx.maybe(`search.faq.${id}`) ?? '', ctx.alt(`search.faq.${id}`)],
      // `name` (a quién llamar) es el pastor: no aporta a la búsqueda.
      body: ctx.t(`guests.faq.${id}.a`, { name: '' }),
    }),
  );
};
