import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { toIsoDate } from '../util/iso-date';
import { ClockService } from './clock.service';
import type { PresentationBlockId } from './presentation-blocks.service';

/** Límites del tiempo por diapositiva que puede fijar el operador (segundos). */
export const DURATION_MIN_S = 5;
export const DURATION_MAX_S = 120;
export const DURATION_STEP_S = 5;

/**
 * Tiempo por defecto de cada diapositiva, por bloque (segundos).
 * Los anuncios se leen, no se miran: necesitan mucho más que una lista de
 * redes o un programa que la congregación ya conoce.
 */
const DEFAULT_DURATIONS_S: Readonly<Record<PresentationBlockId, number>> = {
  announcements: 30,
  socials: 12,
  streams: 12,
  gallery: 12,
  weekly: 12,
  upcoming: 15,
  bible: 20,
  // Resumen y fichas comparten tiempo: una ficha lleva foto y uno o dos
  // párrafos que se leen en voz alta mientras se ve la familia.
  families: 20,
  // Una sola diapositiva con toda la lista, que se lee en voz alta y se ora
  // por ella. 30 s por defecto (04/10/2026, a petición del usuario; antes 60):
  // si se ora más rato, el operador lo alarga desde el panel.
  causes: 30,
  talent: 25,
  // El QR grande: basta con que dé tiempo a sacar el móvil y escanear.
  website: 15,
};

/**
 * Lo mínimo de una diapositiva que hace falta para saber su tiempo propio.
 * Estructural a propósito: este servicio no depende de
 * `PresentationBlocksService` (que sí depende de él).
 */
export interface TimedSlide {
  readonly block: PresentationBlockId;
  readonly announcement?: { readonly id: string };
  readonly events?: readonly { readonly id: string }[];
  readonly family?: { readonly id: string };
  readonly prayerWeek?: unknown;
}

/**
 * Claves de tiempo propio de una diapositiva. Van por **elemento** (anuncio,
 * evento, familia) y no por posición: el tiempo de un anuncio le sigue aunque
 * cambie el orden o se oculten otros. Una página de eventos lleva dos
 * eventos: dura lo que el más largo de los dos.
 *
 *  - `a:<id>` anuncio · `e:<id>` evento · `f:<id>` ficha · `f:summary` resumen
 *  - Bloques de una sola diapositiva: ninguna (su tiempo es el del bloque).
 *
 * Un bloque nuevo con varias diapositivas sólo tiene que añadir aquí cómo se
 * nombran sus elementos: el panel le pinta el control y el carrusel lo usa.
 */
export function slideTimeKeys(slide: TimedSlide): readonly string[] {
  if (slide.announcement) return [`a:${slide.announcement.id}`];
  if (slide.block === 'upcoming' && slide.events) return slide.events.map((e) => `e:${e.id}`);
  if (slide.block === 'families' && slide.prayerWeek) return [`f:${slide.family?.id ?? 'summary'}`];
  return [];
}

interface DisplayPrefs {
  /** Duraciones fijadas a mano (segundos). Ausente ⇒ valor por defecto. */
  readonly durations: Partial<Record<PresentationBlockId, number>>;
  /**
   * Tiempo propio de una diapositiva concreta (segundos), por clave de
   * `slideTimeKeys`. Ausente ⇒ el del bloque. Es la excepción («este anuncio
   * hoy necesita más»), no la norma.
   */
  readonly slideDurations: Readonly<Record<string, number>>;
  /**
   * Día (`YYYY-MM-DD`) para el que el operador activó el aviso «hoy también
   * en directo», o `null`. Se guarda el día y no un sí/no para que el aviso
   * caduque solo a medianoche: si se olvida encendido el domingo, el lunes ya
   * no se proyecta (invariante 5: nunca contenido caducado).
   */
  readonly liveNoticeDate: string | null;
  /**
   * `false` ⇒ el carrusel no avanza solo: cada diapositiva cambia sólo a mano
   * (flechas, panel). No caduca: es un modo de trabajo del operador (p. ej. un
   * culto en el que se va pasando al ritmo del predicador), no un contenido.
   * Las duraciones se conservan y vuelven a mandar al reactivarlo.
   */
  readonly autoAdvance: boolean;
  /** Cuenta atrás para el inicio del culto (ver `ServiceCountdownService`). */
  readonly countdown: CountdownPrefs;
  /**
   * Reloj (hora actual) en la esquina superior derecha de la proyección.
   * Apagado por defecto: es una ayuda para quien dirige, no contenido. No
   * caduca, como el modo de avance.
   */
  readonly clock: boolean;
  /**
   * El reloj con segundos (`HH:MM:SS`) o sólo hora y minutos (`HH:MM`, por
   * defecto desde el 10/10/2026: los segundos sólo distraían).
   */
  readonly clockSeconds: boolean;
}

