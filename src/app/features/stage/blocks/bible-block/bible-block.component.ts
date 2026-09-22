import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BibleReadingService } from '../../../../core/services/bible-reading.service';
import { PresentationService } from '../../../../core/presentation.service';
import { IconComponent } from '../../../../shared/icon/icon.component';

/**
 * Bloque «Citirea Bibliei»: la semana del plan de lectura que toca anunciar.
 *
 * Qué semana es lo decide `BibleReadingService` (la que contiene *mañana*:
 * el domingo ya se proyecta la semana que empieza el lunes). Aquí sólo se
 * pinta, con la jerarquía que se lee de lejos:
 *
 *   1. El **tramo de la semana** («Isaia 57-66, Ieremia 1-4») en un panel
 *      navy con el número de semana: es lo que se anuncia en voz alta.
 *   2. Las **lecturas diarias**, lunes→domingo, con el día de hoy resaltado y
 *      los pasados atenuados.
 *   3. El plan y el tramo del mes, como pie.
 *
 * Lleva su propia hoja global (`ViewEncapsulation.None`, BEM `.bible__*`)
 * con las secciones web y proyección, como la tarjeta de anuncio: la hoja del
 * escenario está al límite de su presupuesto y cada bloque nuevo es dueño de
 * sus dos contextos.
 */
@Component({
    selector: 'app-bible-block',
    imports: [TranslatePipe, IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    templateUrl: './bible-block.component.html',
    styleUrl: './bible-block.component.scss'
})
export class BibleBlockComponent {
  protected readonly bible = inject(BibleReadingService);
  private readonly presentation = inject(PresentationService);

  protected readonly fullscreen = this.presentation.isFullscreen;
  protected readonly week = this.bible.announcedWeek;
}
