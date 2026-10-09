import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ScheduleService } from '../../../core/services/schedule.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { YouthMealService } from './youth-meal.service';

/**
 * Franja compacta «¿a quién le toca la masa?» para fuera de la página de
 * Tineret (portada de Departamente). Una línea: próximo turno, equipo,
 * cuánto falta y el horario; enlaza al bloque completo (`#masa`).
 * Sin datos (cargando o sin red) se queda en la invitación a la app.
 */
@Component({
  selector: 'app-youth-meal-next',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  template: `
    <a class="strip" [routerLink]="link()" fragment="masa">
      <span class="strip__icon" aria-hidden="true"><app-icon name="utensils" /></span>
      <span class="strip__head">
        <span class="strip__kicker">{{ 'departments.youth.meal.eyebrow' | translate }}</span>
        <span class="strip__title">{{ 'departments.youth.meal.title' | translate }}</span>
      </span>

      @if (meal.next(); as next) {
        <span class="strip__turn" [class.is-today]="next.isToday">
          <span class="strip__when">
            @if (next.isToday) {
              {{ 'departments.youth.meal.today' | translate }}
            } @else {
              {{ schedule.formatWeekdayShort(next.date) }} {{ schedule.formatDayParts(next.date).day }}
              {{ schedule.formatDayParts(next.date).month }}
            }
          </span>
          <span class="strip__team">{{ next.team }}</span>
          @if (next.arrival && next.food) {
            <span class="strip__times">{{ next.arrival }} · {{ next.food }}</span>
          }
        </span>
      } @else {
        <span class="strip__turn strip__turn--idle">{{ 'departments.youth.meal.who' | translate }}</span>
      }

      <app-icon class="strip__go" name="arrow-right" />
    </a>
  `,
  styleUrl: './youth-meal-next.component.scss',
})
export class YouthMealNextComponent implements OnInit {
  readonly link = input.required<string>();

  protected readonly meal = inject(YouthMealService);
  protected readonly schedule = inject(ScheduleService);

  ngOnInit(): void {
    this.meal.load();
  }
}
