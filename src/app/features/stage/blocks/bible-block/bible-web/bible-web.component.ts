import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BibleProgressService } from '../../../../../core/bible/bible-progress.service';
import { formatReading, parseRomanianPassage } from '../../../../../core/bible/bible-refs';
import { passageVerses, readingMinutes } from '../../../../../core/bible/bible-verses';
import { BIBLE_PUSH_TOPIC, churchReadingOn } from '../../../../../core/bible/church-plan';
import { editionToday, planDay } from '../../../../../core/impreuna/impreuna-edition';
import { APP_PATHS, blockPath } from '../../../../../core/navigation/app-paths';
import { BibleReadingService } from '../../../../../core/services/bible-reading.service';
import { ClockService } from '../../../../../core/services/clock.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { addDays, parseIsoDate, startOfDay, toIsoDate } from '../../../../../core/util/iso-date';
import { pluralKey } from '../../../../../core/util/plural';
import { BibleOptionsComponent } from '../../../../../shared/bible/bible-options.component';
import { BiblePassagesComponent } from '../../../../../shared/bible/bible-passages.component';
import { IconComponent } from '../../../../../shared/icon/icon.component';
import { PushReminderComponent } from '../../../../../shared/push-reminder/push-reminder.component';

const LOCALES = { ro: 'ro-RO', es: 'es-ES' } as const;

/** Una casilla del calendario con día. */
interface CalendarCell {
  readonly iso: string;
  readonly num: number;
  /** El día tiene lectura en el plan (si no, no se puede elegir). */
  readonly inPlan: boolean;
  readonly isRead: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly label: string;
}

/**
 * **Citirea Bibliei en la web** (la proyección sigue en `bible-block`):
 *
 *  · **Moverse por todo el plan**: ‹ semana › y «Azi» en la barra, y el
 *    **calendario** del plan (mes a la vista; en escritorio siempre a la
 *    derecha, en el móvil se abre desde la barra). `?zi=AAAA-MM-DD` abre un día.
 *  · **«Am citit»** por día, como en Proiectul Împreună (`BibleProgressService`,
 *    en este dispositivo): ✓ en la tira de la semana y en el calendario,
 *    cifras arriba (citite · seria · necitite).
 *  · La lectura del día elegido, capítulo a capítulo (app Biblia, audio,
 *    versículos, minutos), y el aviso diario de las 08:00.
 *
 * Docs: 30-presentation.md → «Bloque Citirea Bibliei» → «Web (13/11/2026)».
 */
@Component({
  selector: 'app-bible-web',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    BiblePassagesComponent,
    BibleOptionsComponent,
    PushReminderComponent,
  ],
  templateUrl: './bible-web.component.html',
  styleUrl: './bible-web.component.scss',
})
export class BibleWebComponent implements OnInit {
  protected readonly bible = inject(BibleReadingService);
  protected readonly progress = inject(BibleProgressService);
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Adónde vuelve Chrome en Android si no está la app (esta página). */
  protected readonly returnPath = blockPath('bible').slice(1);
  protected readonly impreunaPath = ['/', APP_PATHS.impreuna];
  protected readonly pushTopic = BIBLE_PUSH_TOPIC;
  protected readonly readingFor = (date: string): string | null => churchReadingOn(date)?.passage ?? null;

  private readonly locale = computed(() => LOCALES[this.language.current()]);
  private readonly plural = computed(() => new Intl.PluralRules(this.language.current()));
  private readonly todayIso = computed(() => toIsoDate(startOfDay(new Date(this.clock.now()))));
  private readonly planSet = computed(() => new Set(this.bible.planDates()));

  /** Por defecto: hoy si tiene lectura; si no, el primer día de la semana que se anuncia. */
  private readonly defaultDate = computed<string | null>(() => {
    const today = this.todayIso();
    if (this.planSet().has(today)) return today;
    const dates = this.bible.planDates();
    return this.bible.announcedWeek()?.days[0]?.date ?? dates.at(-1) ?? null;
  });

