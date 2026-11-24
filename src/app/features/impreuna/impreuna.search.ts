import { formatReading } from '../../core/bible/bible-refs';
import { PLAN_DAYS } from '../../core/impreuna/impreuna-edition';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { parseIsoDate } from '../../core/util/iso-date';

/**
 * Proiectul Împreună: los días del plan, para encontrar cuándo se lee un libro
 * («Geneza», «Salmos 23») o abrir un día. Pesan poco: son cientos, y quien
 * escribe «Ioan» puede buscar también a una persona.
 */
export const IMPREUNA_SEARCH: SearchProvider = (ctx) => {
  const other = ctx.lang === 'ro' ? 'es' : 'ro';
  const date = new Intl.DateTimeFormat(ctx.lang, { day: 'numeric', month: 'long' });
  return PLAN_DAYS.map(
    (day): SearchEntry => ({
      id: String(day.day),
      kind: 'bible',
      title: formatReading(day.refs, ctx.lang),
      altTitle: formatReading(day.refs, other),
      context: `${ctx.t('nav.impreuna')} · ${ctx.t('search.ctx.day', { n: day.day })} · ${date.format(parseIsoDate(day.date))}`,
      path: `/${APP_PATHS.impreuna}/${APP_PATHS.impreunaDay}/${day.day}`,
      icon: 'book-open',
      boost: 0.5,
    }),
  );
};
