import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DepartmentStory, StoryPhoto } from '../../../core/departments.config';
import { DepartmentId } from '../../../core/navigation/app-paths';
import { LanguageService } from '../../../core/services/language.service';
import { driveFolderUrl } from '../../../core/util/drive-folder';
import { formatIsoRange, parseIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';

const ROOT = 'assets/drive-media/';

/** Foto lista para pintar y para el visor. */
interface PhotoView {
  readonly src: string;
  readonly medium: string;
  readonly thumb: string;
  readonly portrait: boolean;
  readonly featured: boolean;
  readonly width: number;
  readonly height: number;
}

/** Crónica ya resuelta para la plantilla. */
interface StoryView {
  readonly story: DepartmentStory;
  readonly base: string;
  /** Fechas formateadas; `null` = usar `<base>.period` (texto). */
  readonly range: string | null;
  readonly photos: readonly PhotoView[];
  /** Las mismas fotos para la galería del visor (‹ › entre ellas). */
  readonly gallery: readonly ViewerDocument[];
  readonly driveUrl: string | null;
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
 * Una crónica **sin fotos** (la tabără, hoy) queda compacta y lo dice: no
 * se rellena con fotos de otra cosa.
 */
@Component({
  selector: 'app-stories-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent, ViewableDirective],
  templateUrl: './stories-block.component.html',
  styleUrl: './stories-block.component.scss',
})
export class StoriesBlockComponent {
  readonly department = input.required<DepartmentId>();
  readonly stories = input.required<readonly DepartmentStory[]>();

  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  protected readonly views = computed<readonly StoryView[]>(() => {
    const lang = this.language.current();
    const dept = this.department();
    return this.stories().map((story) => {
      const base = `departments.${dept}.stories.${story.id}`;
      const photos = story.photos.map(toView);
      const title = this.translate.instant(`${base}.title`);
      return {
        story,
        base,
        range: story.start ? formatRange(lang, story.start, story.end) : null,
        photos,
        // El visor ya pone «n / total»: el nombre es sólo el título.
        gallery: photos.map((p) => ({
          src: p.src,
          srcset: `${p.thumb} 480w, ${p.medium} 960w, ${p.src} ${p.width}w`,
          thumb: p.thumb,
          name: title,
          alt: title,
        })),
        driveUrl: story.driveFolderId
          ? driveFolderUrl(story.driveFolderId, this.config.mediaGalleryUrl)
          : null,
      };
    });
  });

  /**
   * Recorte del arranque (`StoryVideo.start`): si se arrastra la barra antes
   * de ese segundo, vuelve a él. El tramo recortado no se ve nunca.
   */
  protected clampStart(event: Event, start: number | undefined): void {
    const video = event.target as HTMLVideoElement;
    if (start && video.currentTime < start - 0.05) video.currentTime = start;
  }
}
