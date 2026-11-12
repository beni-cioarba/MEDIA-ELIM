import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PassageRef } from '../../../core/bible/bible-refs';
import { youversionDayUrl } from '../../../core/impreuna/impreuna.config';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { DayKind } from '../../../core/impreuna/impreuna-plan';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { BibleOptionsComponent } from '../../../shared/bible/bible-options.component';
import { BiblePassagesComponent } from '../../../shared/bible/bible-passages.component';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * **Citirea zilei** — la tarjeta de leer y escuchar el texto del día en
 * Proiectul Împreună: las filas compartidas (`app-bible-passages`: abrir en la
 * app Biblia si está, versículos, minutos, audio) y un pie con la versión y
 * la tienda (`app-bible-options`), el día en el plan de la app y, proyectadas
 * desde la página, las acciones del día («Am citit», «Trimite»):
 * `<… readTools>`.
 *
 * Docs: 32-impreuna.md → Diseño («Citirea zilei»).
 */
@Component({
  selector: 'app-impreuna-read',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent, BiblePassagesComponent, BibleOptionsComponent],
  templateUrl: './day-read.component.html',
  styleUrl: './day-read.component.scss',
})
export class DayReadComponent {
  readonly refs = input.required<readonly PassageRef[]>();
  readonly day = input.required<number>();
  /** Día del plan en YouVersion (desde el 82 va uno por delante). */
  readonly youversionDay = input.required<number>();
  readonly kind = input<DayKind>('nt');

  private readonly impreuna = inject(ImpreunaService);

  /** Adónde vuelve Chrome en Android si no está la app: esta misma página del día. */
  protected readonly returnPath = computed(() => `${APP_PATHS.impreuna}/${APP_PATHS.impreunaDay}/${this.day()}`);

  protected readonly planDayUrl = computed(() =>
    youversionDayUrl(this.impreuna.edition.youversionPlan, this.youversionDay()),
  );
}
