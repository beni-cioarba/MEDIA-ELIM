import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PresentationService } from '../../../../core/presentation.service';
import { ScheduleService, UpcomingEventView } from '../../../../core/services/schedule.service';
import { SlidePage } from '../../../../core/services/presentation-blocks.service';
import { ClockService } from '../../../../core/services/clock.service';
import { LanguageService } from '../../../../core/services/language.service';
import { DAY_MS, parseIsoDate } from '../../../../core/util/iso-date';
import { CalendarSyncButtonComponent } from '../../../../shared/calendar-sync-button/calendar-sync-button.component';
import { ShareButtonComponent } from '../../../../shared/share-button/share-button.component';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { ViewableDirective } from '../../../../shared/viewer/viewable.directive';
import { ViewerDocument } from '../../../../shared/viewer/core/viewer-document.model';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Cuánto se dice «En curso» tras la hora de inicio. Los eventos no tienen hora
 * de fin; un culto dura ~2 h. Pasado esto, el panel sólo dice la hora (el
 * distintivo «ES HOY» sigue): afirmar «en curso» a las 21:30 de un evento de
 * las 10:00 sería falso.
 */
const LIVE_WINDOW_MS = 3 * HOUR_MS;

/** Fecha descompuesta para la casilla de calendario («DOM · 18 · OCT»). */
interface DateParts {
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
  readonly year: string;
}

/** Evento listo para la web: fecha partida, horas separadas y cartel para el visor. */
interface EventCard {
  readonly ev: UpcomingEventView;
  readonly parts: DateParts;
  /** «10:00 & 18:00» → `['10:00', '18:00']`. */
  readonly times: readonly string[];
  readonly poster: readonly ViewerDocument[] | null;
}

/** Agenda agrupada por mes: con veinte eventos se lee como un calendario. */
interface MonthGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly EventCard[];
}

/** Cuenta atrás hasta el primer pase del evento destacado. */
interface Countdown {
  /** `upcoming` = aún no ha empezado · `live` = ya empezó hoy. */
  readonly state: 'upcoming' | 'live';
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
}

/**
 * Bloque «Próximos eventos» (Evenimente viitoare).
 *
 * Una sola tarjeta (`#hero` en la plantilla) para las dos superficies:
 *
 *  - **Web**: el próximo evento como **destacado** (cartel · contenido ·
 *    panel con fecha y cuenta atrás en vivo) y el resto como **agenda
 *    agrupada por mes**, filas densas en columnas alineadas. Todo responde al
 *    ancho del propio bloque (container queries), no al de la ventana.
 *  - **Proyección** (`fullscreen()`): una tarjeta por evento de la página
 *    (`.ev--pj`, escala `--pj-u`). `PresentationBlocksService` lo expande en
 *    diapositivas de `UPCOMING_PER_SLIDE` eventos y le pasa a cada instancia
 *    su página (`events` + `page`).
 *
 * Nota: cuando no queda ningún evento futuro, `PresentationBlocksService`
 * excluye automáticamente este bloque de la proyección (salvo que el operador
 * lo fuerce manualmente desde el panel de bloques).
 */
