import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScheduleService } from '../../../../core/services/schedule.service';

/**
 * Bloque «Programa semanal»: servicios fijos ordenados empezando por hoy, la
 * semana entera en una diapositiva (escala de cartel). Los datos derivados
 * viven en `ScheduleService`.
 */
@Component({
    selector: 'app-weekly-block',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './weekly-block.component.html',
    styles: [':host { display: contents; }']
})
export class WeeklyBlockComponent {
  protected readonly schedule = inject(ScheduleService);
}
