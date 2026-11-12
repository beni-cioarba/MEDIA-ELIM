import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { IMPREUNA_YOUTUBE } from '../../../core/impreuna/impreuna.config';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * Meditación del día en 16:9, **sin cargar YouTube hasta que se pulsa**:
 * primero la miniatura (una imagen) y, al pulsar, el reproductor de
 * youtube-nocookie con autoplay. Así la página pesa lo mismo con vídeo que
 * sin él y no hay cookies de terceros si nadie reproduce.
 *
 * Sin vídeo: un marco del mismo tamaño con el motivo (`pending` = aún no
 * es ese día; `missing` = hoy, pero aún no ha llegado) y el canal de YouTube.
 */
@Component({
  selector: 'app-impreuna-video',
  imports: [TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-video.component.html',
  styleUrl: './day-video.component.scss',
})
export class DayVideoComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly video = input<string | null>(null);
  readonly speaker = input<string | null>(null);
  /** Por qué no hay vídeo, si no lo hay. */
  readonly reason = input<'pending' | 'missing'>('missing');

  /** Se reinicia al cambiar de día: el día nuevo vuelve a la miniatura. */
  protected readonly playing = linkedSignal({ source: this.video, computation: () => false });
  /** Miniatura que se está probando (ver `IMPREUNA_YOUTUBE.thumbs`). */
  private readonly thumbStep = linkedSignal({ source: this.video, computation: () => 0 });

  protected readonly youtube = IMPREUNA_YOUTUBE;
  protected readonly thumb = computed(() => {
    const id = this.video();
    return id ? (IMPREUNA_YOUTUBE.thumbs(id)[this.thumbStep()] ?? null) : null;
  });

  /** El «404» de YouTube es una imagen gris de 120 px: se pasa a la siguiente. */
  protected onThumbLoad(event: Event): void {
    if ((event.target as HTMLImageElement).naturalWidth <= 120) this.nextThumb();
  }

  protected nextThumb(): void {
    const id = this.video();
    if (id && this.thumbStep() < IMPREUNA_YOUTUBE.thumbs(id).length - 1) this.thumbStep.update((s) => s + 1);
  }
  protected readonly embed = computed<SafeResourceUrl | null>(() => {
    const id = this.video();
    // Id validado por el patrón de 11 caracteres de YouTube al leer los datos.
    return id && /^[\w-]{11}$/.test(id) ? this.sanitizer.bypassSecurityTrustResourceUrl(IMPREUNA_YOUTUBE.embed(id)) : null;
  });
}
