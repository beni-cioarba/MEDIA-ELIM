import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { iconShape } from '../../core/ui/icon-registry';
import { IconName } from '../../core/ui/icon-name';

/**
 * `<app-icon name="…">` — icono del catálogo propio, en SVG en línea.
 *
 *  1. **Seguridad de tipos**: `name` es `IconName`; con `strictTemplates` un
 *     icono inexistente rompe la compilación (una errata no llega al templo).
 *  2. **Un único punto de cambio**: el catálogo (`core/ui/icon-registry.ts`).
 *  3. Mide `1em`: se escala con el `font-size` del contexto, como el texto.
 *
 * Sin Angular Material desde el 17/11/2026: antes envolvía `<mat-icon>` y el
 * registro de iconos de Material, que entraban en el arranque de todas las
 * páginas sólo por esto. El dibujo es el mismo.
 *
 * Decorativo siempre (`aria-hidden`): el nombre accesible lo pone el
 * control que lo contiene.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--elim-icon-stroke]': 'strokeWidth()' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="shape().viewBox"
      [class.filled]="shape().filled"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of shape().paths; track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
      line-height: 0;
    }

    /* 1em, no 100%: hay anfitriones que agrandan la caja (un círculo de 44 px
       con el icono de 20 dentro) y el dibujo sigue midiendo lo que su texto. */
    svg {
      display: block;
      flex: none;
      width: 1em;
      height: 1em;
      overflow: visible;
      /* Trazo uniforme y escalable (los iconos son de línea, estilo Lucide). */
      fill: none;
      stroke: currentColor;
      stroke-width: var(--elim-icon-stroke, 1.8);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    path {
      vector-effect: non-scaling-stroke;
    }

    /* Los de relleno (copiados de Material Symbols: FilledIcon del catálogo). */
    svg.filled {
      fill: currentColor;
      stroke: none;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();

  /**
   * Grosor del trazo. Súbelo (≈2.2) en superficies proyectadas: un trazo de
   * 1.8 px se difumina en un proyector de 3 000 lúmenes.
   */
  readonly strokeWidth = input(1.8);

  protected readonly shape = computed(() => iconShape(this.name()));
}
