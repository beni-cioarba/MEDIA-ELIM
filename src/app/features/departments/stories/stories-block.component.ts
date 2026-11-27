import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DepartmentStory, StoryPhoto } from '../../../core/departments.config';
import { DepartmentId } from '../../../core/navigation/app-paths';
import { youtubeThumbFallback } from '../../../core/youtube-thumb';
import { LanguageService } from '../../../core/services/language.service';
import { driveFolderUrl } from '../../../core/util/drive-folder';
import { formatIsoRange, parseIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';
import { GalleryViewerService } from '../../../shared/viewer/gallery/gallery-viewer.service';
import { ReelPlayerComponent } from './reel-player.component';
import { SermonNotesComponent } from './sermon-notes.component';

const ROOT = 'assets/drive-media/';

/** Foto lista para pintar y para el visor. */
interface PhotoView {
  readonly src: string;
  readonly medium: string;
  readonly thumb: string;
  readonly portrait: boolean;
  readonly featured: boolean;
  /** `object-position` en el mosaico (centrado si no se da). */
  readonly focus: string | null;
  /** Vídeo de la pieza (la foto es su portada), o `null` si es una foto. */
  readonly video: string | null;
  readonly width: number;
  readonly height: number;
}

/** Crónica ya resuelta para la plantilla. */
interface StoryView {
  readonly story: DepartmentStory;
  readonly base: string;
  /** Fechas formateadas; `null` = usar `<base>.period` (texto). */
  readonly range: string | null;
  /** Portada a todo el ancho (`StoryPhoto.cover`), fuera del mosaico. */
  readonly cover: PhotoView | null;
  /** Fotos del mosaico (sin la portada). */
  readonly photos: readonly PhotoView[];
  /**
   * Portada + vídeo destacado + mosaico, en ese orden: **un solo grupo** para
   * la galería del visor (‹ ›, miniaturas y autorreproducción entre todos).
   */
  readonly gallery: readonly ViewerDocument[];
  /** Índice del vídeo destacado (`story.video`) en `gallery`; `-1` si no hay. */
  readonly reelIndex: number;
  /** Índice en `gallery` de la primera foto del mosaico. */
  readonly photoOffset: number;
  /** Fotos sólo del visor (`galleryOnly`), tras el mosaico: «+N» en la última casilla. */
  readonly more: number;
  readonly driveUrl: string | null;
  readonly youtubeUrl: string | null;
  readonly youtubeThumb: string | null;
}

/** «20 septembrie 2026» o «13 – 15 martie 2026». */
function formatRange(lang: string, start: string, end?: string): string {
  if (end && end !== start) return formatIsoRange(lang, start, end);
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(
      parseIsoDate(start),
    );
  } catch {
    return start;
  }
}

const toView = (photo: StoryPhoto): PhotoView => ({
  src: `${ROOT}${photo.base}.webp`,
  medium: `${ROOT}${photo.base}-960.webp`,
  thumb: `${ROOT}${photo.base}-thumb.webp`,
  portrait: photo.height > photo.width,
  featured: photo.featured ?? false,
  focus: photo.focus ?? null,
  video: photo.video ?? null,
  width: photo.width,
  height: photo.height,
});

/**
 * «Din viața tineretului»: crónicas de lo que ya pasó (`kind: 'stories'`).
 *
 * Una crónica **con fotos** se pinta grande: entradilla y puntos clave a un
 * lado; al otro, el vídeo vertical (reel nativo, `preload="none"`: no pesa
 * nada hasta pulsar ▶) y un mosaico de fotos que respeta la orientación de
 * cada una. Cada foto abre la galería del visor con todas (‹ ›). En el
 * teléfono el mosaico pasa a una tira deslizable.
 *
 * Si tiene `sermon`, el resumen de la predicación va al pie, a todo el
 * ancho (`app-sermon-notes`).
 *
 * Una crónica **sin fotos** (la tabără, hoy) queda compacta y lo dice: no
 * se rellena con fotos de otra cosa.
 */
@Component({
  selector: 'app-stories-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslatePipe, IconComponent, ViewableDirective, ReelPlayerComponent, SermonNotesComponent],
  templateUrl: './stories-block.component.html',
  styleUrl: './stories-block.component.scss',
})
export class StoriesBlockComponent {
  readonly department = input.required<DepartmentId>();
  readonly stories = input.required<readonly DepartmentStory[]>();

  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly gallery = inject(GalleryViewerService);

  protected readonly views = computed<readonly StoryView[]>(() => {
    const lang = this.language.current();
    const dept = this.department();
    return this.stories().map((story) => {
      const base = `departments.${dept}.stories.${story.id}`;
      const coverPhoto = story.photos.find((p) => p.cover);
      const cover = coverPhoto ? toView(coverPhoto) : null;
      const photos = story.photos.filter((p) => !p.cover && !p.galleryOnly).map(toView);
      const extra = story.photos.filter((p) => !p.cover && p.galleryOnly).map(toView);
      const title = this.translate.instant(`${base}.title`);
      // El visor ya pone «n / total»: el nombre es sólo el título.
      const toDoc = (p: PhotoView): ViewerDocument =>
        p.video
          ? { src: p.video, mimeType: 'video/mp4', thumb: p.thumb, name: title, alt: title }
          : {
              src: p.src,
              srcset: `${p.thumb} 480w, ${p.medium} 960w, ${p.src} ${p.width}w`,
              thumb: p.thumb,
              name: title,
              alt: title,
            };
      const video = story.video;
      const reel: ViewerDocument | null = video
        ? {
            src: video.src,
            mimeType: 'video/mp4',
            thumb: video.poster,
            start: video.start,
            name: title,
            alt: this.translate.instant(`${base}.caption`),
          }
        : null;
      const gallery = [...(cover ? [toDoc(cover)] : []), ...(reel ? [reel] : []), ...photos.map(toDoc), ...extra.map(toDoc)];
      return {
        story,
        base,
        range: story.start ? formatRange(lang, story.start, story.end) : null,
        cover,
        photos,
        gallery,
        reelIndex: reel ? (cover ? 1 : 0) : -1,
        photoOffset: gallery.length - photos.length - extra.length,
        more: extra.length,
        driveUrl: story.driveFolderId
          ? driveFolderUrl(story.driveFolderId, this.config.mediaGalleryUrl)
          : null,
        youtubeUrl: story.youtubeId ? `https://www.youtube.com/live/${story.youtubeId}` : null,
        youtubeThumb: story.youtubeId ? `https://i.ytimg.com/vi/${story.youtubeId}/hq720.jpg` : null,
      };
    });
  });

  /** `hq720` no existe en todos los directos: respaldo a `mqdefault` (16:9). */
  protected readonly thumbFallback = youtubeThumbFallback;

  /** Vídeo destacado → galería de la crónica, en él y desde el segundo `at`. */
  protected openReel(view: StoryView, at: number): void {
    const items = view.gallery.map((doc, i) => (i === view.reelIndex ? { ...doc, from: at } : doc));
    void this.gallery.open(items, view.reelIndex);
  }
}
