import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Envoltura estándar de una sección de página: ancho máximo, ritmo vertical
 * y cabecera (antetítulo + título + subtítulo).
 *
 * Existe para que todas las páginas nuevas hereden el mismo ritmo tipográfico
 * sin copiar y pegar estilos. El contenido se proyecta con `<ng-content>`.
 */
@Component({
  selector: 'app-page-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
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

      .section {
        padding: clamp(2.6rem, 7vh, 5rem) clamp(1rem, 4vw, 2.5rem);
      }

      .section--tinted {
        background: linear-gradient(180deg, var(--c-bg-cool) 0%, var(--c-bg) 100%);
      }

      .section__inner {
        max-width: 1180px;
        margin: 0 auto;
      }

      .section__head {
        max-width: 46rem;
        margin: 0 auto clamp(1.6rem, 4vh, 2.6rem);
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
        margin: 0 0 0.5rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--c-gold-deep);
      }

      .section__title {
        margin: 0;
        font-family: var(--font-serif);
        font-weight: 600;
        font-size: clamp(1.5rem, 3.2vw, 2.35rem);
        line-height: 1.18;
        color: var(--c-primary);
      }

      .section__subtitle {
        margin: 0.7rem 0 0;
        font-size: clamp(0.95rem, 1.4vw, 1.05rem);
        line-height: 1.6;
        color: var(--c-muted);
      }
    `,
  ],
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
  @Input() align: 'center' | 'start' = 'center';
  /** `id` del elemento, para enlaces con ancla. */
  @Input() anchor?: string;
}