@Component({
  selector: 'app-upcoming-block',
  imports: [
    NgTemplateOutlet,
    TranslatePipe,
    CalendarSyncButtonComponent,
    ShareButtonComponent,
    IconComponent,
    ViewableDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upcoming-block.component.html',
  styleUrl: './upcoming-block.component.scss',
})
export class UpcomingBlockComponent {
  protected readonly schedule = inject(ScheduleService);
  private readonly presentation = inject(PresentationService);
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);

  protected readonly fullscreen = this.presentation.isFullscreen;

  private readonly pageEvents = signal<readonly UpcomingEventView[] | null>(null);

  /** Eventos de esta página (proyección). `null` ⇒ todos (web pública). */
  @Input() set events(value: readonly UpcomingEventView[] | null) {
    this.pageEvents.set(value);
  }

  /** Posición de la página dentro del bloque, para el indicador «1/2». */
  @Input() page: SlidePage | null = null;

  /** Lo que se pinta: la página recibida o la lista completa. */
  protected readonly shown = computed<readonly UpcomingEventView[]>(
    () => this.pageEvents() ?? this.schedule.upcomingEvents(),
  );

  // ---- Web -----------------------------------------------------------

  protected readonly cards = computed<readonly EventCard[]>(() => {
    const lang = this.language.current();
    return this.shown().map((ev) => this.toCard(ev, lang));
  });

  /** El próximo evento: ocupa la tarjeta grande. */
  protected readonly featured = computed<EventCard | null>(() => this.cards()[0] ?? null);

  /** Los demás, agrupados por mes en orden cronológico. */
  protected readonly agenda = computed<readonly MonthGroup[]>(() => {
    const lang = this.language.current();
    const groups = new Map<string, EventCard[]>();
    for (const card of this.cards().slice(1)) {
      const key = card.ev.date.slice(0, 7);
      const list = groups.get(key);
      if (list) list.push(card);
      else groups.set(key, [card]);
    }
    return [...groups].map(([key, items]) => ({
      key,
      label: this.format(`${key}-01`, lang, { month: 'long', year: 'numeric' }),
      items,
    }));
  });

  /**
   * Cuenta atrás de cada evento por `id`; se recalcula con el reloj (cada
   * minuto). Sin entrada ⇒ ya empezó hace más de `LIVE_WINDOW_MS`.
   */
  protected readonly countdowns = computed<ReadonlyMap<string, Countdown>>(() => {
    const now = this.clock.now();
    const map = new Map<string, Countdown>();
    for (const c of this.cards()) {
      const countdown = this.countdownTo(this.startTime(c.ev) - now);
      if (countdown) map.set(c.ev.id, countdown);
    }
    return map;
  });

  protected formatEventDate(iso: string): string {
    return this.schedule.formatEventDate(iso);
  }

  /** URL del evento dentro de la página, para compartirlo. */
  protected shareUrl(ev: UpcomingEventView): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#ev-${ev.id}`;
  }

  /** Dos dígitos en la cuenta atrás: el ancho no baila al cambiar de 10 a 9. */
  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private toCard(ev: UpcomingEventView, lang: string): EventCard {
    return {
      ev,
      parts: {
        weekday: this.format(ev.date, lang, { weekday: 'short' }).replace('.', ''),
        day: this.format(ev.date, lang, { day: 'numeric' }),
        month: this.format(ev.date, lang, { month: 'short' }).replace('.', ''),
        year: this.format(ev.date, lang, { year: 'numeric' }),
      },
      times: ev.time.split('&').map((t) => t.trim()).filter(Boolean),
      poster: ev.poster
        ? [
            {
              src: ev.poster,
              name: ev.title,
              alt: ev.title,
              description: ev.description || undefined,
              date: ev.date,
            },
          ]
        : null,
    };
  }

  private countdownTo(diff: number): Countdown | null {
    if (diff <= -LIVE_WINDOW_MS) return null;
    if (diff <= 0) return { state: 'live', days: 0, hours: 0, minutes: 0 };
    return {
      state: 'upcoming',
      days: Math.floor(diff / DAY_MS),
      hours: Math.floor((diff % DAY_MS) / HOUR_MS),
      // Hacia arriba: «0 min» con el culto a punto de empezar se leería como «ya».
      minutes: Math.ceil((diff % HOUR_MS) / MINUTE_MS) % 60,
    };
  }

  /** Inicio del primer pase (`date` + primera `HH:MM`; sin hora, el día a las 00:00). */
  private startTime(ev: UpcomingEventView): number {
    const start = parseIsoDate(ev.date);
    const match = /(\d{1,2}):(\d{2})/.exec(ev.time);
    if (match) start.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return start.getTime();
  }

  private format(iso: string, lang: string, opts: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(lang, opts).format(parseIsoDate(iso));
    } catch {
      return iso;
    }
  }
}
