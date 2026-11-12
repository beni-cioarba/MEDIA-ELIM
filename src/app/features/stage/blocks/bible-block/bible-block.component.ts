import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { formatReading, parseRomanianPassage } from '../../../../core/bible/bible-refs';
import { editionToday, planDay } from '../../../../core/impreuna/impreuna-edition';
import { APP_PATHS, blockPath } from '../../../../core/navigation/app-paths';
import { PresentationService } from '../../../../core/presentation.service';
import { BibleReadingService } from '../../../../core/services/bible-reading.service';
import { ClockService } from '../../../../core/services/clock.service';
import { LanguageService } from '../../../../core/services/language.service';
import { addDays, startOfDay, toIsoDate } from '../../../../core/util/iso-date';
import { BibleOptionsComponent } from '../../../../shared/bible/bible-options.component';
import { BiblePassagesComponent } from '../../../../shared/bible/bible-passages.component';
import { IconComponent } from '../../../../shared/icon/icon.component';

/**
 * Bloque «Citirea Bibliei»: la semana del plan de lectura que toca anunciar.
 *
 * Qué semana es lo decide `BibleReadingService` (la que contiene *mañana*:
 * el domingo ya se proyecta la semana que empieza el lunes). Aquí sólo se
 * pinta, con la jerarquía que se lee de lejos:
 *
 *   1. El **tramo de la semana** («Isaia 57-66, Ieremia 1-4») en un panel
 *      navy con el número de semana: es lo que se anuncia en voz alta.
 *   2. Las **lecturas diarias**, lunes→domingo, con el día de hoy resaltado y
 *      los pasados atenuados.
 *   3. El plan y el tramo del mes, como pie.
 *
 * **Sólo en la web** (no en la proyección): cada día se puede elegir y debajo
 * sale su **lectura**, capítulo a capítulo (`app-bible-passages`: abrir en la
 * app Biblia si está, escuchar, versículos y minutos), con la versión y la
 * tienda (`app-bible-options`) y la lectura de hoy de Proiectul Împreună. El
 * texto del plan («Isaia 43-44») se lee con `parseRomanianPassage`.
 *
 * Lleva su propia hoja global (`ViewEncapsulation.None`, BEM `.bible__*`)
 * con las secciones web y proyección, como la tarjeta de anuncio: la hoja del
 * escenario está al límite de su presupuesto y cada bloque nuevo es dueño de
 * sus dos contextos.
 */
@Component({
  selector: 'app-bible-block',
  imports: [RouterLink, TranslatePipe, IconComponent, BiblePassagesComponent, BibleOptionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './bible-block.component.html',
  styleUrl: './bible-block.component.scss',
})
export class BibleBlockComponent {
  protected readonly bible = inject(BibleReadingService);
  private readonly presentation = inject(PresentationService);
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);

  protected readonly fullscreen = this.presentation.isFullscreen;
  protected readonly week = this.bible.announcedWeek;

  /** Página web del bloque: adónde vuelve Chrome en Android si no está la app. */
  protected readonly returnPath = blockPath('bible').slice(1);
  protected readonly impreunaPath = ['/', APP_PATHS.impreuna];

  /**
   * Avance de la semana en curso («Ziua 3 din 7»), para el panel de la web.
   * `null` el domingo (la semana anunciada aún no ha empezado: lo dice la
   * insignia «Începe mâine») o si hoy no cae dentro de la semana.
   */
  protected readonly progress = computed(() => {
    const week = this.week();
    if (!week || week.startsTomorrow) return null;
    const index = week.days.findIndex((day) => day.isToday);
    return index < 0 ? null : { day: index + 1, total: week.days.length };
  });

  /** Día elegido en la web: hoy si cae en la semana; si no (domingo), el primero. Vuelve a eso al cambiar de semana. */
  protected readonly selectedDate = linkedSignal<string | null>(() => {
    const week = this.week();
    if (!week) return null;
    return (week.days.find((day) => day.isToday) ?? week.days[0])?.date ?? null;
  });

  /** La lectura del día elegido, capítulo a capítulo, y cómo nombrarlo («Azi», «Mâine» o la fecha). */
  protected readonly selected = computed(() => {
    const day = this.week()?.days.find((d) => d.date === this.selectedDate());
    if (!day) return null;
    const tomorrow = toIsoDate(addDays(startOfDay(new Date(this.clock.now())), 1));
    const when = day.isToday ? 'today' : day.date === tomorrow ? 'tomorrow' : null;
    const label = this.bible.formatDayLabel(day.date);
    return {
      day,
      refs: parseRomanianPassage([day.passage, day.newTestament].filter(Boolean).join(', ')),
      when,
      /** Otro día: «Luni, 9 noiembrie» (Intl lo da en minúscula). */
      label: label.charAt(0).toLocaleUpperCase(this.language.current()) + label.slice(1),
    };
  });

  /** Lo que se lee hoy en Proiectul Împreună (el otro plan de la web), mientras dure su edición. */
  protected readonly impreunaToday = computed(() => {
    const today = editionToday(new Date(this.clock.now()));
    const day = planDay(today.day);
    return today.status === 'running' && day ? formatReading(day.refs, this.language.current()) : null;
  });

  protected select(date: string): void {
    this.selectedDate.set(date);
  }
}
