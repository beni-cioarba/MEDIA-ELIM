import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../core/ui/icon-name';
import { CREDO_ARTICLE_COUNT, CREDO_PARTS } from '../credo/credo.data';

/** Pilar de identidad (misión, visión, valores…). */
interface Pillar {
  readonly id: string;
  readonly icon: IconName;
}

/**
 * «Quiénes somos»: historia, identidad, confesión de fe y qué esperar en una
 * primera visita.
 *
 * Los identificadores de los bloques (`pillars`, `expectations`) viven aquí
 * como datos; los textos, en `about.*` de los ficheros i18n. La confesión de
 * fe sólo se resume: el documento íntegro es su propia página
 * (`features/credo`), porque son 30 artículos y aquí sólo cabe el mapa.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, PageSectionComponent, IconComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  protected readonly config = inject(CHURCH_CONFIG);

  protected readonly links = {
    leadership: `/${APP_PATHS.leadership}`,
    credo: `/${APP_PATHS.credo}`,
    weekly: blockPath('weekly'),
    location: blockPath('location'),
  } as const;

  protected readonly pillars: readonly Pillar[] = [
    { id: 'mission', icon: 'church' },
    { id: 'vision', icon: 'sparkles' },
    { id: 'community', icon: 'users' },
    { id: 'service', icon: 'heart' },
  ];

  /**
   * Partes de la confesión de fe, sólo para el avance de esta página.
   * La fuente única sigue siendo `features/credo/credo.data.ts`.
   */
  protected readonly credoParts = CREDO_PARTS;
  protected readonly credoTotal = CREDO_ARTICLE_COUNT;

  /** Qué encontrará alguien que nos visita por primera vez. */
  protected readonly expectations: readonly Pillar[] = [
    { id: 'welcome', icon: 'users' },
    { id: 'worship', icon: 'music' },
    { id: 'word', icon: 'book' },
    { id: 'family', icon: 'heart' },
  ];

  protected readonly years = computed(
    () => new Date().getFullYear() - this.config.foundedYear,
  );
}
