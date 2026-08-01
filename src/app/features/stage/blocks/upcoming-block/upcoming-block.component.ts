import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PresentationService } from '../../../../core/presentation.service';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { CalendarSyncButtonComponent } from '../../../../shared/calendar-sync-button/calendar-sync-button.component';

/**
 * Bloque «Próximos eventos» (Evenimente viitoare): eventos puntuales futuros
 * con contador de días y sincronización con el calendario.
 *
 * Nota: cuando no queda ningún evento futuro, `PresentationBlocksService`
 * excluye automáticamente este bloque de la proyección (salvo que el operador
 * lo fuerce manualmente desde el panel de bloques).
 */
@Component({
  selector: 'app-upcoming-block',
  standalone: true,
  imports: [TranslateModule, CalendarSyncButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upcoming-block.component.html',
  styles: [':host { display: contents; }'],
})
export class UpcomingBlockComponent {
  protected readonly schedule = inject(ScheduleService);
  private readonly presentation = inject(PresentationService);

  protected readonly fullscreen = this.presentation.isFullscreen;

  protected formatEventDate(iso: string): string {
    return this.schedule.formatEventDate(iso);
  }
}
