import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { YouTubeService } from '../../../../core/youtube.service';
import { ShareButtonComponent } from '../../../../shared/share-button/share-button.component';

/**
 * Bloque «Transmisiones»: destaca el directo activo (si lo hay) y lista las
 * últimas emisiones del canal de YouTube.
 *
 * Toda la lógica de sondeo vive en `YouTubeService`; aquí sólo se pinta.
 */
@Component({
  selector: 'app-streams-block',
  standalone: true,
  imports: [TranslateModule, ShareButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './streams-block.component.html',
  styles: [':host { display: contents; }'],
})
export class StreamsBlockComponent {
  protected readonly youtube = inject(YouTubeService);
}
