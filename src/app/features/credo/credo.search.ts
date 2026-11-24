import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { loadCredoArticles } from './credo-translations.resolver';
import { CREDO_ANCHOR, CREDO_PARTS } from './public/credo.data';

/** Los artículos de la confesión de fe, cada uno con su ancla. */
export const CREDO_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('credo-articles', loadCredoArticles);
  return CREDO_PARTS.flatMap((part) =>
    part.articles.map((article): SearchEntry => {
      const key = `credo.articles.${article.id}`;
      return {
        id: article.id,
        kind: 'belief',
        title: ctx.t(`${key}.short`),
        altTitle: ctx.alt(`${key}.short`),
        context: `${ctx.t('nav.credo')} · ${ctx.t('search.ctx.article', { n: article.n })}`,
        path: `/${APP_PATHS.credo}`,
        fragment: CREDO_ANCHOR + article.id,
        icon: part.icon,
        body: [ctx.t(`${key}.title`), ctx.t(`${key}.body`), ctx.t(`${key}.refs`)].join(' '),
      };
    }),
  );
};
