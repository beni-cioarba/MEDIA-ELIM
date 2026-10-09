import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  YOUTH_MEAL_APP,
  YouthMealSection,
  youthMealUrl,
  youthMealWebcal,
} from '../../../core/departments.config';
import { ScheduleService } from '../../../core/services/schedule.service';
import { IconName } from '../../../core/ui/icon-name';
import { IconComponent } from '../../../shared/icon/icon.component';
import { YouthMealService } from './youth-meal.service';

interface AudienceLink {
  readonly section: YouthMealSection;
  readonly labelKey: string;
  readonly icon: IconName;
}

interface Audience {
  readonly id: 'youth' | 'parents';
  readonly icon: IconName;
  readonly links: readonly AudienceLink[];
}

/**
 * «Masa de după program»: la pieza propia del encuentro de vineri
 * (`companion: 'youth-meal'`, proyectada en `app-meeting-block`).
 *
 * **Deliberadamente secundaria** (10/10/2026, a petición del usuario): una
 * franja de consola navy de ~140 px al pie del bloque, no un bloque propio.
 * Tres líneas: título + fuente en vivo + abrir la app / calendario · quién
 * prepara los próximos cuatro vineri (fichas; datos del calendario público
 * de ADM-TINERET, sin nombres de personas; hoy en verde) · la tarde en una
 * línea y los accesos directos para tineri y părinți. El protagonismo es del
 * encuentro, arriba.
 */
@Component({
  selector: 'app-youth-meal-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './youth-meal-block.component.html',
  styleUrl: './youth-meal-block.component.scss',
})
export class YouthMealBlockComponent implements OnInit {
  protected readonly meal = inject(YouthMealService);
  protected readonly schedule = inject(ScheduleService);

  protected readonly appUrl = YOUTH_MEAL_APP.url;
  protected readonly webcal = youthMealWebcal();
  protected readonly turnsShown = YOUTH_MEAL_APP.turnsShown;

  protected readonly audiences: readonly Audience[] = [
    {
      id: 'youth',
      icon: 'users',
      links: [
        { section: 'schedule', labelKey: 'departments.youth.meal.links.schedule', icon: 'calendar' },
        { section: 'teams', labelKey: 'departments.youth.meal.links.teams', icon: 'users' },
      ],
    },
    {
      id: 'parents',
      icon: 'family',
      links: [
        { section: 'parents', labelKey: 'departments.youth.meal.links.parents', icon: 'family' },
        { section: 'rules', labelKey: 'departments.youth.meal.links.rules', icon: 'file-text' },
      ],
    },
  ];

  protected readonly url = youthMealUrl;

  ngOnInit(): void {
    this.meal.load();
  }
}
