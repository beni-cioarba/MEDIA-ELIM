import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavItem } from '../../core/navigation/nav.model';
import { IconComponent } from '../icon/icon.component';

/** Entrada de la migaja ya resuelta para plantilla. */
interface Crumb {
  readonly id: string;
  readonly labelKey: string;
  /** `null` en los grupos (no tienen página propia) y en la página actual. */
  readonly path: string | null;
  /** La portada se representa con un icono: ahorra ancho y se reconoce antes. */
  readonly isHome: boolean;
}

const HOME = MAIN_NAV.find((item) => item.id === 'home');

/**
 * `<app-breadcrumb>` — migaja de pan compacta bajo la cabecera.
 *
 * No recalcula nada: se apoya en `NavActiveService.trail`, que ya resuelve
 * el rastro `[grupo, hoja]` por coincidencia más larga. Así el menú y la
 * migaja no pueden discrepar nunca.
 *
 * Decisiones de diseño:
 *  - Se oculta en la portada: una migaja de un solo nivel es ruido.
 *  - Los grupos («Biserica», «Media») no son enlaces porque no tienen
 *    página índice; se pintan como texto para no prometer un destino que
 *    no existe.
 *  - En móvil se desplaza en horizontal en vez de partirse en dos líneas:
 *    mantiene la altura estable (cero CLS) y el último nivel visible.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, TranslateModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length > 1) {
      <nav class="crumbs" [attr.aria-label]="'nav.breadcrumb' | translate">
        <ol class="crumbs__list">
          @for (crumb of crumbs(); track crumb.id; let last = $last) {
            <li class="crumbs__item">
              @if (crumb.path) {
                <a
                  class="crumbs__link"
                  [class.crumbs__link--home]="crumb.isHome"
                  [routerLink]="crumb.path"
                >
                  @if (crumb.isHome) {
                    <app-icon name="home" />
                    <span class="u-sr-only">{{ crumb.labelKey | translate }}</span>
                  } @else {
                    {{ crumb.labelKey | translate }}
                  }
                </a>
              } @else {
                <span
                  class="crumbs__text"
                  [class.crumbs__text--current]="last"
                  [attr.aria-current]="last ? 'page' : null"
                >
                  {{ crumb.labelKey | translate }}
                </span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  private readonly trail = inject(NavActiveService).trail;

  protected readonly crumbs = computed<readonly Crumb[]>(() => {
    const trail = this.trail();
    // Portada o ruta desconocida: nada que migar.
    if (trail.length === 0 || trail[0]?.id === 'home') return [];

    const rest = trail.map((item, index) => toCrumb(item, index === trail.length - 1));
    return HOME ? [toCrumb(HOME, false), ...rest] : rest;
  });
}

function toCrumb(item: NavItem, isCurrent: boolean): Crumb {
  return {
    id: item.id,
    labelKey: item.labelKey,
    path: isCurrent ? null : (item.path ?? null),
    isHome: item.id === 'home',
  };
}
