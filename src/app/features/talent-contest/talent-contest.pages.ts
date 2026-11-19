import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Talantul în Negoț. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
export const TALENT_CONTEST_PAGES = definePages({
  main: { path: APP_PATHS.talentContest, seo: { titleKey: 'seo.talent_contest.title', descriptionKey: 'seo.talent_contest.description' } },
});
