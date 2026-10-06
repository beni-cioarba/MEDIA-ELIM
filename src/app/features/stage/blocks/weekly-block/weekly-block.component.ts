import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';
import { blockPath } from '../../../../core/navigation/app-paths';
import { PresentationService } from '../../../../core/presentation.service';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { IconComponent } from '../../../../shared/icon/icon.component';

/** Una cifra de la cuenta atrás con su unidad ya traducible («3» + «h»). */
interface CountdownPart {
  readonly value: number;
  readonly unitKey: string;
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

  protected readonly next = this.schedule.nextService;

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
