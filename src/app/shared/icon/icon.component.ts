import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  computed,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ELIM_ICON_NAMESPACE } from '../../core/ui/icon-registry';
import { IconName } from '../../core/ui/icon-name';

/**
 * `<app-icon>` — envoltorio **tipado** sobre `<mat-icon>`.
 *
 * ¿Por qué un envoltorio y no `<mat-icon svgIcon="elim:home">` a pelo?
 *  1. **Seguridad de tipos**: `name` es `IconName`, así que con
 *     `strictTemplates` un icono inexistente rompe la compilación.
 *     `svgIcon` es `string`: una errata sólo se ve en runtime (y en la
 *     pantalla del templo, en mitad del culto).
 *  2. **Un único punto de cambio**: si mañana migramos a otra librería
 *     de iconos, se toca aquí y no en 40 plantillas.
 *  3. Ajusta el tamaño al `font-size` del contexto (`1em`), que es como
 *     se comporta el resto del sistema tipográfico.
 *
 * Para iconografía puntual que no esté en el catálogo, usa directamente
 * la fuente de Google:
 * `<mat-icon fontIcon="volunteer_activism" />`
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-icon class="elim-icon" [svgIcon]="svgIcon()" aria-hidden="true" />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1em;
        height: 1em;
        line-height: 0;
      }

      .mat-icon {
        width: 1em;
        height: 1em;
        font-size: inherit;
      }
    `,
  ],
})
export class IconComponent {
  private readonly _name = signal<IconName>('home');

  @Input({ required: true })
  set name(value: IconName) {
    this._name.set(value);
  }

  /**
   * Grosor del trazo. Súbelo (≈2.2) en superficies proyectadas: un trazo
   * de 1.8 px se difumina en un proyector de 3 000 lúmenes.
   * Se propaga como custom property para que la lea `.elim-icon svg`.
   */
  @HostBinding('style.--elim-icon-stroke')
  @Input()
  strokeWidth = 1.8;

  protected readonly svgIcon = computed(
    () => `${ELIM_ICON_NAMESPACE}:${this._name()}`,
  );
}
