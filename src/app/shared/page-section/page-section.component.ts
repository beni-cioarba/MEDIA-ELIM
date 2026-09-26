import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Envoltura estándar de una sección de página: ancho máximo, ritmo vertical
 * y cabecera (antetítulo + título + subtítulo).
 *
 * Existe para que todas las páginas nuevas hereden el mismo ritmo tipográfico
 * sin copiar y pegar estilos. El contenido se proyecta con `<ng-content>`.
 */
@Component({
    selector: 'app-page-section',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslatePipe],
    template: `
    <section class="section" [class.section--tinted]="tinted" [attr.id]="anchor">
      <div class="section__inner">
        @if (titleKey) {
          <header class="section__head" [class.section__head--center]="align === 'center'">
            @if (eyebrowKey) {
              <p class="section__eyebrow">{{ eyebrowKey | translate }}</p>
            }
            <h2 class="section__title">{{ titleKey | translate }}</h2>
            @if (subtitleKey) {
              <p class="section__subtitle">{{ subtitleKey | translate }}</p>
            }
          </header>
        }
        <ng-content />
      </div>
    </section>
  `,
    styles: [
        `
      :host {
        display: block;
      }

      /* Ritmo vertical de producto: secciones más juntas. Antes cada bloque
         flotaba en aire muerto; ahora la página se recorre, no se pasea. */
      .section {
        padding-block: clamp(2rem, 4.5vh, 3.25rem);
        padding-inline: var(--page-gutter);
      }

      /* Tinte PLANO, no degradado: las referencias alternan secciones con un
         tono liso; un degradado hasta el lienzo deja un borde difuso que en
         pantallas grandes se ve como una banda sucia. */
      .section--tinted {
        background: var(--c-bg-cool);
      }

      /*
       * La misma rejilla que la portada y que la cabecera de página.
       *
       * Estaba en --w-content (1.180 px) con un relleno propio, así que el
       * contenido de cualquier sección caía en x=161 mientras la marca de la
       * barra caía en 45. Sumado a la cabecera compartida, que se centraba en
       * 52 rem y caía en 309, había cuatro márgenes izquierdos distintos en la
       * misma pantalla.
       *
       * El ancho de lectura no se pierde: lo pone quien lo necesita —la
       * cabecera de sección aquí abajo, y cada página en sus párrafos—, que es
       * donde tiene sentido. Una sección con tarjetas no quiere 1.180 px de
       * tope; quiere el ancho de la página.
       */
      .section__inner {
        max-width: var(--page-max);
        margin-inline: auto;
      }

      /* Alineada a la izquierda por defecto, como ya estaba decidido: lo que
         faltaba era quitarle el centrado de la caja, que la empujaba al
         medio aunque el texto fuera a la izquierda. */
      .section__head {
        max-width: 46rem;
        margin: 0 0 clamp(1.25rem, 3vh, 1.75rem);
        text-align: start;
      }

      /* Centrado explícito: lo piden los bloques de cierre. */
      .section__head--center {
        margin-inline: auto;
        text-align: center;
      }

      .section__head > p {
        margin-inline: 0;
      }

      .section__head--center > p {
        margin-inline: auto;
      }

      .section__eyebrow {
        margin: 0 0 0.35rem;
        font-size: var(--fs-xs);
        font-weight: 700;
        letter-spacing: var(--ls-caps);
        text-transform: uppercase;
        color: var(--c-gold-deep);
      }

      .section__title {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: var(--fs-h2);
        line-height: 1.15;
        letter-spacing: var(--ls-h2);
        color: var(--c-primary);
      }

      .section__subtitle {
        margin: 0.5rem 0 0;
        font-size: var(--fs-sm);
        line-height: 1.55;
        color: var(--c-muted);
      }
    `,
    ]
})
export class PageSectionComponent {
  /** Clave i18n del antetítulo (opcional). */
  @Input() eyebrowKey?: string;
  /** Clave i18n del título. Sin ella no se renderiza la cabecera. */
  @Input() titleKey?: string;
  /** Clave i18n del subtítulo (opcional). */
  @Input() subtitleKey?: string;
  /** Fondo con velo frío para alternar secciones. Admite atributo suelto: `tinted`. */
  @Input({ transform: booleanAttribute }) tinted = false;
  /** Alineación de la cabecera. */
  /**
   * Alineación de la cabecera. **Por defecto a la izquierda**: es donde
   * empieza la lectura y donde la esperan las rejillas que van debajo
   * (patrón de Coursera / Google Store). El centrado se pide a mano para la
   * portada y los bloques de cierre.
   */
  @Input() align: 'center' | 'start' = 'start';
  /** `id` del elemento, para enlaces con ancla. */
  @Input() anchor?: string;
}
