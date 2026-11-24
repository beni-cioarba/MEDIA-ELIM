import { routePackLoader } from '../../core/i18n/route-packs';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { STORY_ERAS } from './public/about-story.data';

/** La historia de la iglesia, por etapas. */
export const ABOUT_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('about', routePackLoader('about'));
  return STORY_ERAS.map((era): SearchEntry => {
    const key = `about.story.eras.${era.id}`;
    return {
      id: `era:${era.id}`,
      kind: 'belief',
      title: ctx.t(`${key}.title`),
      altTitle: ctx.alt(`${key}.title`),
      context: `${ctx.t('nav.about_us')} · ${ctx.t('about.story.title')}`,
      path: `/${APP_PATHS.about}`,
      fragment: 'timeline-title',
      icon: 'users',
      keywords: ctx.alt('about.story.title'),
      body: [ctx.t(`${key}.summary`), ...era.milestones.map((m) => ctx.t(`${key}.milestones.${m.id}`))].join('. '),
      boost: 0.8,
    };
  });
};
