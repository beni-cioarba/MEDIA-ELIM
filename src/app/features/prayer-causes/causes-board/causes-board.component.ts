import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PresentationService } from '../../../core/presentation.service';
import { PrayerCausesService } from '../../../core/services/prayer-causes.service';
import { FitToBoxDirective } from '../../../shared/fit-to-box/fit-to-box.directive';

/**
 * Tablero «Cauzele Bisericii Elim»: **un solo renderizador** para la web y la
 * proyección (hoja global, BEM `.causes__*` / `.cause__*`).
 *
 * Sólo tipografía —sin iconos, viñetas, contadores ni cajas— en dos zonas:
 *   1. **Por nombre** (familias, enfermos): epígrafe en versalitas y los
 *      nombres en columnas limpias, cada uno entero.
 *   2. **Por intención** (fiii risipitori, România…): panel navy con el
 *      título en oro y la intención debajo (el mismo lenguaje que las fichas
 *      de familias).
 *
 * Toda la lista en **una diapositiva**; `appFitToBox` la ajusta entera si
 * crece.
 */
@Component({
  selector: 'app-causes-board',
  imports: [TranslatePipe, FitToBoxDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './causes-board.component.html',
  styleUrl: './causes-board.component.scss',
})
export class CausesBoardComponent {
  protected readonly causes = inject(PrayerCausesService);
  protected readonly fullscreen = inject(PresentationService).isFullscreen;
}
