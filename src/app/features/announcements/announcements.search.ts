import { inject } from '@angular/core';
import type { Announcement } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { AnnouncementsService } from '../../core/services/announcements.service';
import { ScheduleService } from '../../core/services/schedule.service';

/**
 * Anuncios **vigentes** (`AnnouncementsService.active`): ni los programados ni
 * los del archivo. Las listas de personas (`people`: por quién se ora, quién
 * apunta) no se indexan: son nombres dentro de un aviso que caduca.
 */
export const ANNOUNCEMENTS_SEARCH: SearchProvider = (ctx) => {
  const announcements = inject(AnnouncementsService).active();
  const schedule = inject(ScheduleService);
  return announcements.map((a, i): SearchEntry => {
    const when = a.date
      ? schedule.formatEventDate(a.date)
      : ctx.t('search.ctx.until', { date: schedule.formatEventDate(a.expiresOn) });
    return {
      id: a.id,
      kind: 'announcement',
      title: a.title,
      context: [when, a.time, a.place].filter(Boolean).join(' · '),
      path: `/${APP_PATHS.announcements}/${a.id}`,
      icon: 'megaphone',
      body: bodyOf(a),
      boost: 1.2,
      suggest: i,
    };
  });
};

function bodyOf(a: Announcement): string {
  const sections = a.sections
    .filter((s) => s.kind !== 'people')
    .flatMap((s) => [s.heading, ...s.items.map((item) => [item.label, item.value].filter(Boolean).join(': '))]);
  return [a.lead, ...sections, a.footnote, a.verse?.text, a.verse?.reference].filter(Boolean).join('. ');
}
