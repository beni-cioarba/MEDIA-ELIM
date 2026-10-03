import { Injectable, Signal, computed, inject } from '@angular/core';
import { CHURCH_CONFIG } from '../church.config';
import { LEADERSHIP_OFFICES, SERVICE_AREAS } from '../leadership.config';
import { AnnouncementsService } from '../services/announcements.service';
import { BibleReadingService } from '../services/bible-reading.service';
import { FamilyPrayerService } from '../services/family-prayer.service';
import { ClockService } from '../services/clock.service';
import { LanguageService } from '../services/language.service';
import { PrayerCausesService } from '../services/prayer-causes.service';
import { ScheduleService } from '../services/schedule.service';
import { TalentContestService } from '../services/talent-contest.service';

/** Texto traducible: clave i18n y, si hace falta, sus parámetros. */
export interface NavText {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

/**
 * Lo que una entrada del menú tiene «ahora mismo»: el dato vivo que se enseña
 * junto a su rótulo en la portada de sección y en el cajón del móvil.
 *
 * Es **dato**, no marcado: la portada y el cajón deciden cómo pintarlo.
 */
export interface NavSummary {
  /** Rótulo del dato («Următorul serviciu», «2 în vigoare»). */
  readonly kicker: NavText;
  /** El dato en sí, ya en su idioma (contenido de la iglesia o fecha formateada). */
  readonly value?: string;
  /** El dato cuando es un texto de la interfaz (se traduce en plantilla). */
  readonly valueText?: NavText;
  /** Segunda línea opcional (título del culto, del evento…). */
  readonly meta?: string;
  /**
   * Marca corta para la esquina («2», «18 oct.», «10:00»). El cajón sólo
   * enseña esto: cabe al lado del rótulo sin añadir una línea. Se reserva
   * para lo que cambia y conviene ver sin entrar (avisos, la próxima fecha,
   * el culto de hoy); un recuento estático no lleva marca.
   */
  readonly badge?: string;
  /** Algo ocurre hoy: la marca se pinta como «en curso». */
  readonly live?: boolean;
}

/** Familias que se nombran antes de resumir el resto con «+N». */
const FAMILIES_NAMED = 3;
/** Departamentos de servicio (los de todas las áreas). */
const DEPARTMENTS = SERVICE_AREAS.reduce((total, area) => total + area.departments.length, 0);

/**
 * Resumen vivo de cada entrada de `MAIN_NAV`, por `id`.
 *
 * ── Por qué un servicio y no lógica en la portada ─────────────────────
 * Lo consumen dos superficies —la portada de cada sección (`NavHubComponent`)
 * y el cajón del móvil—, y las dos tienen que decir lo mismo. Además separa
 * **qué** se resume (aquí, desde los servicios de contenido que ya existen)
 * de **cómo** se pinta (cada componente).
 *
 * Una entrada nueva en el menú no necesita nada aquí para funcionar: sin
 * resumen, su tarjeta enseña rótulo y descripción. Darle resumen es añadir un
 * `case` en `build()`.
 *
 * Todo es `computed` sobre el reloj compartido (`ClockService`, a través de
 * los servicios), así que los datos caducan solos a medianoche, y lee el
 * idioma activo para que las fechas formateadas cambien al cambiar de idioma.
 */
@Injectable({ providedIn: 'root' })
export class NavSummaryService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly language = inject(LanguageService);
  private readonly clock = inject(ClockService);
  private readonly announcements = inject(AnnouncementsService);
  private readonly schedule = inject(ScheduleService);
  private readonly bible = inject(BibleReadingService);
  private readonly families = inject(FamilyPrayerService);
  private readonly causes = inject(PrayerCausesService);
  private readonly contest = inject(TalentContestService);

  /** Un `computed` por entrada, creado la primera vez que se pide. */
  private readonly cache = new Map<string, Signal<NavSummary | null>>();

  /** Resumen de la entrada `id` de `MAIN_NAV` (`null` = no tiene). */
  summaryOf(id: string): Signal<NavSummary | null> {
    let summary = this.cache.get(id);
    if (!summary) {
      summary = computed(() => {
        // Dependencia explícita del idioma: las fechas se formatean con
        // `Intl` y el idioma de ngx-translate, que no es una señal.
        this.language.current();
        return this.build(id);
      });
      this.cache.set(id, summary);
    }
    return summary;
  }

