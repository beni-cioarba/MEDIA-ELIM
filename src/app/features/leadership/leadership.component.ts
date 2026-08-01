import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * «Órgano de liderazgo»: cómo está estructurada y gobernada la iglesia.
 *
 * La página muestra siempre la **estructura** (grupos y funciones), que es
 * estable, y añade los nombres cuando existen en `CHURCH_CONFIG.leadership`.
 * Un grupo sin miembros se marca como pendiente de confirmar en lugar de
 * quedarse vacío o mostrar datos inventados.
 */
@Component({
  selector: 'app-leadership',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, PageSectionComponent, IconComponent],
  templateUrl: './leadership.component.html',
  styleUrl: './leadership.component.scss',
})
export class LeadershipComponent {
  protected readonly config = inject(CHURCH_CONFIG);

  protected readonly links = {
    about: `/${APP_PATHS.about}`,
    location: blockPath('location'),
  } as const;
}
