import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { IconComponent } from '../../shared/icon/icon.component';
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
 * Maquetación (29/09/2026): todo en una pantalla — el porqué a la
 * izquierda y la **tarjeta de donación** a la derecha (Bizum primero, cuentas
 * por divisa con copiar, titular/banco/BIC en pequeño). Ver la plantilla.
 *
 * Los datos bancarios viven en `church.config.ts` (reales desde el
 * 29/09/2026: una cuenta en euros en BBVA). Lo que falte va a `null` y la
 * tarjeta no lo pinta.
 */
@Component({
    selector: 'app-donate',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        TranslatePipe,
        IconComponent,
        CopyButtonComponent,
    ],
    templateUrl: './donate.component.html',
    styleUrl: './donate.component.scss'
})
export class DonateComponent {
  private readonly config = inject(CHURCH_CONFIG);

  protected readonly donations = this.config.donations;

  protected readonly links = {
    contact: `/${APP_PATHS.contact}`,
    leadership: `/${APP_PATHS.leadership}`,
  } as const;

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  /**
   * Ejemplos de concepto para la transferencia (lista en i18n,
   * `donate.bank.concepts`). Relee el idioma activo para cambiar con él.
   */
  protected readonly concepts = computed<readonly string[]>(() => {
    this.language.current();
    const list: unknown = this.translate.instant('donate.bank.concepts');
    return Array.isArray(list) ? (list as string[]) : [];
  });

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

  /** Teléfono de Bizum agrupado de tres en tres para leerlo («600 000 000»). */
  protected grouped(phone: string): string {
    return phone.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ');
  }
}
