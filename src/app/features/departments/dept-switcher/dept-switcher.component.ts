import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DEPARTMENTS } from '../../../core/departments.config';
import { APP_PATHS, DepartmentId, departmentPath } from '../../../core/navigation/app-paths';

/**
 * Acceso rápido entre departamentos: una fila de pestañas de texto pegada
 * bajo la cabecera mientras se baja por la página (sin iconos desde el
 * 19/11/2026: más limpio y caben más a la vista).
 *
 * Es la respuesta a «estoy en Cor y quiero ir a Tineret» sin volver al menú:
 * en el teléfono el panel de la cabecera no existe y el cajón queda a dos
 * toques. Con más departamentos la fila se desliza en horizontal (con
 * desvanecido en los bordes) y la activa se centra sola al llegar.
 *
 * `data-no-swipe`: deslizar la fila no debe cambiar de pestaña.
 */
@Component({
  selector: 'app-dept-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <nav class="switch" [attr.aria-label]="'departments.switcher' | translate" data-no-swipe>
      <ul class="switch__list" role="list">
        <li>
          <a
            class="switch__chip switch__chip--all"
            [class.is-active]="active() === null"
            [attr.aria-current]="active() === null ? 'page' : null"
            [routerLink]="hubPath"
          >
            {{ 'departments.all' | translate }}
          </a>
        </li>
        @for (item of items; track item.id) {
          <li>
            <a
              class="switch__chip"
              [class.is-active]="active() === item.id"
              [attr.aria-current]="active() === item.id ? 'page' : null"
              [routerLink]="item.path"
            >
              {{ 'departments.' + item.id + '.name' | translate }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './dept-switcher.component.scss',
})
export class DeptSwitcherComponent {
  /** Departamento en el que se está (`null` = la portada). */
  readonly active = input<DepartmentId | null>(null);

  protected readonly hubPath = `/${APP_PATHS.departments}`;
  protected readonly items = DEPARTMENTS.map((d) => ({
    id: d.id,
    path: departmentPath(d.id),
  }));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    // La activa, a la vista: en el teléfono «Evanghelizare» queda fuera por
    // la derecha. Sólo desplaza la fila, nunca la página.
    // Tras cargar las fuentes: con la de reserva las pastillas miden otra
    // cosa y el cálculo dejaba la activa cortada contra el borde.
    afterNextRender(() => {
      const center = (): void => {
        const list = host.nativeElement.querySelector<HTMLElement>('.switch__list');
        const chip = list?.querySelector<HTMLElement>('.is-active');
        if (!list || !chip || list.scrollWidth <= list.clientWidth) return;
        const target = chip.offsetLeft - list.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2;
        list.scrollTo({ left: target, behavior: 'instant' });
      };
      void (document.fonts?.ready ?? Promise.resolve()).then(center);
    });
  }
}
