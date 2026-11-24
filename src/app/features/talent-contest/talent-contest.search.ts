import { inject } from '@angular/core';
import { routePackLoader } from '../../core/i18n/route-packs';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { ScheduleService } from '../../core/services/schedule.service';
import { CONTEST_CATEGORIES } from '../../core/talent-contest.categories';
import { TALENT_CONTEST } from '../../core/talent-contest.config';

/**
 * Talantul în Negoț: fases, categorías (con sus libros y versículos) y
 * materiales. Sin las personas de contacto ni sus teléfonos.
 */
export const TALENT_CONTEST_SEARCH: SearchProvider = async (ctx) => {
  const schedule = inject(ScheduleService);
  await ctx.pack('talent-contest', routePackLoader('talent-contest'));
  const path = `/${APP_PATHS.talentContest}`;
  const name = ctx.t('nav.talent_contest');
  const params = { edition: TALENT_CONTEST.edition, passage: TALENT_CONTEST.memorization };

  const phases = TALENT_CONTEST.phases.map(
    (phase): SearchEntry => ({
      id: `phase:${phase.id}`,
      kind: 'event',
      title: `${name} · ${ctx.t(`talent_contest.phases.${phase.id}`)}`,
      context: schedule.formatEventDate(phase.start),
      path,
      icon: 'trophy',
      keywords: ctx.alt(`talent_contest.phases.${phase.id}`),
      body: ctx.t(`talent_contest.phases.${phase.id}_desc`),
      boost: 0.8,
    }),
  );

  const categories = CONTEST_CATEGORIES.map(
    (category): SearchEntry => ({
      id: `category:${category.id}`,
      kind: 'bible',
      title: `${ctx.t(`talent_contest.categories.${category.id}.name`)} · ${category.books.join(', ')}`,
      context: `${name} · ${ctx.t('talent_contest.category.title')}`,
      path,
      queryParams: { categoria: category.id },
      fragment: 'categorii',
      icon: 'book',
      keywords: ctx.alt(`talent_contest.categories.${category.id}.name`),
      body: category.verses.map((verse) => `${verse.ref}: ${verse.text}`).join(' '),
      boost: 0.6,
    }),
  );

  const resources = TALENT_CONTEST.resources.map((resource): SearchEntry => {
    const key = `talent_contest.resources.${resource.id}`;
    return {
      id: `resource:${resource.id}`,
      kind: 'help',
      title: ctx.t(key, params),
      altTitle: ctx.alt(key, params),
      context: `${name} · ${ctx.t('talent_contest.resources.title')}`,
      path,
      icon: 'file-text',
      body: ctx.t(`${key}_desc`, params),
      boost: 0.7,
    };
  });

  return [...phases, ...categories, ...resources];
};
