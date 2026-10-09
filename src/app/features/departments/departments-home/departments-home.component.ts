import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DEPARTMENTS } from '../../../core/departments.config';
import { departmentPath } from '../../../core/navigation/app-paths';
import { LanguageService } from '../../../core/services/language.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { whatsappHref } from '../../../core/util/contact-links';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DeptSwitcherComponent } from '../dept-switcher/dept-switcher.component';
import { departmentPeople } from '../department.view';
import { YouthMealNextComponent } from '../youth-meal/youth-meal-next.component';

/**
 * Portada del módulo Departamente (`/departamente`): destino de la pestaña
 * del móvil, de la migaja y del rótulo del grupo.
 *
 * No usa la portada de sección genérica (`NavHubComponent`) porque aquí cada
 * entrada es un ministerio con cara propia: un **mosaico de fotos** dice más
 * que una lista de filas. Anatomía: cabecera navy con las cifras, acceso
 * rápido (fijo), mosaico (el destacado ocupa 2 × 2), el aviso vivo de la
 * masa de tineret y la invitación a implicarse.
 *
 * El mosaico es rejilla, no posiciones a mano: un departamento nuevo entra
 * solo y la última celda suelta se estira para no dejar huecos.
 */
@Component({
  selector: 'app-departments-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, DeptSwitcherComponent, YouthMealNextComponent],
  templateUrl: './departments-home.component.html',
  styleUrl: './departments-home.component.scss',
})
export class DepartmentsHomeComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly schedule = inject(ScheduleService);

  protected readonly tiles = DEPARTMENTS.map((d) => {
    const meeting = d.weeklyProgramId
      ? this.config.weeklyProgram.find((p) => p.id === d.weeklyProgramId)
      : undefined;
    return {
      dept: d,
      path: departmentPath(d.id),
      meeting: meeting ? `${meeting.dayLabel} · ${meeting.time}` : null,
      meetingId: meeting?.id ?? null,
    };
  });

  /** Cifras de la cabecera: sólo lo que se puede contar de verdad. */
  protected readonly stats = {
    departments: DEPARTMENTS.length,
    people: new Set(DEPARTMENTS.flatMap((d) => departmentPeople(d).map((p) => p.id))).size,
    activities: DEPARTMENTS.reduce((total, d) => total + d.activities.length, 0),
  };

  protected readonly todayId = computed(() => this.schedule.todayProgram()?.id ?? null);

  protected readonly joinHref = computed(() => {
    this.language.current();
    const number = this.config.contact.whatsapp;
    return number ? whatsappHref(number, this.translate.instant('departments.join_message_any')) : null;
  });

  protected readonly youthPath = departmentPath('youth');
}
