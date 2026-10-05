import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { blockPath } from '../../../core/navigation/app-paths';
import { LanguageService } from '../../../core/services/language.service';
import { YouTubeService } from '../../../core/youtube.service';
import { youtubeThumb, youtubeThumbFallback } from '../../../core/youtube-thumb';
import { HubSectionComponent } from '../hub-section/hub-section.component';

/** Emisiones recientes en la portada: una fila en escritorio, dos en tableta. */
const STREAMS = 4;

/**
 * Destacado de la portada de **Media**: el contenido mismo, no su índice.
 *  1. **Los álbumes de la galería** con su foto, nombre y fecha (en el panel
 *     de escritorio es la tira de miniaturas).
 *  2. **Las últimas transmisiones** de YouTube: no son una página del grupo
 *     (el directo es una llamada a la acción de la cabecera), pero es lo que
 *     se busca al entrar en «Media». Datos del JSON estático, en modo
 *     `ligero`: la portada no gasta cuota de la API.
 */
@Component({
  selector: 'app-media-spotlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HubSectionComponent],
  template: `
    @if (albums.length > 0) {
      <app-hub-section titleKey="nav.gallery" [link]="galleryPath">
        <ul class="albums" role="list">
          @for (album of albums; track album.id) {
            <li>
              <a class="album" [routerLink]="galleryPath">
                <span class="album__frame" [style.background-color]="album.tone">
                  <img class="album__ambient" [src]="album.medium" alt="" loading="lazy" decoding="async" />
                  <img class="album__img" [src]="album.medium" alt="" loading="lazy" decoding="async" />
                </span>
                <span class="album__name">{{ 'gallery.events.' + album.i18nKey + '.name' | translate }}</span>
                <span class="album__date">{{ 'gallery.events.' + album.i18nKey + '.date' | translate }}</span>
              </a>
            </li>
          }
        </ul>
      </app-hub-section>
    }

    @if (streams().length > 0) {
      <app-hub-section titleKey="streams.recent_title" [link]="streamsPath">
        <ul class="streams" role="list">
          @for (video of streams(); track video.id) {
            <li>
              <a
                class="stream"
                [href]="video.url"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="('streams.watch_video' | translate) + ': ' + video.title"
              >
                <span class="stream__frame">
                  <img
                    class="stream__img"
                    [src]="thumb(video.thumbnail)"
                    (error)="onThumbError($event)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span class="stream__play" aria-hidden="true"></span>
                </span>
                <span class="stream__title">{{ video.title }}</span>
                <span class="stream__date">{{ formatDate(video.publishedAt) }}</span>
              </a>
            </li>
          }
        </ul>
      </app-hub-section>
    }
  `,
  styleUrl: './spotlight.scss',
})
export class MediaSpotlightComponent {
  private readonly youtube = inject(YouTubeService);
  private readonly language = inject(LanguageService);

  protected readonly albums = inject(CHURCH_CONFIG).mediaEvents;
  protected readonly streams = computed(() => this.youtube.recentStreams().slice(0, STREAMS));

  protected readonly galleryPath = blockPath('gallery');
  protected readonly streamsPath = blockPath('streams');
  protected readonly thumb = youtubeThumb;
  protected readonly onThumbError = youtubeThumbFallback;

  constructor() {
    this.youtube.start('ligero');
  }

  /** «28 sept. 2026», en el idioma activo. */
  protected formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat(this.language.current(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  }
}
