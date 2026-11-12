import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BibleLinkService, BibleOpen } from '../../../core/bible/bible-link.service';
import { PassageRef, parseRomanianPassage, refLabel } from '../../../core/bible/bible-refs';
import { passageVerses, readingMinutes } from '../../../core/bible/bible-verses';
import { blockPath } from '../../../core/navigation/app-paths';
import { BibleReadingService, BibleReadingWeekView } from '../../../core/services/bible-reading.service';
import { LanguageService } from '../../../core/services/language.service';
import { pluralKey } from '../../../core/util/plural';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Un día de la semana de lectura, listo para pintar. */
export interface BibleWeekDay {
  readonly date: string;
  /** El texto del plan tal cual se anuncia («Ezechiel 38–39»). */
  readonly passage: string;
  readonly isToday: boolean;
  readonly isPast: boolean;
  /** «joi» / «jue» (la plantilla lo pasa a versalitas). */
  readonly weekday: string;
  readonly dayNumber: string;
  /** «Joi, 12 noiembrie»: el día entero para el lector de pantalla. */
  readonly label: string;
  /** Suma de los capítulos del día (como la cabecera de Citirea Bibliei). */
  readonly verses: number;
  readonly minutes: number;
  /** Abrir el primer capítulo en la app Biblia (o bible.com); `null` si el texto no se entiende. */
  readonly open: BibleOpen | null;
  /** Audio del primer capítulo y su nombre («Ezechiel 38»). */
  readonly audio: { readonly href: string; readonly label: string } | null;
}

export interface BibleWeekView {
  readonly week: BibleReadingWeekView;
  readonly days: readonly BibleWeekDay[];
  /** La semana que ya se anuncia (el domingo, la que empieza mañana), si no es esta. */
  readonly next: BibleReadingWeekView | null;
}

/**
 * **Citirea Bibliei en la portada**, justo debajo de «Când ne întâlnim»: la
 * semana del plan de lectura de la iglesia en las mismas siete columnas que
 * el horario (lunes → domingo), así cada lectura cae bajo su día y «hoy» es
 * una sola columna dorada que atraviesa las dos tarjetas.
 *
 *  · Cada día: pasaje, versículos y minutos. **Toda la celda abre la
 *    lectura** en la app Biblia (Android: `intent:`; si no está, Chrome
 *    vuelve a la página completa, que avisa con Google Play) y los
 *    auriculares, el audio de bible.com. Del primer capítulo: los siguientes
 *    están a una flecha en la app.
 *  · El domingo la semana sigue siendo la que termina (hoy se lee su último
 *    día) y una línea anuncia la que empieza mañana.
 *  · «Vezi planul complet» → la página (capítulo a capítulo, versión, todo
 *    el plan).
 *
 * Sustituye a la tarjeta de lectura del carrusel de la portada (12/11/2026).
 * Docs: 30-presentation.md → «Bloque Citirea Bibliei» y 48-carousel-cards.md.
 */
@Component({
  selector: 'app-bible-week',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './bible-week.component.html',
  styleUrl: './bible-week.component.scss',
})
export class BibleWeekComponent {
  private readonly bible = inject(BibleReadingService);
  protected readonly links = inject(BibleLinkService);
  private readonly language = inject(LanguageService);
  private readonly document = inject(DOCUMENT);

  /** La página completa (Program → Citirea Bibliei). */
  protected readonly fullPath = blockPath('bible');

  private readonly plural = computed(() => new Intl.PluralRules(this.language.current()));

  protected readonly view = computed<BibleWeekView | null>(() => {
    const week = this.bible.currentWeek();
    if (!week) return null;
    const lang = this.language.current();
    const days = week.days.map<BibleWeekDay>((day) => {
      const text = [day.passage, day.newTestament].filter(Boolean).join(', ');
      const refs = parseRomanianPassage(text);
      const first: PassageRef | null = refs[0] ?? null;
      const label = this.bible.formatDayLabel(day.date);
      return {
        date: day.date,
        passage: text,
        isToday: day.isToday,
        isPast: day.isPast,
        weekday: this.bible.formatWeekday(day.date, 'short'),
        dayNumber: this.bible.formatDayNumber(day.date),
        label: label.charAt(0).toLocaleUpperCase(lang) + label.slice(1),
        // Fila a fila, como la tarjeta de la página: así los dos totales cuadran.
        verses: refs.reduce((sum, ref) => sum + passageVerses(ref), 0),
        minutes: refs.reduce((sum, ref) => sum + readingMinutes([ref]), 0),
        open: first ? this.links.open(first, this.fallback(first)) : null,
        audio: first ? { href: this.links.audio(first), label: refLabel(first, lang) } : null,
      };
    });
    const announced = this.bible.announcedWeek();
    return { week, days, next: announced && announced.number !== week.number ? announced : null };
  });

  /** «52 de versete» / «5 versete» / «1 verset» (y en español). */
  protected versesKey(count: number): string {
    return `bible_app.verses_${pluralKey(this.plural(), count)}`;
  }

  protected opened(open: BibleOpen): void {
    if (open.viaIntent) this.links.watchLaunch();
  }

  /** Si el `intent:` no encuentra la app, Chrome va a la página completa y allí sale el aviso. */
  private fallback(ref: PassageRef): string {
    const query = `biblia=lipsa&text=${encodeURIComponent(ref.code)}`;
    return new URL(`${this.fullPath.slice(1)}?${query}`, this.document.baseURI).href;
  }
}
