import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CREDO_ARTICLE_COUNT, CREDO_PARTS } from './credo.data';

/**
 * Confesión de fe completa (30 artículos en cuatro partes).
 *
 * Es un documento largo y de consulta, así que la página se organiza como
 * tal: sumario navegable arriba, una sección por parte y cada artículo en un
 * `<details>` nativo (accesible, indexable y sin JavaScript).
 *
 * Todo el texto vive en `credo.*` de los ficheros i18n; la estructura, en
 * `credo.data.ts`.
 */
@Component({
  selector: 'app-credo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, PageSectionComponent, IconComponent],
  templateUrl: './credo.component.html',
  styleUrl: './credo.component.scss',
})
export class CredoComponent {
  protected readonly parts = CREDO_PARTS;
  protected readonly total = CREDO_ARTICLE_COUNT;

  protected readonly links = {
    about: `/${APP_PATHS.about}`,
    leadership: `/${APP_PATHS.leadership}`,
  } as const;
}
