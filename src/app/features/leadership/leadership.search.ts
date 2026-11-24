import { routePackLoader } from '../../core/i18n/route-packs';
import { hasProfile, storyOf } from '../../core/leadership-profiles.config';
import { PEOPLE_IN_ORDER, PersonId, SERVICE_AREAS, personTier } from '../../core/leadership.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { PEOPLE_VIEW_PARAM } from './public/leadership.view';

/** Quien pregunta por «pastor» busca al pastor antes que a quien lo ayuda. */
const TIER_BOOST = { pastor: 1.3, assistant: 1.2, leader: 1.05, member: 1 } as const;

/** Cabecera del directorio dentro de la página. */
const DIRECTORY_ANCHOR = 'dir-title';

/**
 * Conducere: las personas del organigrama (página pública e indexable: son
 * quienes sirven en la iglesia) y sus departamentos.
 *
 * Quien tiene perfil lleva a su página; quien no, al directorio filtrado por
 * su nombre, que es lo mismo que hace la guarda de `/conducere/<id>`.
 */
export const LEADERSHIP_SEARCH: SearchProvider = async (ctx) => {
  await ctx.pack('leadership', routePackLoader('leadership'));
  const base = `/${APP_PATHS.leadership}`;

  const people = PEOPLE_IN_ORDER.map((person): SearchEntry => {
    const id = person.id as PersonId;
    const keys = [
      ...(person.titles ?? []).map((title) => `leadership.titles.${title}`),
      ...person.postings.filter((p) => p.areaKey !== null).map((p) => `leadership.departments.${p.departmentKey}`),
    ].filter((key, i, all) => all.indexOf(key) === i);
    const story = storyOf(id);
    return {
      id: `person:${id}`,
      kind: 'people',
      title: person.name,
      context: keys.map((key) => ctx.t(key)).join(' · '),
      ...(hasProfile(id)
        ? { path: `${base}/${id}` }
        : { path: base, queryParams: { vista: PEOPLE_VIEW_PARAM, q: person.name }, fragment: DIRECTORY_ANCHOR }),
      icon: 'users',
      keywords: keys.map((key) => ctx.alt(key)),
      body: [story?.summary, ...(story?.bio ?? []), ...(story?.sections ?? []).map((s) => `${s.title}. ${s.body}`)]
        .filter(Boolean)
        .join(' '),
      boost: TIER_BOOST[personTier(person)],
    };
  });

  const departments = SERVICE_AREAS.flatMap((area) =>
    area.departments.map((department): SearchEntry => {
      const key = `leadership.departments.${department.i18nKey}`;
      return {
        id: `department:${department.id}`,
        kind: 'department',
        title: ctx.t(key),
        altTitle: ctx.alt(key),
        context: `${ctx.t('nav.leadership')} · ${ctx.t(`leadership.areas.${area.i18nKey}.name`)}`,
        path: base,
        queryParams: { q: ctx.t(key) },
        fragment: DIRECTORY_ANCHOR,
        icon: area.icon,
        keywords: ctx.alt(`leadership.areas.${area.i18nKey}.name`),
        boost: 0.85,
      };
    }),
  );

  return [...people, ...departments];
};
