import { Injectable, computed, inject } from '@angular/core';
import { ClockService } from './clock.service';
import { PresentationDisplayService } from './presentation-display.service';
import { ScheduleService } from './schedule.service';

/** Tras la hora de comienzo, «Începem acum» se mantiene este tiempo y desaparece. */
export const COUNTDOWN_AFTER_MS = 60_000;

/** El próximo comienzo de hoy y de dónde sale. */
export interface CountdownTarget {
  /** Instante del comienzo (epoch ms). */
  readonly at: number;
  /** `HH:MM`, para el panel. */
  readonly time: string;
  /** `manual`: puesta a mano en el panel; `schedule`: del horario / eventos de hoy. */
  readonly source: 'manual' | 'schedule';
  /** Instante desde el que se proyecta (`at` − antelación). */
  readonly showFrom: number;
}

/**
 * Cuenta atrás hasta el **comienzo del culto**, para la proyección.
 *
 * ── De dónde sale la hora ─────────────────────────────────────────────
 * Automática: el próximo comienzo de **hoy** según el programa semanal y los
 * eventos con fecha de hoy (`ScheduleService.todayStarts`; el domingo «10:00
 * & 18:00» son dos). El operador puede fijar a mano una hora para hoy desde
 * el panel (`PresentationDisplayService.setCountdownManual`), que manda sobre
 * el horario y caduca sola a medianoche.
 *
 * ── Cuándo se ve ──────────────────────────────────────────────────────
 * Desde `leadMinutes` antes hasta un minuto después del comienzo («Începem
 * acum»); fuera de esa ventana no existe. Ni siquiera se calcula al segundo:
 * aquí sólo se resuelve el objetivo con el reloj de minuto de la app; el
 * segundero lo lleva el componente que lo pinta, y sólo dentro de la ventana.
 *
 * Todas las ventanas de proyección leen los mismos ajustes (`localStorage`) y
 * el mismo reloj del sistema, así que marcan lo mismo sin sincronizarse.
 */
@Injectable({ providedIn: 'root' })
export class ServiceCountdownService {
  private readonly clock = inject(ClockService);
  private readonly schedule = inject(ScheduleService);
  private readonly display = inject(PresentationDisplayService);

  readonly enabled = computed<boolean>(() => this.display.countdown().enabled);

  /** Próximo comienzo de hoy (o el manual), aunque aún falte mucho. */
  readonly target = computed<CountdownTarget | null>(() => {
    const prefs = this.display.countdown();
    const now = this.clock.now();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const lead = prefs.leadMinutes * 60_000;

    const make = (minutes: number, source: CountdownTarget['source']): CountdownTarget => {
      const at = midnight.getTime() + minutes * 60_000;
      return { at, time: toHHMM(minutes), source, showFrom: at - lead };
    };

    if (prefs.manual) {
      const [h, m] = prefs.manual.time.split(':').map(Number);
      const manual = make(h * 60 + m, 'manual');
      // Una hora manual ya pasada deja de mandar y vuelve el horario.
      if (manual.at + COUNTDOWN_AFTER_MS > now) return manual;
    }

    // El primer comienzo que aún no ha pasado (con el minuto de «acum»).
    const next = this.schedule
      .todayStarts()
      .find((minutes) => midnight.getTime() + minutes * 60_000 + COUNTDOWN_AFTER_MS > now);
    return next === undefined ? null : make(next, 'schedule');
  });
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
