import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { YOUTH_MEAL_PHOTOS } from '../../../core/departments.config';
import { LanguageService } from '../../../core/services/language.service';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';

const ROOT = 'assets/drive-media/';

/**
 * «Quédate a cenar»: la pieza propia del encuentro de vineri
 * (`companion: 'youth-meal'`, proyectada en `app-meeting-block`).
 *
 * Invitación, no herramienta (13/10/2026, a petición del usuario): dice que
 * al terminar el programa hay masa para todos y anima a quedarse. Sin datos
 * de la app interna (turnos, equipos, părinți): eso es organización y vive en
 * ADM-TINERET, enlazada sólo desde el pie.
 *
 * Con fotos (25/11/2026): lo cuentan en dos pasos —se prepara, está lista—
 * junto al texto. Salen de `YOUTH_MEAL_PHOTOS`; cada una abre la galería.
 */
@Component({
  selector: 'app-youth-meal-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ViewableDirective],
  templateUrl: './youth-meal-block.component.html',
  styleUrl: './youth-meal-block.component.scss',
})
export class YouthMealBlockComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  /** Tres razones cortas para quedarse (`departments.youth.meal.chips.*`). */
  protected readonly chips = ['everyone', 'friend', 'stay'] as const;

  protected readonly photos = computed(() => {
    this.language.current();
    return YOUTH_MEAL_PHOTOS.map((photo) => {
      const key = `departments.youth.meal.photos.${photo.key}`;
      const path = `${ROOT}${photo.base}`;
      return {
        ...photo,
        src: `${path}.webp`,
        medium: `${path}-960.webp`,
        thumb: `${path}-thumb.webp`,
        full: photo.large ? `${path}-2560.webp` : null,
        caption: this.translate.instant(`${key}.caption`) as string,
        alt: this.translate.instant(`${key}.alt`) as string,
      };
    });
  });

  /**
   * Galería del visor. El nombre es la descripción, no el pie: también es el
   * nombre accesible del botón («Ver a pantalla completa: …») y el pie, suelto,
   * no dice qué se ve.
   */
  protected readonly gallery = computed<readonly ViewerDocument[]>(() =>
    this.photos().map((p) => ({
      src: p.src,
      srcset: [
        `${p.thumb} 480w`,
        `${p.medium} 960w`,
        `${p.src} ${p.width}w`,
        ...(p.full ? [`${p.full} 2560w`] : []),
      ].join(', '),
      thumb: p.thumb,
      name: p.alt,
      alt: p.alt,
    })),
  );
}
