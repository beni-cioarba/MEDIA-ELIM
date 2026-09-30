import { Injectable, computed, inject } from '@angular/core';
import { ContestPhase, TALENT_CONTEST } from '../talent-contest.config';
import { DAY_MS, parseIsoDate, startOfDay } from '../util/iso-date';
import { ClockService } from './clock.service';

/** Momento de una fase respecto a hoy. */
export type ContestPhaseStatus = 'done' | 'live' | 'next' | 'upcoming';

export interface ContestPhaseView extends ContestPhase {
  readonly status: ContestPhaseStatus;
  /** Días naturales hasta el primer día (0 = hoy; negativo = ya pasó). */
  readonly daysLeft: number;
}

/**
 * «Talantul în Negoț»: el calendario de la edición visto desde hoy.
 *
 * Lo único que no es dato fijo es **dónde estamos**: qué fases ya pasaron,
 * cuál se está celebrando (la internacional dura tres días) y cuál es la
 * siguiente, con los días que faltan. Todo sale del reloj compartido, así que
 * la cuenta atrás cambia sola a medianoche sin recargar.
 *
 * No conoce las categorías (`talent-contest.categories.ts`): así la franja de
 * la portada lo usa sin cargar los versículos.
 */
@Injectable({ providedIn: 'root' })
export class TalentContestService {
  private readonly clock = inject(ClockService);

  readonly config = TALENT_CONTEST;

  /** Fases con su estado; como mucho una `next` (la primera que no ha empezado). */
  readonly phases = computed<readonly ContestPhaseView[]>(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    let nextAssigned = false;
    return this.config.phases.map((phase) => {
      const start = parseIsoDate(phase.start).getTime();
      const end = parseIsoDate(phase.end ?? phase.start).getTime();
      const daysLeft = Math.round((start - today) / DAY_MS);
      let status: ContestPhaseStatus;
      if (today > end) status = 'done';
      else if (today >= start) status = 'live';
      else if (!nextAssigned) status = 'next';
      else status = 'upcoming';
      if (status === 'next' || status === 'live') nextAssigned = true;
      return { ...phase, status, daysLeft };
    });
  });

  /** La fase que toca mirar: la que se celebra hoy o la siguiente. `null` = edición cerrada. */
  readonly focusPhase = computed<ContestPhaseView | null>(
    () => this.phases().find((p) => p.status === 'live' || p.status === 'next') ?? null,
  );

  /** Puntos totales del examen clásico (100 en el formato actual). */
  readonly examTotal = this.config.exam.reduce((sum, part) => sum + part.items * part.points, 0);
}
