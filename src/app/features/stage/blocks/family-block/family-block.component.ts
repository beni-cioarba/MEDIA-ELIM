import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PrayerFamilyView,
  PrayerWeekView,
} from '../../../../core/services/family-prayer.service';
import { FamilyCardComponent } from '../../../family-prayer/family-card/family-card.component';
import { FamilyCollageComponent } from '../../../family-prayer/family-collage/family-collage.component';

/**
 * Bloque «Rugăciune pentru familii»: **el resumen y, detrás, una ficha por
 * familia** (`PresentationBlocksService.expand`).
 *
 * Delega en los mismos componentes que la página web: lo que se proyecta y
 * lo que se abre en el móvil con el QR es idéntico. Sin semana vigente
 * (bloque forzado a visible) pinta el estado vacío, para que el operador
 * entienda la pantalla.
 */
@Component({
  selector: 'app-family-block',
  imports: [TranslatePipe, FamilyCardComponent, FamilyCollageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (family) {
      <!-- \`eager\`: proyectadas, las fotos no pueden esperar a entrar en
           pantalla (quedaba un segundo de marco vacío en cada ficha). -->
      <app-family-card [family]="family" [eager]="true" />
    } @else if (week) {
      <!-- Resumen proyectado: collage de fotos + lista (la web usa el mosaico). -->
      <app-family-collage [week]="week" />
    } @else {
      <section class="announcements-empty" aria-labelledby="families-empty-title">
        <h2 id="families-empty-title" class="announcements-empty__title">
          {{ 'family_prayer.title' | translate }}
        </h2>
        <p class="announcements-empty__text">{{ 'family_prayer.empty' | translate }}</p>
      </section>
    }
  `,
  styles: [':host { display: contents; }'],
})
export class FamilyBlockComponent {
  @Input() week: PrayerWeekView | null = null;
  @Input() family: PrayerFamilyView | null = null;
}
