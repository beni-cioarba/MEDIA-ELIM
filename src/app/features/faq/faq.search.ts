import { inject } from '@angular/core';
import { FAQ_GROUPS } from '../../core/faq.config';
import { routePackLoader } from '../../core/i18n/route-packs';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { FaqParamsService } from './public/faq-params.service';

/** Cada pregunta (¿hay aparcamiento?, ¿en qué idioma?): lleva a ella, ya abierta. */
export const FAQ_SEARCH: SearchProvider = async (ctx) => {
  const params = inject(FaqParamsService).params();
  await ctx.pack('faq', routePackLoader('faq'));
  return FAQ_GROUPS.flatMap((group) =>
    group.items.map(
      ({ id }): SearchEntry => ({
        id,
        kind: 'help',
        title: ctx.t(`faq.items.${id}.q`),
        altTitle: ctx.alt(`faq.items.${id}.q`),
        context: ctx.t(`faq.groups.${group.id}`),
        path: `/${APP_PATHS.faq}`,
        fragment: id,
        icon: 'help',
        keywords: [ctx.t(`faq.items.${id}.k`), ctx.alt(`faq.items.${id}.k`)],
        // `name` es el pastor: quien lo busca quiere su ficha, no una pregunta.
        body: ctx.t(`faq.items.${id}.a`, { ...params, name: '' }),
      }),
    ),
  );
};
