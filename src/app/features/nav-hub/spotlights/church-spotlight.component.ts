import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { ScheduleService } from '../../../core/services/schedule.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { HubSectionComponent } from '../hub-section/hub-section.component';

/**
 * Destacado de la portada de **Biserica**: la invitación.
 *
 * Quien abre «La iglesia» está decidiendo si viene; las tres páginas cuentan
 * quiénes somos, pero no cuándo ni dónde. Es la misma tarjeta del panel de
 * escritorio, a escala de página: próximo culto, dirección y cómo llegar.
 */
@Component({
  selector: 'app-church-spotlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, HubSectionComponent],
  template: `
    <app-hub-section titleKey="nav.panel_visit">
      <div class="visit">
        <p class="visit__lead">{{ 'nav.panel_visit_lead' | translate }}</p>
        <ul class="visit__facts" role="list">
          @if (nextService(); as culto) {
            <li class="visit__fact">
              <span class="visit__icon" aria-hidden="true"><app-icon name="clock" /></span>
              <span class="visit__text">
                <span class="visit__label">{{ 'nav.panel_service' | translate }}</span>
                <span class="visit__value">{{ culto.dayLabel }} · {{ culto.time }}</span>
              </span>
            </li>
          }
          <li class="visit__fact">
            <span class="visit__icon" aria-hidden="true"><app-icon name="map-pin" /></span>
            <span class="visit__text">
              <span class="visit__label">{{ 'nav.panel_address' | translate }}</span>
              <span class="visit__value">{{ location.address }}</span>
            </span>
          </li>
        </ul>
        <div class="visit__actions">
          <a class="visit__cta" [href]="location.mapsShareUrl" target="_blank" rel="noopener noreferrer">
            <app-icon name="map-pin" />
            {{ 'nav.panel_directions' | translate }}
          </a>
          <a class="visit__link" [routerLink]="contactPath">
            {{ 'nav.contact' | translate }}
            <app-icon name="arrow-right" />
          </a>
        </div>
      </div>
    </app-hub-section>
  `,
  styleUrl: './spotlight.scss',
})
export class ChurchSpotlightComponent {
  protected readonly nextService = inject(ScheduleService).featuredProgram;
  protected readonly location = inject(CHURCH_CONFIG).location;
  protected readonly contactPath = `/${APP_PATHS.contact}`;
}