/** Ajustes de la cuenta atrás hasta el comienzo del culto. */
export interface CountdownPrefs {
  /** Se muestra en la proyección (automática según el horario). */
  readonly enabled: boolean;
  /**
   * Minutos antes del comienzo en que aparece, o `null` = **siempre**
   * («Mereu», 04/10/2026): visible todo el día hasta el próximo comienzo,
   * salvo mientras dura un culto (ver `ServiceCountdownService`).
   */
  readonly leadMinutes: number | null;
  /**
   * Hora de comienzo puesta a mano para un día (`HH:MM` + `YYYY-MM-DD`), que
   * manda sobre el horario: un culto que hoy empieza a otra hora, un evento
   * que no está en el programa… Guarda el día para caducar sola a medianoche.
   */
  readonly manual: { readonly date: string; readonly time: string } | null;
}

/** Opciones de antelación que ofrece el panel (minutos). */
export const COUNTDOWN_LEAD_OPTIONS: readonly number[] = [15, 30, 45, 60, 90];

/** Por defecto aparece 90 min antes (04/10/2026, a petición del usuario; antes 30). */
const COUNTDOWN_DEFAULTS: CountdownPrefs = { enabled: true, leadMinutes: 90, manual: null };

const STORAGE_KEY = 'iglesia-redes.presentation.display';

