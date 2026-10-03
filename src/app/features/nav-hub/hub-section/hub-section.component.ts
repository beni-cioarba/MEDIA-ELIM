import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../../shared/icon/icon.component';

let siguienteId = 0;

/**
 * Sección de una portada de sección: rótulo, dato al lado («· 28 sept – 4
 * oct») y «Vezi tot» a la derecha; el contenido va proyectado.
 *
 * Existe para que los destacados de las tres portadas tengan la misma
 * cabecera sin repetir su marcado ni su CSS en cada uno.
 */
@Component({
  selector: 'app-hub-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  template: `
    <section class="hs" [attr.aria-labelledby]="headingId">
      <header class="hs__head">
        <h2 class="hs__title" [id]="headingId">
          {{ titleKey() | translate }}
          @if (meta(); as dato) {
            <span class="hs__meta">· {{ dato }}</span>
          }
        </h2>
        @if (link(); as destino) {
          <a class="hs__all" [routerLink]="destino">
            {{ linkLabelKey() | translate }}
            <app-icon name="arrow-right" />
          </a>
        }
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .hs__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.7rem;
    }

    .hs__title {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--c-gold-deep);
    }

    .hs__meta {
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: none;
      color: var(--c-muted);
    }

    .hs__all {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--c-primary);
      text-decoration: none;
      white-space: nowrap;

      app-icon {
        font-size: 0.9rem;
        transition: transform var(--mo-fast) var(--ea-standard);
      }

      &:hover app-icon {
        transform: translateX(3px);
      }

      &:focus-visible {
        outline: 2px solid var(--c-focus);
        outline-offset: 3px;
        border-radius: 4px;
      }
    }
  `,
})
export class HubSectionComponent {
  readonly titleKey = input.required<string>();
  /** Dato junto al rótulo, ya formateado (rango de fechas, recuento…). */
  readonly meta = input<string | null>(null);
  /** Destino de «Vezi tot» (ruta interna). Sin él no se pinta. */
  readonly link = input<string | null>(null);
  readonly linkLabelKey = input('home.board.all');

  protected readonly headingId = `hub-section-${++siguienteId}`;
}
