import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG, displayAddress } from '../../../../core/church.config';
import { IMPREUNA_FASTING_THEMES } from '../../../../core/impreuna/impreuna.config';
import { IMPREUNA_EDITION, editionToday, planDay } from '../../../../core/impreuna/impreuna-edition';
import {
  announcedWeek,
  formatReading,
  isFastingDay,
  localDateOfDay,
  nextFirstThursday,
} from '../../../../core/impreuna/impreuna-plan';
import { APP_PATHS } from '../../../../core/navigation/app-paths';
import { ClockService } from '../../../../core/services/clock.service';
import { LanguageService } from '../../../../core/services/language.service';
import { QrPanelComponent } from '../../../../shared/qr-panel/qr-panel.component';

/** Una fila de la semana, ya compuesta en el idioma de la proyección. */
interface WeekRow {
  readonly day: number;
  readonly weekday: string;
  readonly date: number;
  readonly reading: string;
  readonly wisdom: boolean;
  readonly isToday: boolean;
  readonly isPast: boolean;
  /** Primer jueves: post și rugăciune. */
  readonly fasting: boolean;
}

/** Raya entre cifras sin partir línea tras ella («26:9–⁠16»), como el bloque bíblico. */
const typeset = (text: string): string => text.replace(/–/g, '–⁠');

/**
 * Diapositiva «Proiectul Împreună»: la semana de lecturas del proyecto y el
 * QR a `/impreuna`, para que la congregación lo siga desde el móvil.
 *
 *  · Semana que se anuncia: **la que contiene mañana**, como el bloque de
 *    lectura de la iglesia: el domingo (día de culto) ya es la que empieza el
 *    lunes («Începe mâine»); de lunes a sábado, la de hoy con hoy resaltado
 *    y lo pasado atenuado.
 *  · Sólo depende del plan (`impreuna-edition`): ni vídeos ni red. El
 *    escenario no arrastra el módulo entero.
 *  · A sangre y navy (`StageComponent.bleed`), la misma línea que la cabecera
 *    de la página. Tamaños en `--pj-*` (`30-presentation.md` → Legibilidad).
 */
@Component({
  selector: 'app-impreuna-block',
  imports: [TranslatePipe, QrPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './impreuna-block.component.html',
  styleUrl: './impreuna-block.component.scss',
})
export class ImpreunaBlockComponent {
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);

  protected readonly total = IMPREUNA_EDITION.total;
  protected readonly today = computed(() => editionToday(new Date(this.clock.now())));

  protected readonly week = computed<readonly WeekRow[]>(() => {
    const { status, day: today } = this.today();
    const year = IMPREUNA_EDITION.year;
    const lang = this.language.current();
    const weekday = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    return announcedWeek(year, this.today(), this.total).map((day) => {
      const plan = planDay(day)!;
      const date = localDateOfDay(year, day);
      return {
        day,
        weekday: weekday.format(date).replace('.', ''),
        date: date.getDate(),
        reading: typeset(formatReading(plan.refs, lang)),
        wisdom: plan.kind === 'wisdom',
        isToday: status === 'running' && day === today,
        isPast: status !== 'before' && day < today,
        fasting: isFastingDay(year, day),
      };
    });
  });

  /** Domingo: la semana anunciada empieza mañana. */
  protected readonly startsTomorrow = computed(() => {
    const { status, day } = this.today();
    return status === 'running' && this.week()[0]?.day === day + 1;
  });

  /** Próximo primer jueves (ayuno y oración): «joi, 3 decembrie». */
  protected readonly nextFast = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { weekday: 'long', day: 'numeric', month: 'long' }).format(
      nextFirstThursday(new Date(this.clock.now())),
    ),
  );

  /** Tema del próximo ayuno, si el Cult lo publicó y se cargó en la config. */
  protected readonly nextFastTheme = computed(() => {
    const date = nextFirstThursday(new Date(this.clock.now()));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return IMPREUNA_FASTING_THEMES.find((t) => t.date === iso)?.theme ?? null;
  });

  /** QR a la página en producción (no a la URL del navegador). */
  protected readonly qrUrl = `${inject(CHURCH_CONFIG).publicUrl.replace(/\/$/, '')}/${APP_PATHS.impreuna}`;
  /** La dirección escrita bajo el código: dominio y ruta en dos líneas. */
  protected readonly qrHost = displayAddress(this.qrUrl).split('/')[0];
  protected readonly qrPath = `/${APP_PATHS.impreuna}`;
}
