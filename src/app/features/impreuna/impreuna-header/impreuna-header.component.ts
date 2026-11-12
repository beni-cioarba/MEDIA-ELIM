import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * Cabecera de Proiectul Împreună: qué es, en qué día del año vamos y las
 * pestañas del módulo (Hoy · Plan completo · Cómo funciona). Banda navy
 * compacta: identifica sin empujar el contenido del día fuera de la pantalla.
 */
@Component({
  selector: 'app-impreuna-header',
  imports: [RouterLink, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './impreuna-header.component.html',
  styleUrl: './impreuna-header.component.scss',
})
export class ImpreunaHeaderComponent {
  private readonly impreuna = inject(ImpreunaService);

  /** Pestaña activa. */
  readonly active = input.required<'day' | 'plan'>();
  /** La entradilla sólo en la portada del módulo. */
  readonly showLead = input(false);

  protected readonly year = this.impreuna.edition.year;
  protected readonly total = this.impreuna.edition.total;
  protected readonly today = this.impreuna.today;
  protected readonly percent = computed(() => {
    const { status, day } = this.today();
    if (status === 'before') return 0;
    if (status === 'ended') return 100;
    return Math.round((day / this.total) * 100);
  });

  protected readonly paths = {
    day: `/${APP_PATHS.impreuna}`,
    plan: `/${APP_PATHS.impreuna}/${APP_PATHS.impreunaPlan}`,
  };
}
