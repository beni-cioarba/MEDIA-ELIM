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
          <header class="section__head" [class.section__head--start]="align === 'start'">
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
        padding: clamp(2rem, 4.5vh, 3.25rem) clamp(1rem, 4vw, 2.5rem);
      }

      /* Tinte PLANO, no degradado: las referencias alternan secciones con un
         tono liso; un degradado hasta el lienzo deja un borde difuso que en
         pantallas grandes se ve como una banda sucia. */
      .section--tinted {
        background: var(--c-bg-cool);
      }

      .section__inner {
        max-width: var(--w-content);
        margin: 0 auto;
      }

      .section__head {
        max-width: 46rem;
        margin: 0 auto clamp(1.25rem, 3vh, 1.75rem);
        text-align: center;
      }

      .section__head--start {
        margin-inline: 0;
        text-align: start;
      }

      /* El \`max-width\` de prosa de \`p\` dejaría estos textos pegados a la
         izquierda dentro de la cabecera centrada: hay que centrar la caja. */
      .section__head > p {
        margin-inline: auto;
      }

      .section__head--start > p {
        margin-inline: 0;
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
