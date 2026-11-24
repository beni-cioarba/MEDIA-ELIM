import { inject } from '@angular/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { GUEST_TITLE_GLOSS_ES } from '../../core/guests.config';
import { blockPath } from '../../core/navigation/app-paths';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { BibleReadingService } from '../../core/services/bible-reading.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { YouTubeService } from '../../core/youtube.service';

/** Eventos que se ofrecen antes de escribir. */
const EVENTS_SUGGESTED = 2;

/**
 * Lo que vive en los bloques de `/media`: eventos por venir, programa semanal
 * y ensayos, plan de lectura, álbumes, redes y últimas emisiones.
 */
export const STAGE_SEARCH: SearchProvider = (ctx) => {
  const config = inject(CHURCH_CONFIG);
  const schedule = inject(ScheduleService);
  const bible = inject(BibleReadingService);
  const youtube = inject(YouTubeService);

  const departmentNames = (ids: readonly string[] = []): string =>
    ids.map((id) => `${ctx.t(`departments.${id}.name`)} ${ctx.alt(`departments.${id}.name`)}`).join(' ');

  // Sólo los que están por venir (también los generados por la regla mensual).
  const events = schedule.upcomingEvents().map(
    (ev, i): SearchEntry => ({
      id: `event:${ev.id}`,
      kind: 'event',
      title: ev.title,
      altTitle: GUEST_TITLE_GLOSS_ES[ev.title],
      context: [schedule.formatEventDate(ev.date), ev.time, ev.preacher].filter(Boolean).join(' · '),
      path: blockPath('upcoming'),
      fragment: `ev-${ev.id}`,
      icon: 'sparkles',
      keywords: departmentNames(ev.departments),
      body: [ev.description, ev.verse, ev.worshipLead].filter(Boolean).join(' '),
      boost: 1.15,
      // Detrás de los anuncios vigentes; los generados no se ofrecen.
      ...(!ev.auto && i < EVENTS_SUGGESTED ? { suggest: 50 + i } : {}),
    }),
  );

  const weekly = config.weeklyProgram.map(
    (service): SearchEntry => ({
      id: `weekly:${service.id}`,
      kind: 'program',
      title: service.title,
      context: `${service.dayLabel} · ${service.time}`,
      path: blockPath('weekly'),
      icon: 'calendar',
      keywords: [
        ...service.title.split(' · ').map((part) => GUEST_TITLE_GLOSS_ES[part] ?? ''),
        weekdayName('es', service.day),
        ...(service.monthly ?? []).flatMap((m) => [m.title, GUEST_TITLE_GLOSS_ES[m.title] ?? '']),
      ],
      body: service.description,
    }),
  );

  const rehearsals = config.rehearsals.map(
    (r): SearchEntry => ({
      id: `rehearsal:${r.id}`,
      kind: 'program',
      title: `${ctx.t('weekly.rehearsals_title')} · ${[r.group, r.label].filter(Boolean).join(', ')}`,
      context: r.slots.map((slot) => `${slot.days} ${slot.time}`).join(' · '),
      path: blockPath('weekly'),
      fragment: 'rehearsals-title',
      icon: 'clock',
      keywords: [ctx.alt('weekly.rehearsals_title'), departmentNames(r.department ? [r.department] : [])],
    }),
  );

  const reading = bible
    .allWeeks()
    .filter((week) => week.status !== 'past')
    .map(
      (week): SearchEntry => ({
        id: `bible:${week.number}`,
        kind: 'bible',
        title: week.summary,
        context: `${ctx.t('nav.bible')} · ${bible.formatRange(week.start, week.end)}`,
        path: blockPath('bible'),
        icon: 'book',
        keywords: ctx.alt('nav.bible'),
        body: week.days.map((day) => [day.passage, day.newTestament].filter(Boolean).join(', ')).join('; '),
        boost: 0.9,
      }),
    );

  const albums = config.mediaEvents.map((album): SearchEntry => {
    const key = `gallery.events.${album.i18nKey}`;
    return {
      id: `album:${album.id}`,
      kind: 'media',
      title: ctx.t(`${key}.name`),
      altTitle: ctx.alt(`${key}.name`),
      context: `${ctx.t('nav.gallery')} · ${ctx.t(`${key}.date`)}`,
      path: blockPath('gallery'),
      icon: 'image',
      keywords: [
        ctx.alt('nav.gallery'),
        ...(album.pastEditions ?? []).map((edition) => edition.date.slice(0, 4)),
      ],
    };
  });

  const socials = config.socials.map((social): SearchEntry => {
    const key = `socials.items.${social.i18nKey}`;
    return {
      id: `social:${social.id}`,
      kind: 'media',
      title: `${ctx.t(`${key}.name`)} · ${social.handle}`,
      context: `${ctx.t('nav.socials')} · ${ctx.maybe(`${key}.subtitle`) ?? ''}`,
      path: blockPath('socials'),
      icon: 'share',
      boost: 0.9,
    };
  });

  // Las emisiones que la visita ya ha cargado: no se pide nada a la red.
  const streams = youtube.recentStreams().map(
    (video): SearchEntry => ({
      id: `stream:${video.id}`,
      kind: 'media',
      title: video.title,
      context: ctx.t('nav.live'),
      path: blockPath('streams'),
      icon: 'play',
      boost: 0.8,
    }),
  );

  return [...events, ...weekly, ...rehearsals, ...reading, ...albums, ...socials, ...streams];
};

/** «domingo», para el día `0…6` (el 1/11/2026 es domingo). */
function weekdayName(lang: string, day: number): string {
  return new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(new Date(2026, 10, 1 + day));
}
