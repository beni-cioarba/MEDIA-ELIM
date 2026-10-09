import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { departmentById } from '../../../core/departments.config';
import { blockPath } from '../../../core/navigation/app-paths';
import { LanguageService } from '../../../core/services/language.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { whatsappHref } from '../../../core/util/contact-links';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DeptSwitcherComponent } from '../dept-switcher/dept-switcher.component';
import { LEADERSHIP_LINK, departmentPeople } from '../department.view';
import { YouthMealBlockComponent } from '../youth-meal/youth-meal-block.component';

/** Clave de `data` con la que la ruta dice qué departamento pinta. */
export const DEPARTMENT_ROUTE_KEY = 'department';

const FOCUS_Y = { top: '18%', center: '50%', bottom: '82%' } as const;

/**
 * Página de un departamento (`/departamente/<slug>`).
 *
 * **Una sola plantilla para todos**: lo que cambia es el dato
 * (`DEPARTMENTS` + `departments.<id>.*`). Anatomía, de arriba abajo:
 *
 *  1. Portada a sangre con la foto del departamento (o navy con su icono),
 *     titular, entradilla, acciones y una tira de datos (cuándo se reúne,
 *     cuántos sirven, próximo evento).
 *  2. Acceso rápido a los demás departamentos (fijo al bajar).
 *  3. Dos columnas: contenido (quiénes somos + pilares, módulos propios,
 *     actividades) y lateral (reunión, responsables, versículo, implicarse).
 *     En el teléfono el lateral cae debajo.
 *
 * Los módulos (`DepartmentModule`) son las piezas propias de cada uno: hoy
 * la app de la masa de tineret y los eventos. Uno nuevo = un `kind` y un
 * `@case` aquí.
 */
@Component({
  selector: 'app-department-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, DeptSwitcherComponent, YouthMealBlockComponent],
  templateUrl: './department-page.component.html',
  styleUrl: './department-page.component.scss',
})
export class DepartmentPageComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  protected readonly schedule = inject(ScheduleService);

  private readonly id = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data[DEPARTMENT_ROUTE_KEY] as string)),
  );

  protected readonly dept = computed(() => departmentById(this.id()));

  protected readonly coverFocus = computed(() => `50% ${FOCUS_Y[this.dept()?.cover?.focus ?? 'center']}`);

  protected readonly people = computed(() => {
    const dept = this.dept();
    return dept ? departmentPeople(dept) : [];
  });

  /** Culto semanal en el que se reúne, con sus datos del programa. */
  protected readonly meeting = computed(() => {
    const id = this.dept()?.weeklyProgramId;
    return id ? (this.config.weeklyProgram.find((p) => p.id === id) ?? null) : null;
  });

  /** ¿Se reúne hoy? (la tira de datos lo marca en verde, como la portada). */
  protected readonly meetsToday = computed(() => {
    const meeting = this.meeting();
    return meeting !== null && this.schedule.todayProgram()?.id === meeting.id;
  });

  /** Sus eventos futuros (`upcomingEvents[].departments`). */
  protected readonly events = computed(() => {
    const id = this.dept()?.id;
    return id ? this.schedule.upcomingEvents().filter((ev) => ev.departments?.includes(id)) : [];
  });

  protected readonly hasMeal = computed(
    () => this.dept()?.modules.some((m) => m.kind === 'youth-meal') ?? false,
  );

  /** WhatsApp de la iglesia con el primer mensaje ya escrito en su idioma. */
  protected readonly joinHref = computed(() => {
    this.language.current();
    const dept = this.dept();
    const number = this.config.contact.whatsapp;
    if (!dept || !number) return null;
    const name = this.translate.instant(`departments.${dept.id}.name`);
    return whatsappHref(number, this.translate.instant('departments.join_message', { name }));
  });

  protected readonly weeklyPath = blockPath('weekly');
  protected readonly upcomingPath = blockPath('upcoming');
  protected readonly leadershipLink = LEADERSHIP_LINK;

  protected scrollTo(event: Event, id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}
