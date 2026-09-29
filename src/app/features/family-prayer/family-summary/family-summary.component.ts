import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FamilyPrayerService,
  PrayerWeekView,
} from '../../../core/services/family-prayer.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { FamilyPhotoComponent } from '../family-photo/family-photo.component';

/**
 * Resumen de la semana: **por quiénes oramos**, antes de las fichas.
 *
 * Cabecera de la página web: mosaico de fotos (fila por familia en móvil);
 * cada una salta a su ficha más abajo (`#id`). En la proyección el resumen
 * es otro componente (`FamilyCollageComponent`): collage justificado + lista.
 */
@Component({
  selector: 'app-family-summary',
  imports: [RouterLink, TranslatePipe, IconComponent, FamilyPhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './family-summary.component.html',
  styleUrl: './family-summary.component.scss',
})
export class FamilySummaryComponent {
  protected readonly prayer = inject(FamilyPrayerService);

  @Input({ required: true }) week!: PrayerWeekView;

}
