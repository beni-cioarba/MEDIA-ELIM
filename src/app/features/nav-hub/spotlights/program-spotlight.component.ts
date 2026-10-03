import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS, blockPath } from '../../../core/navigation/app-paths';
import { FamilyPrayerService } from '../../../core/services/family-prayer.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { CardCarouselComponent } from '../../../shared/card-carousel/card-carousel.component';
import { FamilyPhotoComponent } from '../../family-prayer/family-photo/family-photo.component';
import { HubSectionComponent } from '../hub-section/hub-section.component';

/**
 * Destacado de la portada de **Program**: lo que las tarjetas no dicen.
 *
 * Las tarjetas ya responden «¿qué es lo próximo?» (culto, evento, lectura).
 * Aquí va lo que hace falta ver de un vistazo y no cabe en una tarjeta:
 *  1. **La semana entera**, empezando por hoy (`weeklyProgram` ya viene
 *     rotado), con el día de hoy resaltado: responde «¿qué días abrís?».
 *  2. **Las familias de la semana** en carrusel, con su foto: el contenido
 *     que cambia cada domingo. Es el mismo carrusel del panel de escritorio.
 */
@Component({
  selector: 'app-program-spotlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, CardCarouselComponent, FamilyPhotoComponent, HubSectionComponent],
  template: `
    <app-hub-section titleKey="nav.weekly" [link]="weeklyPath">
      <ol class="week" role="list">
        @for (dia of week(); track dia.id) {
          <li class="day" [class.is-today]="dia.id === todayId()">
            <span class="day__when">
              {{ dia.id === todayId() ? ('nav_hub.today' | translate) : dia.dayLabel }}
            </span>
            <span class="day__time">{{ dia.time }}</span>
            <span class="day__what">{{ dia.title }}</span>
          </li>
        }
      </ol>
    </app-hub-section>

    @if (prayerWeek(); as semana) {
      @if (semana.families.length > 0) {
        <app-hub-section
          titleKey="family_prayer.week_title"
          [meta]="prayer.formatShortRange(semana)"
          [link]="familyPrayerPath"
        >
          <app-card-carousel
            labelKey="family_prayer.week_title"
            itemWidth="clamp(9.5rem, 38vw, 12rem)"
            gap="0.75rem"
            [autoplayMs]="4500"
            [loop]="true"
          >
            <ng-template>
              @for (familia of semana.families; track familia.id) {
                <li class="ui-carousel__item">
                  <a class="family" [routerLink]="familyPrayerPath" [fragment]="familia.id" draggable="false">
                    <app-family-photo class="family__photo" [family]="familia" sizes="12rem" />
                    <span class="family__surname">{{ familia.surname }}</span>
                    <span class="family__given">{{ familia.names }}</span>
                  </a>
                </li>
              }
            </ng-template>
          </app-card-carousel>
        </app-hub-section>
      }
    }
  `,
  styleUrl: './spotlight.scss',
})
export class ProgramSpotlightComponent {
  private readonly schedule = inject(ScheduleService);
  protected readonly prayer = inject(FamilyPrayerService);

  protected readonly week = this.schedule.weeklyProgram;
  protected readonly todayId = computed(() => this.schedule.todayProgram()?.id ?? null);
  protected readonly prayerWeek = this.prayer.current;

  protected readonly weeklyPath = blockPath('weekly');
  protected readonly familyPrayerPath = `/${APP_PATHS.familyPrayer}`;
}
