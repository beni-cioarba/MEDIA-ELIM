import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DEPARTMENTS } from '../../core/departments.config';
import { departmentPath } from '../../core/navigation/app-paths';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Destacado del panel «Departamente» en la cabecera de escritorio: una
 * miniatura por departamento (su foto, o el icono sobre navy si no la tiene).
 * La cabecera del bloque («Ver todo») la pone el panel, como en los demás.
 *
 * Vive en su propio componente para cargarse con `@defer` al abrir el panel:
 * la cabecera es eager y esto (plantilla, estilos y datos) costaba ~3 kB del
 * arranque para algo que sólo ve quien abre ese menú.
 */
@Component({
  selector: 'app-departments-aside',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  template: `
    <ul class="grid" role="list" aria-labelledby="nav-aside-title">
      @for (dep of items; track dep.id) {
        <li>
          <a class="tile" [routerLink]="dep.path" (click)="ui.closeAll()">
            @if (dep.thumb; as src) {
              <img class="img" [src]="src" alt="" decoding="async" />
            } @else {
              <app-icon class="mark" [name]="dep.icon" />
            }
            <span class="name">
              <app-icon [name]="dep.icon" />
              {{ 'departments.' + dep.id + '.name' | translate }}
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './departments-aside.component.scss',
})
export class DepartmentsAsideComponent {
  protected readonly ui = inject(UiStore);
  protected readonly items = DEPARTMENTS.map((d) => ({
    id: d.id,
    icon: d.icon,
    thumb: d.cover?.thumb ?? null,
    path: departmentPath(d.id),
  }));
}
