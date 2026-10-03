import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { isNavGroup } from '../../core/navigation/nav.model';
import { IconComponent } from '../../shared/icon/icon.component';
import { TabNavService } from './tab-nav.service';

/** Filas de relleno de una hoja suelta (no tiene páginas que listar). */
const FILAS_HOJA = [0, 1, 2];

/**
 * Vista previa de la pestaña vecina mientras se arrastra la página
 * (`SwipeTabsDirective`): lo que «asoma» por el lado, como la sección
 * siguiente en WhatsApp.
 *
 * Reproduce lo primero que se ve al llegar —la cabecera navy de la sección
 * con su icono, nombre y entradilla— y debajo sus páginas como tarjetas en
 * reposo (en una hoja suelta, tarjetas de relleno). No carga nada: sale de
 * `MAIN_NAV` y de las traducciones, que ya están en memoria.
 *
 * Su posición no pasa por Angular: la fija el CSS con las variables que
 * escribe el gesto en el `<html>` (`--swipe-dx`, `--swipe-top`) y las clases
 * `is-swipe-settling` / `is-swipe-reveal`.
 */
@Component({
  selector: 'app-swipe-peek',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  host: {
    'aria-hidden': 'true',
    '[class.is-next]': "peek()?.direction === 'next'",
    '[class.is-prev]': "peek()?.direction === 'prev'",
  },
  template: `
    @if (peek(); as asoma) {
      <div class="peek__hero">
        @if (children().length > 0) {
          <span class="peek__eyebrow">
            @if (asoma.tab.icon; as icono) {
              <app-icon [name]="icono" />
            }
            {{ 'nav_hub.eyebrow' | translate: { count: children().length } }}
          </span>
        }
        <span class="peek__title">{{ asoma.tab.labelKey | translate }}</span>
        @if (asoma.tab.descriptionKey) {
          <span class="peek__lead">{{ asoma.tab.descriptionKey | translate }}</span>
        }
      </div>
      <div class="peek__rows">
        @for (hijo of children(); track hijo.id) {
          <span class="peek__row">
            <span class="peek__tile">
              @if (hijo.icon; as icono) {
                <app-icon [name]="icono" />
              }
            </span>
            <span class="peek__label">{{ hijo.labelKey | translate }}</span>
          </span>
        } @empty {
          @for (fila of filasHoja; track fila) {
            <span class="peek__row peek__row--ghost">
              <span class="peek__tile"></span>
              <span class="peek__bar"></span>
            </span>
          }
        }
      </div>
    }
  `,
  styleUrl: './swipe-peek.component.scss',
})
export class SwipePeekComponent {
  protected readonly peek = inject(TabNavService).peek;
  protected readonly filasHoja = FILAS_HOJA;

  protected readonly children = computed(() => {
    const tab = this.peek()?.tab;
    return tab && isNavGroup(tab) ? tab.children : [];
  });
}
