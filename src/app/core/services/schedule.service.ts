import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, UpcomingEvent, WeeklyProgram } from '../church.config';
import { ClockService } from './clock.service';

/** Milisegundos en un día (para el contador de días restantes). */
const DAY_MS = 86_400_000;

/** Valor de orden usado cuando una hora no se puede interpretar: va al final. */
const UNPARSEABLE_TIME_ORDER = 24 * 60;

/**
 * Evento futuro enriquecido con los metadatos que necesita la vista.
 */
export interface UpcomingEventView extends UpcomingEvent {
  /** Días naturales que faltan (0 = hoy). */
  readonly daysLeft: number;
  readonly isToday: boolean;
  readonly isPast: boolean;
}

/**
 * Única fuente de verdad para los datos temporales de la iglesia:
 * programa semanal reordenado y eventos futuros con contadores.
 *
 * Extraído de `HomeComponent` para que:
 *  - los bloques de presentación lo consuman sin duplicar lógica,
 *  - `PresentationBlocksService` pueda decidir automáticamente si el bloque
 *    "Evenimente viitoare" tiene contenido que mostrar,
 *  - sea testeable de forma aislada.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly clock = inject(ClockService);
  private readonly translate = inject(TranslateService);

  /** Día de la semana actual (0=Domingo … 6=Sábado). */
  readonly currentWeekDay = computed<number>(() => new Date(this.clock.now()).getDay());

  /**
   * Programa semanal rotado para que el primer elemento sea el de hoy.
   * Así la proyección siempre empieza por lo que ocurre hoy.
   */
  readonly weeklyProgram = computed<readonly WeeklyProgram[]>(() => {
    const today = this.currentWeekDay();
    return [...this.config.weeklyProgram].sort((a, b) => {
      const da = (a.day - today + 7) % 7;
      const db = (b.day - today + 7) % 7;
      return da - db;
    });
  });

  /** Servicio de hoy, si existe (para el badge "HOY"). */
  readonly todayProgram = computed<WeeklyProgram | null>(
    () => this.config.weeklyProgram.find((p) => p.day === this.currentWeekDay()) ?? null,
  );

  /**
   * El servicio que toca anunciar en portada: el de hoy si lo hay y, si no,
   * el del siguiente día que tenga culto.
   *
   * Anunciar «hoy no hay culto» y nada más era un callejón sin salida: quien
   * entra un martes quiere saber cuándo es el próximo, no que hoy no toca.
   * Quien consulta el rótulo para saber cuál de los dos casos está viendo
   * tiene `todayProgram()`, que sigue siendo la respuesta a «¿hay hoy?».
   *
   * `weeklyProgram` ya viene rotado por cercanía, así que el primero es el
   * más próximo. Sólo es `null` si no hay ningún servicio configurado.
   */
  readonly featuredProgram = computed<WeeklyProgram | null>(
    () => this.todayProgram() ?? this.weeklyProgram()[0] ?? null,
  );

  /**
   * Eventos futuros: descarta los pasados y ordena por día y hora de inicio.
   */
  readonly upcomingEvents = computed<readonly UpcomingEventView[]>(() => {
    const today = startOfDay(new Date(this.clock.now()));
    return this.config.upcomingEvents
      .map<UpcomingEventView>((ev) => {
        const eventDay = startOfDay(parseIsoDate(ev.date));
        const daysLeft = Math.round((eventDay.getTime() - today.getTime()) / DAY_MS);
        return { ...ev, daysLeft, isToday: daysLeft === 0, isPast: daysLeft < 0 };
      })
      .filter((ev) => !ev.isPast)
      .sort((a, b) =>
        a.daysLeft !== b.daysLeft
          ? a.daysLeft - b.daysLeft
          : parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time),
      );
  });

  /** `true` si queda al menos un evento futuro por celebrar. */
  readonly hasUpcomingEvents = computed<boolean>(() => this.upcomingEvents().length > 0);

  /** Fecha larga localizada (ej: "domingo, 21 de junio de 2026"). */
  formatEventDate(iso: string): string {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'ro';
    try {
      return new Intl.DateTimeFormat(lang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(parseIsoDate(iso));
    } catch {
      return iso;
    }
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parsea `YYYY-MM-DD` en hora local para evitar desfases de zona horaria. */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Convierte "10:00" / "18:30" en minutos desde medianoche (para ordenar). */
function parseTimeToMinutes(time: string | undefined): number {
  if (!time) return UNPARSEABLE_TIME_ORDER;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return UNPARSEABLE_TIME_ORDER;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return UNPARSEABLE_TIME_ORDER;
  return hours * 60 + minutes;
}
