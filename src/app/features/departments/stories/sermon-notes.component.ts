import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { StorySermon } from '../../../core/departments.config';
import { IconComponent } from '../../../shared/icon/icon.component';

/** «55:15» o «1:01:20»: como lo pinta YouTube en su barra. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * Resumen de la predicación de una crónica (`DepartmentStory.sermon`): qué
 * se aprendió, en piezas que se leen de un vistazo —una tabla de contraste,
 * pasos numerados, lecciones— y un cierre en navy. Cada parte enlaza al
 * minuto exacto del directo, así que el resumen sirve también de índice.
 */
@Component({
  selector: 'app-sermon-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './sermon-notes.component.html',
  styleUrl: './sermon-notes.component.scss',
})
export class SermonNotesComponent {
  readonly sermon = input.required<StorySermon>();
  /** Raíz de textos de la crónica (`departments.<id>.stories.<storyId>`). */
  readonly base = input.required<string>();
  readonly storyId = input.required<string>();
  readonly youtubeId = input<string>();

  protected readonly k = computed(() => `${this.base()}.sermon`);

  protected readonly clock = clock;

  /** Enlace al segundo `at` del directo; `null` si la crónica no tiene vídeo. */
  protected at(seconds: number | undefined): string | null {
    const id = this.youtubeId();
    if (!id || seconds === undefined) return null;
    return `https://www.youtube.com/watch?v=${id}&t=${seconds}s`;
  }
}