  protected readonly selectedDate = linkedSignal<string | null>(() => this.defaultDate());

  protected readonly week = computed(() => {
    const date = this.selectedDate();
    return date ? this.bible.weekOn(date) : null;
  });

  private readonly weekIndex = computed(() => {
    const number = this.week()?.number;
    return this.bible.allWeeks().findIndex((week) => week.number === number);
  });
  protected readonly canPrev = computed(() => this.weekIndex() > 0);
  protected readonly canNext = computed(() => {
    const index = this.weekIndex();
    return index >= 0 && index < this.bible.allWeeks().length - 1;
  });
  /** «Azi» sólo cuando se ha ido a otro día. */
  protected readonly awayFromDefault = computed(() => this.selectedDate() !== this.defaultDate());

  /** La lectura del día elegido, capítulo a capítulo, y cómo nombrar el día. */
  protected readonly selected = computed(() => {
    const date = this.selectedDate();
    const day = this.week()?.days.find((d) => d.date === date);
    if (!date || !day) return null;
    const tomorrow = toIsoDate(addDays(parseIsoDate(this.todayIso()), 1));
    const when = day.isToday ? 'today' : date === tomorrow ? 'tomorrow' : null;
    const label = this.bible.formatDayLabel(date);
    return {
      day,
      refs: parseRomanianPassage([day.passage, day.newTestament].filter(Boolean).join(', ')),
      when,
      label: label.charAt(0).toLocaleUpperCase(this.locale()) + label.slice(1),
      isRead: this.progress.read().has(date),
    };
  });

  /** La tira de la semana: cada día con su estado de lectura y sus minutos. */
  protected readonly days = computed(() => {
    const read = this.progress.read();
    return (this.week()?.days ?? []).map((day) => {
      const refs = parseRomanianPassage([day.passage, day.newTestament].filter(Boolean).join(', '));
      return {
        ...day,
        isRead: read.has(day.date),
        isSelected: day.date === this.selectedDate(),
        minutes: refs.reduce((sum, ref) => sum + readingMinutes([ref]), 0),
        verses: refs.reduce((sum, ref) => sum + passageVerses(ref), 0),
      };
    });
  });

  protected readonly weekDone = computed(() => this.days().filter((day) => day.isRead).length);

  /** Lo que se lee hoy en Proiectul Împreună (el otro plan de la web), mientras dure su edición. */
  protected readonly impreunaToday = computed(() => {
    const today = editionToday(new Date(this.clock.now()));
    const day = planDay(today.day);
    return today.status === 'running' && day ? formatReading(day.refs, this.language.current()) : null;
  });

  // ── Calendario ──────────────────────────────────────────────────────────

  /** Calendario abierto en el móvil (en escritorio está siempre). */
  protected readonly calendarOpen = signal(false);

  private readonly bounds = computed(() => {
    const dates = this.bible.planDates();
    const first = dates[0];
    const last = dates.at(-1);
    return first && last ? { first: monthKey(first), last: monthKey(last) } : null;
  });

  /** Mes a la vista (`año * 12 + mes`): sigue al día elegido; se hojea con ‹ ›. */
  protected readonly viewMonth = linkedSignal(() => monthKey(this.selectedDate() ?? this.todayIso()));
  /** Casilla con el foco del teclado (la única tabulable). */
  private readonly focusDate = linkedSignal(() => this.selectedDate());

  protected readonly canPrevMonth = computed(() => (this.bounds()?.first ?? 0) < this.viewMonth());
  protected readonly canNextMonth = computed(() => (this.bounds()?.last ?? 0) > this.viewMonth());

