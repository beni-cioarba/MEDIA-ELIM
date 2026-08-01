import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { IconComponent } from '../../shared/icon/icon.component';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { CopyButtonComponent } from '../../shared/copy-button/copy-button.component';
import { IconName } from '../../core/ui/icon-name';

/** Destino de los donativos (sólo el identificador; el texto va en i18n). */
interface Purpose {
  readonly id: string;
  readonly icon: IconName;
}

/**
 * Página de donativos.
 *
 * Criterios de una página de donación que funciona (y que aquí se aplican):
 *  1. **Primero el porqué, después el cómo.** Nadie da dinero a un IBAN
 *     suelto: antes hay que decir a qué se destina.
 *  2. **Transparencia por delante**: se enumeran los destinos concretos.
 *  3. **Cero fricción al copiar**: el IBAN se copia con un botón, sin
 *     espacios, porque transcribirlo a mano es la principal causa de
 *     transferencias devueltas.
 *  4. **Nada de presión.** El versículo de 2 Corintios 9:7 marca el tono:
 *     donación voluntaria y alegre, no cuota.
 *
 * Los datos bancarios viven en `church.config.ts` y hoy son **de
 * demostración**; la propia página lo advierte mientras sigan siéndolo.
 */
@Component({
  selector: 'app-donate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    PageSectionComponent,
    IconComponent,
    CopyButtonComponent,
  ],
  templateUrl: './donate.component.html',
  styleUrl: './donate.component.scss',
})
export class DonateComponent {
  private readonly config = inject(CHURCH_CONFIG);

  protected readonly donations = this.config.donations;

  protected readonly links = {
    contact: `/${APP_PATHS.contact}`,
    about: `/${APP_PATHS.about}`,
  } as const;

  protected readonly purposes: readonly Purpose[] = [
    { id: 'mission', icon: 'church' },
    { id: 'building', icon: 'home' },
    { id: 'outreach', icon: 'heart' },
    { id: 'media', icon: 'play' },
  ];

  /**
   * Los IBAN se copian sin espacios: la banca electrónica los rechaza o los
   * normaliza según el banco, y el usuario no tiene por qué saberlo.
   */
  protected plain(iban: string): string {
    return iban.replace(/\s+/g, '');
  }
}