const DEFAULTS: DisplayPrefs = {
  durations: {},
  slideDurations: {},
  liveNoticeDate: null,
  autoAdvance: true,
  countdown: COUNTDOWN_DEFAULTS,
  clock: false,
  clockSeconds: false,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Preferencias de **pantalla y ritmo** de la proyección (no de contenido):
 * cuánto dura cada diapositiva de cada bloque y el aviso de directo.
 *
 * Van aparte de `PresentationBlocksService` porque responden a otra pregunta:
 * aquél decide *qué* se proyecta; éste, *cómo y cuánto tiempo*.
 *
 * El QR ya no es un ajuste de pantalla: es un bloque propio (`website`) que
 * se enciende y apaga como los demás, y cada diapositiva tiene el lienzo
 * entero (`docs/ai/30-presentation.md` → «Lienzo»).
 *
 * Las duraciones vienen con un valor por defecto por bloque y el operador
 * puede ajustarlas desde el panel de controles; se recuerdan en
 * `localStorage`, como el resto de ajustes.
 *
 * El **avance automático** es el interruptor general del ritmo: apagado, el
 * carrusel no corre el reloj y sólo cambia de diapositiva a mano.
 *
 * El aviso de emisión en directo también es de pantalla: marca «ÎN DIRECT»
 * junto a la firma de la esquina y suma el código del directo a la
 * diapositiva del QR (ver `docs/ai/30-presentation.md` → «Aviso de directo»).
 */
@Injectable({ providedIn: 'root' })
export class PresentationDisplayService {
  private readonly clock = inject(ClockService);
  private readonly prefs = signal<DisplayPrefs>(readStoredPrefs());

  constructor() {
    // Cambios hechos desde otra ventana (panel de control ↔ proyección).
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEY) this.prefs.set(readStoredPrefs());
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Día de hoy según el reloj compartido: cambia solo al pasar la medianoche. */
  private readonly today = computed<string>(() => toIsoDate(new Date(this.clock.now())));

  /** `true` si hoy se anuncia que el programa también se emite en directo. */
  readonly liveNotice = computed<boolean>(() => this.prefs().liveNoticeDate === this.today());

  /**
   * `true` si las diapositivas avanzan solas con su tiempo; `false` si sólo
   * cambian a mano. Manda sobre todos los tiempos (de bloque y de diapositiva).
   */
  readonly autoAdvance = computed<boolean>(() => this.prefs().autoAdvance);

  /** Ajustes de la cuenta atrás; la hora manual sólo vale el día en que se puso. */
  readonly countdown = computed<CountdownPrefs>(() => {
    const prefs = this.prefs().countdown;
    return prefs.manual && prefs.manual.date !== this.today() ? { ...prefs, manual: null } : prefs;
  });

  setCountdownEnabled(enabled: boolean): void {
    this.update({ countdown: { ...this.prefs().countdown, enabled } });
  }

  /** Antelación en minutos, o `null` para que se vea siempre. */
  setCountdownLead(leadMinutes: number | null): void {
    if (leadMinutes !== null && !COUNTDOWN_LEAD_OPTIONS.includes(leadMinutes)) return;
    this.update({ countdown: { ...this.prefs().countdown, leadMinutes } });
  }

  /** Hora de comienzo manual para hoy (`HH:MM`), o `null` para volver al horario. */
  setCountdownManual(time: string | null): void {
    const manual = time && HH_MM.test(time) ? { date: this.today(), time } : null;
    this.update({ countdown: { ...this.prefs().countdown, manual } });
  }

  /** Duración efectiva por bloque (segundos), ya resuelta con los defectos. */
  readonly durations = computed<Readonly<Record<PresentationBlockId, number>>>(() => ({
    ...DEFAULT_DURATIONS_S,
    ...this.prefs().durations,
  }));

  /** `true` si el operador ha cambiado alguna duración (de bloque o de diapositiva). */
  readonly hasCustomDurations = computed<boolean>(
    () =>
      Object.keys(this.prefs().durations).length > 0 ||
      Object.keys(this.prefs().slideDurations).length > 0,
  );

  /** Segundos que dura cada diapositiva de este bloque. */
  durationFor(block: PresentationBlockId): number {
    return this.durations()[block];
  }

  isDefaultDuration(block: PresentationBlockId): boolean {
    return this.prefs().durations[block] === undefined;
  }

  /** Fija la duración (segundos) de un bloque, acotada a los límites. */
  setDuration(block: PresentationBlockId, seconds: number): void {
    const clamped = Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, Math.round(seconds)));
    this.update({ durations: { ...this.prefs().durations, [block]: clamped } });
  }

  /** Suma o resta un paso a la duración de un bloque. */
  stepDuration(block: PresentationBlockId, direction: 1 | -1): void {
    this.setDuration(block, this.durationFor(block) + direction * DURATION_STEP_S);
  }

  /** Devuelve un bloque a su duración por defecto. */
  resetDuration(block: PresentationBlockId): void {
    const durations = { ...this.prefs().durations };
    delete durations[block];
    this.update({ durations });
  }

  /** Devuelve todos los bloques y diapositivas a su duración por defecto. */
  resetDurations(): void {
    this.update({ durations: {}, slideDurations: {} });
  }

  // ---- Tiempo propio por diapositiva -------------------------------------
  //
  // Por defecto cada diapositiva dura lo de su bloque (el valor de su
  // cabecera en el panel). Sólo si hace falta —un anuncio largo, la ficha de
  // una familia por la que hoy se ora más despacio— se le fija uno propio,
  // que manda sobre el del bloque hasta que se restablece.

  /** Segundos que dura esta diapositiva en la proyección. */
  durationForSlide(slide: TimedSlide): number {
    const own = slideTimeKeys(slide)
      .map((key) => this.prefs().slideDurations[key])
      .filter((seconds): seconds is number => seconds !== undefined);
    return own.length > 0 ? Math.max(...own) : this.durationFor(slide.block);
  }

  /** Tiempo propio de un elemento, o `null` si hereda el del bloque. */
  slideOverride(key: string): number | null {
    return this.prefs().slideDurations[key] ?? null;
  }

  /** Tiempo efectivo de un elemento: el propio o el de su bloque. */
  itemDuration(key: string, block: PresentationBlockId): number {
    return this.slideOverride(key) ?? this.durationFor(block);
  }

  /** Suma o resta un paso al tiempo de un elemento (parte del de su bloque). */
  stepSlideDuration(key: string, block: PresentationBlockId, direction: 1 | -1): void {
    this.setSlideDuration(key, block, this.itemDuration(key, block) + direction * DURATION_STEP_S);
  }

  /**
   * Fija el tiempo de un elemento. Si coincide con el del bloque no se
   * guarda: seguir heredando es mejor que una copia que no seguiría al bloque.
   */
  setSlideDuration(key: string, block: PresentationBlockId, seconds: number): void {
    const clamped = Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, Math.round(seconds)));
    if (clamped === this.durationFor(block)) {
      this.resetSlideDuration(key);
      return;
    }
    this.update({ slideDurations: { ...this.prefs().slideDurations, [key]: clamped } });
  }

  /** El elemento vuelve a durar lo de su bloque. */
  resetSlideDuration(key: string): void {
    if (!(key in this.prefs().slideDurations)) return;
    const slideDurations = { ...this.prefs().slideDurations };
    delete slideDurations[key];
    this.update({ slideDurations });
  }

  /** Reloj (hora actual) en la esquina superior derecha de la proyección. */
  readonly showClock = computed<boolean>(() => this.prefs().clock);

  setShowClock(on: boolean): void {
    this.update({ clock: on });
  }

  /** Segundos en el reloj (`HH:MM:SS`) o sólo `HH:MM`. */
  readonly clockSeconds = computed<boolean>(() => this.prefs().clockSeconds);

  setClockSeconds(on: boolean): void {
    this.update({ clockSeconds: on });
  }

  /** Avance automático por tiempos (`true`) o sólo manual (`false`). */
  setAutoAdvance(on: boolean): void {
    this.update({ autoAdvance: on });
  }

  /** Enciende el aviso de directo para hoy (caduca a medianoche) o lo apaga. */
  setLiveNotice(on: boolean): void {
    this.update({ liveNoticeDate: on ? this.today() : null });
  }

  private update(patch: Partial<DisplayPrefs>): void {
    this.prefs.update((current) => {
      const next = { ...current, ...patch };
      persistPrefs(next);
      return next;
    });
  }
}

