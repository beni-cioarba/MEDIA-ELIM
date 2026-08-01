import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ScheduleService } from '../../../../core/services/schedule.service';

/**
 * Bloque «Programa semanal»: servicios fijos ordenados empezando por hoy.
 * Los datos derivados viven en `ScheduleService`.
 */
@Component({
  selector: 'app-weekly-block',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weekly-block.component.html',
  styles: [':host { display: contents; }'],
})
export class WeeklyBlockComponent {
  protected readonly schedule = inject(ScheduleService);
}