  private build(id: string): NavSummary | null {
    switch (id) {
      // ── Biserica ──────────────────────────────────────────────────────
      case 'about-us':
        // No la dirección: la portada de Biserica ya la da en la invitación.
        return {
          kicker: { key: 'nav_hub.about_kicker', params: { year: this.config.foundedYear } },
          valueText: {
            key: 'nav_hub.about_value',
            params: { years: new Date(this.clock.now()).getFullYear() - this.config.foundedYear },
          },
        };
      case 'credo':
        return {
          kicker: { key: 'nav_hub.credo_kicker' },
          valueText: { key: 'nav_hub.credo_value' },
        };
      case 'leadership':
        return {
          kicker: { key: 'nav_hub.leadership_kicker' },
          valueText: {
            key: 'nav_hub.leadership_value',
            params: { offices: LEADERSHIP_OFFICES.length, departments: DEPARTMENTS },
          },
        };

      // ── Program ───────────────────────────────────────────────────────
      case 'announcements': {
        const active = this.announcements.active();
        if (active.length === 0) return { kicker: { key: 'nav_hub.announcements_none' } };
        return {
          kicker: { key: 'nav_hub.announcements_count', params: { count: active.length } },
          value: active[0]?.title,
          badge: String(active.length),
        };
      }
      case 'weekly': {
        const service = this.schedule.featuredProgram();
        if (!service) return null;
        const today = this.schedule.todayProgram()?.id === service.id;
        return {
          kicker: { key: today ? 'nav_hub.today' : 'nav.panel_service' },
          value: `${service.dayLabel} · ${service.time}`,
          meta: service.title,
          // Sólo hoy: «hay culto hoy a las…» es lo único que merece marca.
          badge: today ? service.time : undefined,
          live: today,
        };
      }
      case 'upcoming': {
        const next = this.schedule.upcomingEvents()[0];
        if (!next) return { kicker: { key: 'nav_hub.upcoming_none' } };
        const date = this.schedule.formatEventDateShort(next.date);
        return {
          kicker: { key: 'nav_hub.upcoming_next' },
          value: next.time ? `${date} · ${next.time}` : date,
          meta: next.title,
          badge: date,
        };
      }
      case 'bible': {
        const week = this.bible.announcedWeek();
        const day = week?.days.find((d) => d.isToday) ?? week?.days[0];
        if (!day) return null;
        return {
          kicker: { key: 'nav_hub.bible_day', params: { day: this.schedule.formatWeekdayLong(day.date) } },
          value: day.passage,
          live: day.isToday,
        };
      }
      case 'family-prayer': {
        const week = this.families.current();
        if (!week || week.families.length === 0) return null;
        const names = week.families.map((family) => family.surname);
        const rest = names.length - FAMILIES_NAMED;
        return {
          kicker: { key: 'nav_hub.families_week', params: { range: this.families.formatShortRange(week) } },
          value: names.slice(0, FAMILIES_NAMED).join(' · ') + (rest > 0 ? ` +${rest}` : ''),
        };
      }
      case 'prayer-causes':
        if (!this.causes.hasCauses) return null;
        return {
          kicker: { key: 'nav_hub.causes_updated', params: { date: this.causes.formatUpdated() } },
          valueText: { key: 'nav_hub.causes_count', params: { count: this.causes.list.causes.length } },
        };
      case 'talent-contest': {
        const phase = this.contest.focusPhase();
        if (!phase) {
          return {
            kicker: { key: 'nav_hub.contest_kicker' },
            valueText: {
              key: 'talent_contest.countdown.closed',
              params: { edition: this.contest.config.edition },
            },
          };
        }
        const live = phase.status === 'live';
        return {
          kicker: { key: live ? 'talent_contest.countdown.live' : 'talent_contest.countdown.next' },
          valueText: { key: `talent_contest.phases.${phase.id}` },
          meta: this.schedule.formatEventDateShort(phase.start),
          badge: live ? undefined : this.schedule.formatEventDateShort(phase.start),
          live,
        };
      }

      // ── Media ─────────────────────────────────────────────────────────
      case 'media-stage':
        return {
          kicker: { key: 'nav_hub.stage_kicker' },
          valueText: { key: 'nav_hub.stage_value' },
        };
      case 'gallery': {
        const albums = this.config.mediaEvents;
        if (albums.length === 0) return null;
        return {
          kicker: { key: 'nav_hub.gallery_kicker' },
          valueText: { key: 'nav_hub.gallery_count', params: { count: albums.length } },
          // Sin «último álbum»: `mediaEvents` no tiene un orden por fecha
          // garantizado. La portada enseña los álbumes en su destacado.
        };
      }
      case 'socials': {
        const socials = this.config.socials;
        if (socials.length === 0) return null;
        return {
          kicker: { key: 'nav_hub.socials_count', params: { count: socials.length } },
          value: socials[0]?.handle,
        };
      }

      default:
        return null;
    }
  }
}