function readStoredPrefs(): DisplayPrefs {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULTS;
    // Las claves antiguas (`qrVisible`, `qrSize`) se ignoran y desaparecen al
    // guardar la próxima preferencia.
    const { durations, slideDurations, liveNoticeDate, autoAdvance, countdown, clock, clockSeconds } =
      parsed as Record<string, unknown>;
    return {
      durations: readDurations(durations),
      slideDurations: readSlideDurations(slideDurations),
      liveNoticeDate:
        typeof liveNoticeDate === 'string' && ISO_DATE.test(liveNoticeDate) ? liveNoticeDate : null,
      // Sólo un `false` explícito apaga el avance: cualquier otra cosa (clave
      // ausente en preferencias antiguas) deja el comportamiento de siempre.
      autoAdvance: autoAdvance !== false,
      countdown: readCountdown(countdown),
      // Sólo un `true` explícito lo enciende: apagado por defecto.
      clock: clock === true,
      // Igual: sin segundos salvo que se pidan.
      clockSeconds: clockSeconds === true,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Cuenta atrás guardada, validada campo a campo (lo dudoso vuelve al defecto). */
function readCountdown(value: unknown): CountdownPrefs {
  if (!value || typeof value !== 'object') return COUNTDOWN_DEFAULTS;
  const { enabled, leadMinutes, manual } = value as Record<string, unknown>;
  const { date, time } = (manual ?? {}) as Record<string, unknown>;
  return {
    enabled: enabled !== false,
    // `null` = siempre; un número fuera de las opciones vuelve al defecto.
    leadMinutes:
      leadMinutes === null
        ? null
        : typeof leadMinutes === 'number' && COUNTDOWN_LEAD_OPTIONS.includes(leadMinutes)
          ? leadMinutes
          : COUNTDOWN_DEFAULTS.leadMinutes,
    manual:
      typeof date === 'string' && ISO_DATE.test(date) && typeof time === 'string' && HH_MM.test(time)
        ? { date, time }
        : null,
  };
}

/** Sólo acepta bloques conocidos y segundos dentro de los límites. */
function readDurations(value: unknown): Partial<Record<PresentationBlockId, number>> {
  if (!value || typeof value !== 'object') return {};
  const out: Partial<Record<PresentationBlockId, number>> = {};
  for (const [key, seconds] of Object.entries(value as Record<string, unknown>)) {
    if (!(key in DEFAULT_DURATIONS_S) || typeof seconds !== 'number') continue;
    if (seconds < DURATION_MIN_S || seconds > DURATION_MAX_S) continue;
    out[key as PresentationBlockId] = seconds;
  }
  return out;
}

/** Tiempos por diapositiva: claves con prefijo conocido y segundos en rango. */
function readSlideDurations(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, seconds] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[aef]:.+/.test(key) || typeof seconds !== 'number') continue;
    if (seconds < DURATION_MIN_S || seconds > DURATION_MAX_S) continue;
    out[key] = seconds;
  }
  return out;
}

function persistPrefs(prefs: DisplayPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}
