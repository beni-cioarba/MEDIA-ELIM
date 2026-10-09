import { Injectable, computed, inject, signal } from '@angular/core';
import { YOUTH_MEAL_APP } from '../../../core/departments.config';
import { ClockService } from '../../../core/services/clock.service';
import { LoggerService } from '../../../core/services/logger.service';
import { parseIsoDate, startOfDay } from '../../../core/util/iso-date';
import { MealTurn, parseMealFeed } from '../../../core/util/meal-feed';

/** Turno ya situado respecto a hoy. */
export interface MealTurnView extends MealTurn {
  readonly daysLeft: number;
  readonly isToday: boolean;
}

export type MealFeedState = 'idle' | 'loading' | 'ready' | 'error';

const DAY_MS = 86_400_000;

/**
 * Próximos turnos de la masa de tineret, leídos del calendario público de
 * ADM-TINERET (`YOUTH_MEAL_APP.feed`).
 *
 * Se pide **una vez por sesión y sólo cuando el bloque entra en pantalla**
 * (`load()` lo llama el componente, que vive en un `@defer (on viewport)`).
 * Si falla —sin red, la app no desplegada—, el bloque sigue siendo útil: se
 * queda con la explicación y los accesos a la app.
 *
 * «Hoy» sale del reloj compartido: a medianoche el turno de hoy pasa a
 * pasado sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class YouthMealService {
  private readonly clock = inject(ClockService);
  private readonly log = inject(LoggerService).prefix('youth-meal');

  private readonly turns = signal<readonly MealTurn[]>([]);
  readonly state = signal<MealFeedState>('idle');

  /** Turnos de hoy en adelante. */
  readonly upcoming = computed<readonly MealTurnView[]>(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    return this.turns()
      .map((turn) => {
        const daysLeft = Math.round((parseIsoDate(turn.date).getTime() - today) / DAY_MS);
        return { ...turn, daysLeft, isToday: daysLeft === 0 };
      })
      .filter((turn) => turn.daysLeft >= 0);
  });

  readonly next = computed<MealTurnView | null>(() => this.upcoming()[0] ?? null);

  load(): void {
    if (this.state() === 'loading' || this.state() === 'ready') return;
    this.state.set('loading');
    fetch(YOUTH_MEAL_APP.feed, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        this.turns.set(parseMealFeed(text));
        this.state.set('ready');
      })
      .catch((error: unknown) => {
        this.log.warn('No se pudo leer el calendario de la masa', error);
        this.state.set('error');
      });
  }
}
