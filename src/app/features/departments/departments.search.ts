import { DEPARTMENTS, DepartmentConfig } from '../../core/departments.config';
import { departmentPath } from '../../core/navigation/app-paths';
import type { SearchContext, SearchEntry, SearchProvider } from '../../core/search/search.model';
import { loadDepartments } from './departments-translations.resolver';

/**
 * Departamentos: lo que hay **dentro** de cada página (la página en sí ya sale
 * del mapa de rutas): reuniones, actividades y crónicas, cada una con su ancla.
 */
export const DEPARTMENTS_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('departments', loadDepartments);
  return DEPARTMENTS.flatMap((dept) => entriesOf(dept, ctx));
};

function entriesOf(dept: DepartmentConfig, ctx: SearchContext): readonly SearchEntry[] {
  const base = `departments.${dept.id}`;
  const path = departmentPath(dept.id);
  const name = ctx.t(`${base}.name`);
  const altName = ctx.alt(`${base}.name`);

  const about: SearchEntry = {
    id: `${dept.id}:about`,
    kind: 'department',
    title: `${name} · ${ctx.t('departments.about')}`,
    context: ctx.t(`${base}.tagline`),
    path,
    fragment: 'dept-about',
    icon: dept.icon,
    keywords: altName,
    body: [
      ctx.t(`${base}.intro`),
      ...dept.pillars.map((p) => `${ctx.t(`${base}.pillars.${p}.title`)}: ${ctx.t(`${base}.pillars.${p}.text`)}`),
    ].join(' '),
    boost: 0.8,
  };

  const activities = dept.activities.map((activity): SearchEntry => {
    const key = `${base}.activities.${activity.key}`;
    return {
      id: `${dept.id}:activity:${activity.key}`,
      kind: 'department',
      title: ctx.t(`${key}.title`),
      altTitle: ctx.alt(`${key}.title`),
      context: name,
      path,
      fragment: 'dept-activities',
      icon: activity.icon,
      keywords: altName,
      body: ctx.t(`${key}.text`),
      boost: 0.8,
    };
  });

  const modules = dept.modules.flatMap((module): SearchEntry[] => {
    switch (module.kind) {
      case 'weekly':
      case 'monthly': {
        const key = `${base}.${module.kind}.${module.key}`;
        return [
          {
            id: `${dept.id}:meet:${module.key}`,
            kind: 'program',
            title: ctx.t(`${key}.title`),
            altTitle: ctx.alt(`${key}.title`),
            context: [name, ctx.maybe(`${key}.eyebrow`)].filter(Boolean).join(' · '),
            path,
            fragment: `meet-${module.key}`,
            icon: dept.icon,
            keywords: altName,
            body: ctx.maybe(`${key}.lead`) ?? '',
          },
          ...(module.kind === 'weekly' && module.companion === 'youth-meal' ? [mealEntry(dept, ctx)] : []),
        ];
      }
      case 'stories':
        return module.stories.map((story): SearchEntry => {
          const key = `${base}.stories.${story.id}`;
          return {
            id: `${dept.id}:story:${story.id}`,
            kind: 'media',
            title: ctx.t(`${key}.title`),
            altTitle: ctx.alt(`${key}.title`),
            context: [name, story.guest, story.start?.slice(0, 4)].filter(Boolean).join(' · '),
            path,
            fragment: 'stories',
            icon: story.icon,
            keywords: altName,
            body: [ctx.maybe(`${key}.lead`), story.place].filter(Boolean).join(' '),
          };
        });
      default:
        // `events`: ya los aporta `stage.search.ts`.
        return [];
    }
  });

  return [about, ...activities, ...modules];
}

/** La masa de después del programa: su ancla dentro del encuentro de vineri. */
function mealEntry(dept: DepartmentConfig, ctx: SearchContext): SearchEntry {
  const key = `departments.${dept.id}.meal`;
  return {
    id: `${dept.id}:meal`,
    kind: 'department',
    title: ctx.t(`${key}.title`),
    altTitle: ctx.alt(`${key}.title`),
    context: [ctx.t(`departments.${dept.id}.name`), ctx.t(`${key}.kicker`)].join(' · '),
    path: departmentPath(dept.id),
    fragment: 'masa',
    icon: dept.icon,
    keywords: ctx.alt(`departments.${dept.id}.name`),
    body: ctx.t(`${key}.lead`),
    boost: 0.8,
  };
}
