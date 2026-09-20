import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PresentationService } from '../../../../core/presentation.service';
import { ScheduleService, UpcomingEventView } from '../../../../core/services/schedule.service';
import { SlidePage } from '../../../../core/services/presentation-blocks.service';
import { CalendarSyncButtonComponent } from '../../../../shared/calendar-sync-button/calendar-sync-button.component';

/**
 * Bloque «Próximos eventos» (Evenimente viitoare): eventos puntuales futuros
 * con contador de días y sincronización con el calendario.
 *
 * En proyección el bloque viene **paginado**: `PresentationBlocksService`
 * lo expande en diapositivas de `UPCOMING_PER_SLIDE` eventos y le pasa a
 * cada instancia su página (`events` + `page`). Así ningún evento se corta y
 * cada página tiene su propio tiempo. En la web pública no recibe página y
 * lista todos los eventos futuros.
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

  private readonly pageEvents = signal<readonly UpcomingEventView[] | null>(null);

  /** Eventos de esta página (proyección). `null` ⇒ todos (web pública). */
  @Input() set events(value: readonly UpcomingEventView[] | null) {
    this.pageEvents.set(value);
  }

  /** Posición de la página dentro del bloque, para el indicador «1/2». */
  @Input() page: SlidePage | null = null;

  /** Lo que se pinta: la página recibida o la lista completa. */
  protected readonly shown = computed<readonly UpcomingEventView[]>(
    () => this.pageEvents() ?? this.schedule.upcomingEvents(),
  );

  protected formatEventDate(iso: string): string {
    return this.schedule.formatEventDate(iso);
  }
}
