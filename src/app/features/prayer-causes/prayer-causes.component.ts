import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrayerCausesService } from '../../core/services/prayer-causes.service';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CausesBoardComponent } from './causes-board/causes-board.component';

/**
 * «Cauzele Bisericii Elim» — página `/cauze-de-rugaciune`.
 *
 * Cabecera + el mismo tablero que se proyecta + la fecha de la última
 * revisión de la lista (que no caduca: se actualiza a mano).
 */
@Component({
  selector: 'app-prayer-causes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, PageSectionComponent, IconComponent, CausesBoardComponent],
  template: `
    <header class="page-hero">
      <div class="page-hero__inner">
        <p class="page-hero__eyebrow">{{ 'prayer_causes.eyebrow' | translate }}</p>
        <h1 class="page-hero__title">{{ 'prayer_causes.title' | translate }}</h1>
        <p class="page-hero__lead">{{ 'prayer_causes.lead' | translate }}</p>
      </div>
    </header>

    <app-page-section>
      <div class="pc">
        <app-causes-board />
        <p class="pc__updated">
          <app-icon name="clock" />
          {{ 'prayer_causes.updated' | translate: { date: causes.formatUpdated() } }}
        </p>
      </div>
    </app-page-section>
  `,
  styles: `
    @use 'ds' as *;
    @use '../../shared/styles/page-hero' as *;

    :host {
      display: block;
    }

    /* Toda la columna común, como el resto de páginas (antes, tope de
       68 rem que dejaba vacío el tercio derecho en pantalla ancha). */
    .pc {
      display: grid;
      gap: var(--sp-4);
    }

    .pc__updated {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--c-muted);
    }
  `,
})
export class PrayerCausesComponent {
  protected readonly causes = inject(PrayerCausesService);
}
