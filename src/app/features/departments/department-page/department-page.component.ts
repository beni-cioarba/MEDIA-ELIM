import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { DepartmentMonthly, departmentById } from '../../../core/departments.config';
import { APP_PATHS, blockPath } from '../../../core/navigation/app-paths';
import { ClockService } from '../../../core/services/clock.service';
import { LanguageService } from '../../../core/services/language.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { whatsappHref } from '../../../core/util/contact-links';
import { NOW_WINDOW_MIN, formatIn } from '../../../core/util/countdown';
import { parseIsoDate, toIsoDate } from '../../../core/util/iso-date';
import { Weekday, nextMonthlyDates, nextWeeklyDates } from '../../../core/util/recurrence';
import { HeroCarouselComponent } from '../../../shared/hero-carousel/hero-carousel.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DeptSwitcherComponent } from '../dept-switcher/dept-switcher.component';
import { LEADERSHIP_LINK, departmentPeople } from '../department.view';
import { MeetingBlockComponent } from '../meeting/meeting-block.component';
import { StoriesBlockComponent } from '../stories/stories-block.component';
import { YouthMealBlockComponent } from '../youth-meal/youth-meal-block.component';

/** Clave de `data` con la que la ruta dice qué departamento pinta. */
export const DEPARTMENT_ROUTE_KEY = 'department';

/** «Lo próximo» de la portada en carrusel. */
interface DeptNext {
  /** Id del bloque al que lleva (`meet-friday`, `events`). */
  readonly anchor: string;
  readonly titleKey: string;
  /** Título ya escrito (los eventos lo traen en su idioma); manda sobre `titleKey`. */
  readonly title?: string;
  readonly time: string;
  readonly state: 'now' | 'today' | 'later';
  /** «2 h 15 min»; sólo hoy. */
  readonly inLabel: string | null;
  readonly dayLabel: string;
}

/** Instante de inicio (ms) de `YYYY-MM-DD` + `HH:MM`. */
function startAt(date: string, time: string): number {
  const [h, m] = (time.match(/(\d{1,2}):(\d{2})/)?.slice(1) ?? ['0', '0']).map(Number);
  const d = parseIsoDate(date);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

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
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    DeptSwitcherComponent,
    YouthMealBlockComponent,
    MeetingBlockComponent,
    HeroCarouselComponent,
    NgTemplateOutlet,
    StoriesBlockComponent,
  ],
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

  private readonly clock = inject(ClockService);

  /** Próxima reunión mensual (para la tira de datos de la portada). */
  protected readonly monthlyNext = computed(() => {
    this.language.current();
    const monthly = this.dept()?.modules.find((m): m is DepartmentMonthly => m.kind === 'monthly');
    if (!monthly) return null;
    const now = new Date(this.clock.now());
    const next = nextMonthlyDates(monthly.rule, now, 1)[0];
    if (!next) return null;
    const p = this.schedule.formatDayParts(next);
    const weekday = this.schedule.formatWeekdayShort(next);
    return {
      key: monthly.key,
      isToday: next === toIsoDate(now),
      label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${p.day} ${p.month} · ${monthly.time}`,
    };
  });

  protected readonly hasWeekly = computed(
    () => this.dept()?.modules.some((m) => m.kind === 'weekly') ?? false,
  );

  protected readonly hasMeal = computed(
    () =>
      this.dept()?.modules.some((m) => m.kind === 'weekly' && m.companion === 'youth-meal') ??
      false,
  );

  /**
   * «Lo próximo» de la portada en carrusel: la reunión fija más cercana del
   * departamento (el encuentro semanal o la mensual), con los mismos estados
   * que la portada de inicio: en marcha (late), hoy con cuenta atrás, o el
   * día. Enlaza a su bloque de la página.
   */
  protected readonly heroNext = computed<DeptNext | null>(() => {
    this.language.current();
    const dept = this.dept();
    if (!dept) return null;
    const now = new Date(this.clock.now());
    const candidates: { anchor: string; titleKey: string; title?: string; date: string; time: string }[] = [];
    for (const m of dept.modules) {
      if (m.kind === 'weekly') {
        const program = this.config.weeklyProgram.find((p) => p.id === m.weeklyProgramId);
        if (!program) continue;
        for (const date of nextWeeklyDates(program.day as Weekday, now, 2)) {
          candidates.push({ anchor: `meet-${m.key}`, titleKey: `departments.${dept.id}.weekly.${m.key}.title`, date, time: program.time });
        }
      } else if (m.kind === 'monthly') {
        for (const date of nextMonthlyDates(m.rule, now, 2)) {
          candidates.push({ anchor: `meet-${m.key}`, titleKey: `departments.${dept.id}.monthly.${m.key}.title`, date, time: m.time });
        }
      }
    }
    // Sus eventos (`upcomingEvents[].departments`): el chip también los anuncia.
    for (const ev of this.events().slice(0, 2)) {
      candidates.push({ anchor: 'events', titleKey: '', title: ev.title, date: ev.date, time: ev.time });
    }
    const nowMs = now.getTime();
    const upcoming = candidates
      .map((c) => ({ ...c, start: startAt(c.date, c.time) }))
      .filter((c) => c.start + NOW_WINDOW_MIN * 60_000 > nowMs)
      .sort((a, b) => a.start - b.start)[0];
    if (!upcoming) return null;
    const minutes = Math.round((upcoming.start - nowMs) / 60_000);
    const state: DeptNext['state'] =
      minutes <= 0 ? 'now' : upcoming.date === toIsoDate(now) ? 'today' : 'later';
    const p = this.schedule.formatDayParts(upcoming.date);
    const weekday = this.schedule.formatWeekdayShort(upcoming.date);
    return {
      anchor: upcoming.anchor,
      titleKey: upcoming.titleKey,
      title: upcoming.title,
      time: upcoming.time,
      state,
      inLabel: state === 'today' ? formatIn(minutes) : null,
      dayLabel: `${weekday} ${p.day} ${p.month}`,
    };
  });

  protected readonly hasStories = computed(
    () => this.dept()?.modules.some((m) => m.kind === 'stories') ?? false,
  );

  protected readonly hubPath = `/${APP_PATHS.departments}`;

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
