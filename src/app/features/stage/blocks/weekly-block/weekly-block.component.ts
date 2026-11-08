import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG, Rehearsal } from '../../../../core/church.config';
import { blockPath, departmentPath } from '../../../../core/navigation/app-paths';
import { ClockService } from '../../../../core/services/clock.service';
import { LanguageService } from '../../../../core/services/language.service';
import { addDays, formatIsoRange, startOfDay, toIsoDate } from '../../../../core/util/iso-date';
import { PresentationService } from '../../../../core/presentation.service';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { IconComponent } from '../../../../shared/icon/icon.component';

/** Una cifra de la cuenta atrás con su unidad ya traducible («3» + «h»). */
interface CountdownPart {
  readonly value: number;
  readonly unitKey: string;
}

/** Fila del bloque de repetiții, con lo que se deriva de la fecha de hoy. */
interface RehearsalRow {
  readonly r: Rehearsal;
  readonly link: string | null;
  /** Semana intensiva: «23 – 28 noiembrie 2026» (la en curso o la próxima). */
  readonly range: string | null;
  /** `true` si hoy cae dentro de esa semana. */
  readonly active: boolean;
}

/**
 * Última semana del mes que contiene `day`: de lunes al último sábado del mes.
 * Si ya pasó, la del mes siguiente. Función pura (sin reloj) para poder probarla.
 */
export function lastWeekOfMonth(day: Date): { start: Date; end: Date } {
  const today = startOfDay(day);
  for (let offset = 0; offset < 2; offset++) {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1 + offset, 0);
    // getDay(): 6 = sábado.
    const end = addDays(lastDay, -((lastDay.getDay() + 1) % 7));
    const start = addDays(end, -5);
    if (today.getTime() <= end.getTime()) return { start, end };
  }
  throw new Error('unreachable');
}

/**
 * Bloque «Programa semanal».
 *
 *  - **Proyección**: la semana entera en una diapositiva, empezando por hoy
 *    (escala de cartel, estilos en `_projection.scss`).
 *  - **Web**: panel navy con el culto en curso o el siguiente y su cuenta
 *    atrás, y debajo la semana como calendario (lunes → domingo, siete
 *    columnas en escritorio, lista agrupada en móvil).
 *
 * Los datos derivados viven en `ScheduleService`; aquí sólo se presentan.
 * Hoja propia global (`ViewEncapsulation.None`, BEM `.weekly__*`), como el
 * bloque de la Biblia: el bloque es dueño de sus dos contextos.
 */
@Component({
  selector: 'app-weekly-block',
  imports: [TranslatePipe, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './weekly-block.component.html',
  styleUrl: './weekly-block.component.scss',
})
export class WeeklyBlockComponent {
  protected readonly schedule = inject(ScheduleService);
  protected readonly fullscreen = inject(PresentationService).isFullscreen;
  protected readonly location = inject(CHURCH_CONFIG).location;

  protected readonly streamsPath = blockPath('streams');
  protected readonly locationPath = blockPath('location');
  protected readonly upcomingPath = blockPath('upcoming');


  protected readonly next = this.schedule.nextService;

  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly rehearsalList = inject(CHURCH_CONFIG).rehearsals;

  /**
   * Pinta el bloque de repetiții. Sólo en la página propia del programa
   * (`StageComponent` lo activa con `/media/program`): ni en el panel
   * completo ni en la proyección.
   */
  readonly rehearsals = input(false);

  protected readonly rehearsalRows = computed<readonly RehearsalRow[]>(() => {
    const today = startOfDay(new Date(this.clock.now()));
    const lang = this.language.current();
    return this.rehearsalList.map((r) => {
      let range: string | null = null;
      let active = false;
      if (r.lastWeekOfMonth) {
        const { start, end } = lastWeekOfMonth(today);
        range = formatIsoRange(lang, toIsoDate(start), toIsoDate(end));
        active = today.getTime() >= start.getTime();
      }
      return { r, link: r.department ? departmentPath(r.department) : null, range, active };
    });
  });

  /**
   * Las dos unidades mayores que quedan («2 zile 3 h», «3 h 12 min»,
   * «25 min»). Dos bastan: a más distancia, más grueso el grano.
   */
  protected readonly countdown = computed<readonly CountdownPart[]>(() => {
    const next = this.next();
    if (!next || next.isLive) return [];
    const total = Math.max(next.minutesUntil, 0);
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const minutes = total % 60;

    if (days > 0) {
      return [
        { value: days, unitKey: days === 1 ? 'weekly.unit_day' : 'weekly.unit_days' },
        { value: hours, unitKey: 'weekly.unit_hour' },
      ];
    }
    if (hours > 0) {
      return [
        { value: hours, unitKey: 'weekly.unit_hour' },
        { value: minutes, unitKey: 'weekly.unit_min' },
      ];
    }
    return [{ value: minutes, unitKey: 'weekly.unit_min' }];
  });

  /** «Azi», «Mâine» o el nombre del día de la sesión destacada. */
  protected readonly nextDayLabel = computed(() => {
    const next = this.next();
    if (!next) return '';
    return this.schedule.formatWeekdayLong(next.iso);
  });

  protected dateLabel(iso: string): string {
    return this.schedule.formatEventDateShort(iso);
  }
}
