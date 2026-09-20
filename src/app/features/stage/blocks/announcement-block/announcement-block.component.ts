import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Announcement } from '../../../../core/church.config';
import { AnnouncementCardComponent } from '../../../announcements/announcement-card/announcement-card.component';

/**
 * Bloque «Anunțuri»: **una diapositiva por anuncio**.
 *
 * El escenario le entrega el anuncio de la diapositiva (ver
 * `PresentationBlocksService.expand`) y este bloque delega en la misma
 * tarjeta que usa la página `/anunturi`: lo que se proyecta y lo que se lee
 * en el móvil tras escanear el QR es idéntico.
 *
 * Sin anuncio (bloque forzado a visible cuando no hay ninguno vigente) pinta
 * el estado vacío con el título del bloque, para que el operador entienda
 * por qué la diapositiva está en blanco.
 */
@Component({
  selector: 'app-announcement-block',
  standalone: true,
  imports: [TranslateModule, AnnouncementCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (announcement; as current) {
      <app-announcement-card [announcement]="current" />
    } @else {
      <section class="announcements-empty" aria-labelledby="announcements-title">
        <h2 id="announcements-title" class="announcements-empty__title">
          {{ 'announcements.title' | translate }}
        </h2>
        <p class="announcements-empty__text">{{ 'announcements.empty' | translate }}</p>
      </section>
    }
  `,
  styles: [':host { display: contents; }'],
})
export class AnnouncementBlockComponent {
  @Input() announcement: Announcement | null = null;
}
