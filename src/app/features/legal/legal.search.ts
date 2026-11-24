import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { loadLegal } from './legal-translations.resolver';

/** Apartados de «Informații legale» con ancla propia (`lg-<id>`). */
const SECTIONS = ['who', 'data', 'services', 'people', 'rights'] as const;

export const LEGAL_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('legal', loadLegal);
  return SECTIONS.map(
    (id): SearchEntry => ({
      id,
      kind: 'help',
      title: ctx.t(`legal.${id}.title`),
      altTitle: ctx.alt(`legal.${id}.title`),
      context: ctx.t('legal.title'),
      path: `/${APP_PATHS.legal}`,
      fragment: `lg-${id}`,
      icon: 'file-text',
      body: [ctx.maybe(`legal.${id}.lead`), ctx.maybe(`legal.${id}.body`)].filter(Boolean).join(' '),
      boost: 0.7,
    }),
  );
};
