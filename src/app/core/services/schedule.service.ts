import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, UpcomingEvent, WeeklyProgram } from '../church.config';
import { DAY_MS, parseIsoDate, startOfDay } from '../util/iso-date';
import { ClockService } from './clock.service';

/** Valor de orden usado cuando una hora no se puede interpretar: va al final. */
const UNPARSEABLE_TIME_ORDER = 24 * 60;

/**
 * La ventana de culto abre 15 minutos antes de la hora anunciada: la
 * retransmisión se enciende antes de que empiece el servicio.
 */
const MINUTOS_ANTES = 15;

/**
 * Y dura dos horas, que es lo que dura un culto con holgura. Pasadas, si la
 * emisión sigue, el JSON estático la recoge igual: lo que se pierde es
 * inmediatez, no la detección.
 */
const MINUTOS_VENTANA = 120;

/** `YYYY-MM-DD` de una fecha en hora **local** (no UTC: los cultos son de aquí). */
function isoDeFecha(f: Date): string {
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mes}-${dia}`;
}

/**
 * Evento futuro enriquecido con los metadatos que necesita la vista.
 */
export interface UpcomingEventView extends UpcomingEvent {
  /** Días naturales que faltan (0 = hoy). */
  readonly daysLeft: number;
  readonly isToday: boolean;
  readonly isPast: boolean;
}

/** Un culto del programa semanal con sus horas ya separadas («10:00 & 18:00» → dos). */
export interface WeeklyServiceView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly times: readonly string[];
}

/**
 * Un día de la semana en curso (lunes → domingo), con o sin cultos. Los días
 * sin programa también existen: la semana se lee como un calendario, y un
 * hueco visible («sábado: sin culto») informa tanto como una fila.
 */
export interface WeekDayView {
  readonly day: WeekDayIndex;
  /** `YYYY-MM-DD` local de ese día en la semana actual. */
  readonly iso: string;
  readonly isToday: boolean;
  readonly isPast: boolean;
  readonly services: readonly WeeklyServiceView[];
}

/** El culto que toca destacar: el que está en curso o, si no, el siguiente. */
export interface NextServiceView {
  readonly service: WeeklyServiceView;
  readonly day: WeekDayIndex;
  /** Hora concreta de esta sesión (de un domingo con dos, la que toca). */
  readonly time: string;
  /** Minutos que faltan para empezar (negativo: minutos desde que empezó). */
  readonly minutesUntil: number;
  /** Dentro de la ventana del culto (desde la hora anunciada hasta +2 h). */
  readonly isLive: boolean;
  /** Días naturales hasta ese culto (0 = hoy, 1 = mañana…). */
  readonly daysAway: number;
  /** `YYYY-MM-DD` local del día de esa sesión. */
  readonly iso: string;
}

type WeekDayIndex = WeeklyProgram['day'];

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
   * La semana en curso como calendario: siete días de lunes a domingo (la
   * semana empieza el lunes en ro y es), cada uno con su fecha y sus cultos.
   * Sale de los datos, no del marcado: si mañana hay culto el sábado, basta
   * con añadirlo a `weeklyProgram`.
   */
  readonly week = computed<readonly WeekDayView[]>(() => {
    const today = startOfDay(new Date(this.clock.now()));
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const day = date.getDay() as WeekDayIndex;
      return {
        day,
        iso: isoDeFecha(date),
        isToday: date.getTime() === today.getTime(),
        isPast: date.getTime() < today.getTime(),
        services: this.config.weeklyProgram.filter((p) => p.day === day).map(toServiceView),
      };
    });
  });

  /**
   * El culto en curso o, si no hay ninguno, el siguiente (hasta siete días
   * vista). Cada hora de un día con varias («10:00 & 18:00») es una sesión
   * propia: el domingo a mediodía el siguiente es el de las 18:00.
   */
  readonly nextService = computed<NextServiceView | null>(() => {
    const now = this.clock.now();
    const today = startOfDay(new Date(now));

    for (let offset = 0; offset <= 7; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const day = date.getDay() as WeekDayIndex;

      const sessions = this.config.weeklyProgram
        .filter((p) => p.day === day)
        .flatMap((p) => {
          const view = toServiceView(p);
          return view.times.map((time) => ({ view, time, start: date.getTime() + parseTimeToMinutes(time) * 60_000 }));
        })
        .filter((s) => now < s.start + MINUTOS_VENTANA * 60_000)
        .sort((a, b) => a.start - b.start);

      const first = sessions[0];
      if (first) {
        const minutesUntil = Math.ceil((first.start - now) / 60_000);
        return {
          service: first.view,
          day,
          time: first.time,
          minutesUntil,
          isLive: minutesUntil <= 0,
          daysAway: offset,
          iso: isoDeFecha(date),
        };
      }
    }
    return null;
  });

  /**
   * Minutos de comienzo de **todo lo que hoy reúne a la iglesia**: los cultos
   * del programa semanal que caen hoy y los eventos con fecha de hoy.
   *
   * Los dos orígenes y no sólo el programa: así, anotar un evento un sábado
   * —o cualquier otro día— basta para que la app lo trate como lo que es, sin
   * tocar código. «Cuando se indique» es, literalmente, añadir el evento.
   */
  private readonly comienzosDeHoy = computed<readonly number[]>(() => {
    const ahora = new Date(this.clock.now());
    const hoyIso = isoDeFecha(ahora);
    const dia = ahora.getDay();

    const delPrograma = this.config.weeklyProgram
      .filter((p) => p.day === dia)
      .flatMap((p) => parseAllTimesToMinutes(p.time));

    const deEventos = this.config.upcomingEvents
      .filter((e) => e.date === hoyIso)
      .flatMap((e) => parseAllTimesToMinutes(e.time));

    return [...new Set([...delPrograma, ...deEventos])].sort((a, b) => a - b);
  });

  /**
   * Horas de comienzo de hoy (minutos desde medianoche, ordenadas): las del
   * programa semanal y las de los eventos con fecha de hoy. Fuente de la
   * cuenta atrás de la proyección (`ServiceCountdownService`).
   */
  readonly todayStarts = this.comienzosDeHoy;

  /**
   * ¿Estamos ahora dentro de una ventana de culto o evento?
   *
   * Abre `MINUTOS_ANTES` antes de la hora anunciada —la retransmisión se
   * enciende un poco antes— y dura `MINUTOS_VENTANA`.
   *
   * Lo consume `YouTubeService` para dos cosas: apretar el ritmo justo cuando
   * puede haber directo y, sobre todo, **no llamar a la API el resto del
   * día**, que es lo que de verdad protege la cuota.
   */
  readonly enVentanaDeCulto = computed<boolean>(() => {
    const ahora = new Date(this.clock.now());
    const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
    return this.comienzosDeHoy().some(
      (inicio) =>
        minutoActual >= inicio - MINUTOS_ANTES && minutoActual < inicio + MINUTOS_VENTANA,
    );
  });

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
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
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

  /**
   * Día y mes por separado (ej: `{ day: '26', month: 'SEP' }`), para las
   * pastillas de fecha: el número grande y el mes debajo en versalitas se
   * alinean entre filas y se leen antes que una fecha corrida.
   */
  formatDayParts(iso: string): { readonly day: string; readonly month: string } {
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
    try {
      const fecha = parseIsoDate(iso);
      const mes = new Intl.DateTimeFormat(lang, { month: 'short' })
        .format(fecha)
        .replace('.', '')
        .toUpperCase();
      return { day: new Intl.DateTimeFormat(lang, { day: 'numeric' }).format(fecha), month: mes };
    } catch {
      return { day: '', month: '' };
    }
  }

  /**
   * Día de la semana abreviado (ej: «lun»). Para listas donde lo que sitúa al
   * lector no es la fecha sino el día: un plan de lectura se sigue por «hoy es
   * miércoles», no por «hoy es 24».
   */
  formatWeekdayShort(iso: string): string {
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(parseIsoDate(iso));
    } catch {
      return iso;
    }
  }

  /**
   * Día de la semana completo (ej: «marți»). Para rótulos que conviven con
   * los del programa semanal, que escriben el día entero: «MARȚI · 20:30» al
   * lado de «MAR. · CITIREA BIBLIEI» parecían dos sistemas distintos.
   */
  formatWeekdayLong(iso: string): string {
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(parseIsoDate(iso));
    } catch {
      return iso;
    }
  }

  /**
   * Fecha corta localizada (ej: «26 sept.»). Para listas de columna estrecha,
   * donde la fecha larga se come el ancho del título y lo deja truncado a
   * tres letras: ahí el dato que importa es el título, y la fecha sólo tiene
   * que situarlo. El año se omite a propósito — en una lista de «próximos»
   * siempre es el actual o el siguiente.
   */
  formatEventDateShort(iso: string): string {
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(
        parseIsoDate(iso),
      );
    } catch {
      return iso;
    }
  }
}

/** Culto del programa con sus horas separadas, en el orden en que se escriben. */
function toServiceView(p: WeeklyProgram): WeeklyServiceView {
  const times = [...p.time.matchAll(/\d{1,2}:\d{2}/g)].map((m) => m[0]);
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    times: times.length ? times : [p.time],
  };
}

/**
 * Todas las horas de comienzo que contiene una cadena de hora.
 *
 * El domingo figura como «10:00 & 18:00»: son **dos** cultos, no uno, y cada
 * uno abre su propia ventana. Devolver sólo la primera dejaría la tarde sin
 * cubrir, que es justo uno de los dos momentos que importan.
 */
function parseAllTimesToMinutes(time: string | undefined): readonly number[] {
  if (!time) return [];
  const minutos: number[] = [];
  for (const m of time.matchAll(/(\d{1,2}):(\d{2})/g)) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (!Number.isNaN(h) && !Number.isNaN(min)) minutos.push(h * 60 + min);
  }
  return minutos;
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
