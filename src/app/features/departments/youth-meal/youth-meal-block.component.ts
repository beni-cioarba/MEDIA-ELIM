import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
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
  /** Cuántos puntos tiene `departments.youth.meal.<id>.points.*`. */
  readonly points: readonly string[];
  readonly links: readonly AudienceLink[];
}

/**
 * «Programarea mesei»: presenta la app ADM-TINERET dentro de la página de
 * Tineret, para que quien está implicado sepa que existe y entre en un toque.
 *
 * Dos mitades:
 *  · **Qué es y para quién** — tineri (cuándo prepara su equipo) y părinți
 *    (cuándo ayudan y a qué hora traen la comida), cada uno con el enlace
 *    directo a su pestaña de la app.
 *  · **Tablero en vivo** — el próximo turno con su horario y los
 *    siguientes, leídos del calendario público de la app (sin nombres).
 *
 * Accesos: abrir la app, suscribirse al calendario (`webcal:`, el teléfono lo
 * mantiene al día solo) y, en escritorio, el QR para abrirla en el móvil.
 */
@Component({
  selector: 'app-youth-meal-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent, QRCodeComponent],
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
      points: ['turn', 'team', 'arrive'],
      links: [
        { section: 'schedule', labelKey: 'departments.youth.meal.links.schedule', icon: 'calendar' },
        { section: 'teams', labelKey: 'departments.youth.meal.links.teams', icon: 'users' },
      ],
    },
    {
      id: 'parents',
      icon: 'family',
      points: ['turn', 'food', 'plan'],
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
