import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { YouTubeService } from '../../../../core/youtube.service';
import { youtubeThumb, youtubeThumbFallback } from '../../../../core/youtube-thumb';
import { PresentationService } from '../../../../core/presentation.service';
import { ShareButtonComponent } from '../../../../shared/share-button/share-button.component';

/**
 * Emisiones que caben proyectadas con miniatura y título legibles desde el
 * fondo del templo. Cinco miniaturas en una fila obligan a captions de ~20 px;
 * tres permiten ~30 px y una imagen que se reconoce a distancia.
 */
const PROJECTED_STREAMS = 3;

/**
 * Bloque «Transmisiones»: destaca el directo activo (si lo hay) y lista las
 * últimas emisiones del canal de YouTube.
 *
 * Toda la lógica de sondeo vive en `YouTubeService`; aquí sólo se pinta.
 */
@Component({
    selector: 'app-streams-block',
    imports: [TranslatePipe, ShareButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './streams-block.component.html',
    styles: [':host { display: contents; }']
})
export class StreamsBlockComponent {
  protected readonly youtube = inject(YouTubeService);

  /**
   * Miniatura en 16:9 real (la API da `hqdefault`, que es 4:3 y viene recortada
   * de lado). Detalle en `core/youtube-thumb.ts`.
   */
  protected readonly thumb = youtubeThumb;
  protected readonly onThumbError = youtubeThumbFallback;
  private readonly presentation = inject(PresentationService);

  /** En la web pública se listan todas; en proyección, sólo las que se leen bien. */
  protected readonly visibleStreams = computed(() => {
    const recent = this.youtube.recentStreams();
    return this.presentation.isFullscreen() ? recent.slice(0, PROJECTED_STREAMS) : recent;
  });
}