  protected readonly monthLabel = computed(() => {
    const key = this.viewMonth();
    const text = new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      new Date(Math.floor(key / 12), key % 12, 1, 12),
    );
    return text.charAt(0).toLocaleUpperCase(this.locale()) + text.slice(1);
  });

  protected readonly weekdays = computed(() => {
    const short = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long' });
    // 9/11/2026 es lunes: siete días seguidos dan la semana en orden.
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2026, 10, 9 + i, 12);
      return { short: short.format(date).replace('.', '').slice(0, 2), long: long.format(date) };
    });
  });

  protected readonly calendar = computed<readonly (readonly (CalendarCell | null)[])[]>(() => {
    const key = this.viewMonth();
    const year = Math.floor(key / 12);
    const month = key % 12;
    const plan = this.planSet();
    const read = this.progress.read();
    const today = this.todayIso();
    const selected = this.selectedDate();
    const labelFormat = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const length = new Date(year, month + 1, 0).getDate();
    const cells: (CalendarCell | null)[] = Array.from({ length: offset }, () => null);
    for (let num = 1; num <= length; num++) {
      const date = new Date(year, month, num, 12);
      const iso = toIsoDate(date);
      cells.push({
        iso,
        num,
        inPlan: plan.has(iso),
        isRead: read.has(iso),
        isToday: iso === today,
        isSelected: iso === selected,
        label: labelFormat.format(date),
      });
    }
    while (cells.length % 7) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  });

  /** La casilla que entra en el orden de tabulación. */
  protected readonly tabDate = computed(() => {
    const inView = (iso: string | null) => !!iso && monthKey(iso) === this.viewMonth();
    const focus = this.focusDate();
    if (inView(focus)) return focus;
    return this.calendar().flat().find((cell) => cell?.inPlan)?.iso ?? null;
  });

  ngOnInit(): void {
    const requested = this.route.snapshot.queryParamMap.get('zi');
    if (requested && this.planSet().has(requested)) this.selectedDate.set(requested);
  }

  protected select(date: string): void {
    this.selectedDate.set(date);
  }

  /** Semana anterior / siguiente, en el mismo día de la semana. */
  protected goWeek(delta: number): void {
    const weeks = this.bible.allWeeks();
    const target = weeks[this.weekIndex() + delta];
    if (!target) return;
    const position = Math.max(0, this.week()?.days.findIndex((d) => d.date === this.selectedDate()) ?? 0);
    this.select(target.days[Math.min(position, target.days.length - 1)].date);
  }

  protected goToday(): void {
    const date = this.defaultDate();
    if (date) this.select(date);
  }

  protected showMonth(delta: number): void {
    const bounds = this.bounds();
    if (!bounds) return;
    this.viewMonth.update((key) => Math.min(bounds.last, Math.max(bounds.first, key + delta)));
  }

  protected choose(cell: CalendarCell): void {
    if (!cell.inPlan) return;
    this.focusDate.set(cell.iso);
    this.select(cell.iso);
  }

  /** Teclado de la rejilla: flechas = día / semana; RePág / AvPág = mes. */
  protected onKey(event: KeyboardEvent, cell: CalendarCell): void {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      this.showMonth(event.key === 'PageUp' ? -1 : 1);
      return;
    }
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    // El siguiente día con lectura en esa dirección (los huecos se saltan).
    let target = cell.iso;
    for (let i = 0; i < 60; i++) {
      target = toIsoDate(addDays(parseIsoDate(target), step));
      if (this.planSet().has(target)) break;
    }
    if (!this.planSet().has(target)) return;
    this.focusDate.set(target);
    this.viewMonth.set(monthKey(target));
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  /** «52 de versete» / «5 versete» / «1 verset» (y en español). */
  protected versesKey(count: number): string {
    return `bible_app.verses_${pluralKey(this.plural(), count)}`;
  }

  /** «1 zi la rând» / «5 zile la rând». */
  protected countKey(base: string, count: number): string {
    return count === 1 ? `${base}_one` : base;
  }
}

/** `año * 12 + mes` de una fecha `YYYY-MM-DD` (mes 0–11). */
function monthKey(iso: string): number {
  return Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
}
