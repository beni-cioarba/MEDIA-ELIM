import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { blockPath } from '../../core/navigation/app-paths';
import { ScheduleService } from '../../core/services/schedule.service';
import { IconComponent } from '../icon/icon.component';

/**
 * La semana en curso como calendario (lunes → domingo, con fecha, hoy
 * marcado y los días sin culto visibles) y, opcionalmente, el culto en curso
 * o siguiente en una franja navy. Misma fuente que el bloque «Program
 * săptămânal»: Contact y la portada no pueden decir cosas distintas.
 *
 * Estrecha (columna lateral, móvil): filas día | horas | culto. Con ancho
 * (≥ 40rem de contenedor): siete columnas.
 */
@Component({
  selector: 'app-week-schedule',
  standalone: true,
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './week-schedule.component.html',
  styleUrl: './week-schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekScheduleComponent {
  /** Franja «Următorul / Acum» con el próximo culto. */
  readonly showNext = input(true);

  protected readonly schedule = inject(ScheduleService);
  protected readonly next = this.schedule.nextService;
  protected readonly weeklyLink = blockPath('weekly');

  /** «Hoy» / «Mañana» se traducen en la plantilla; el resto, día de la semana. */
  protected readonly nextDayLabel = computed(() => {
    const next = this.next();
    return next ? this.schedule.formatWeekdayLong(next.iso) : '';
  });
}
