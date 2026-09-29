import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { PresentationService } from '../../../core/presentation.service';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FamilyPrayerService,
  PrayerFamilyView,
} from '../../../core/services/family-prayer.service';
import { FitToBoxDirective } from '../../../shared/fit-to-box/fit-to-box.directive';
import { FamilyPhotoComponent } from '../family-photo/family-photo.component';

/** A partir de esta proporción (ancho / alto) la foto se trata como apaisada. */
const LANDSCAPE_RATIO = 1.2;

/** Caracteres de mensaje + versículo a partir de los cuales la foto cede ancho. */
const LONG_TEXT_CHARS = 260;

/**
 * Ficha de una familia: foto + quiénes son + su motivo de oración.
 *
 * **Un solo renderizador para la web y la proyección** (como la tarjeta de
 * anuncio): lo que se proyecta el domingo y lo que se lee en el móvil tras
 * escanear el QR es la misma ficha. La hoja es global (`ViewEncapsulation.None`,
 * BEM `.fcard__*`) con sus dos contextos:
 *
 *   · Web: tarjeta de dos columnas (foto · panel), apilada en móvil.
 *   · Proyección: a sangre, foto a su proporción real y panel navy con un
 *     bloque tipográfico fijo que se ajusta entero (`appFitToBox`) y se
 *     centra en vertical. Sin iconos, filetes ni numeración.
 *
 * Las acciones de la web (compartir) llegan por `<ng-content>`.
 */
@Component({
  selector: 'app-family-card',
  imports: [TranslatePipe, FitToBoxDirective, FamilyPhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  protected readonly prayer = inject(FamilyPrayerService);
  private readonly fullscreen = inject(PresentationService).isFullscreen;

  @Input({ required: true }) family!: PrayerFamilyView;
  /** Primera ficha visible al abrir: su foto no se difiere. */
  @Input() eager = false;

  /**
   * Foto apaisada (de 6:5 en adelante): cambia la maquetación. En la web va
   * arriba a todo el ancho; proyectada, con una columna más ancha. En una
   * columna pensada para retratos quedaba reducida a una tira.
   */
  protected get landscape(): boolean {
    return (this.family.photo?.ratio ?? 0) >= LANDSCAPE_RATIO;
  }

  /** Mensaje largo: en proyección la foto cede ancho al texto (`.fcard--long`). */
  protected get longText(): boolean {
    const chars =
      this.family.message.reduce((total, paragraph) => total + paragraph.length, 0) +
      (this.family.verse?.text.length ?? 0);
    return chars > LONG_TEXT_CHARS;
  }

  /**
   * Ancho al que se pinta la foto, para que el navegador elija la variante
   * (sale de la maquetación de `family-card.component.scss`):
   *   · Proyección: la columna de la foto (≤ 58 % del lienzo; apaisada ≤ 62 %).
   *   · Web ≥ md: columna de 5/12 de la ficha (~29 rem) o, apaisada, todo el
   *     ancho de la ficha (68 rem). Móvil: todo el ancho.
   */
  protected sizes(): string {
    if (this.fullscreen()) return this.landscape ? '62vw' : '58vw';
    return this.landscape ? '(max-width: 767px) 100vw, 68rem' : '(max-width: 767px) 100vw, 29rem';
  }

}
