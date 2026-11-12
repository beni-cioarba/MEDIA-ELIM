import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { isFastingDay, localDateOfDay, monthGrid, monthOfDay } from '../../../core/impreuna/impreuna-plan';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { IconComponent } from '../../../shared/icon/icon.component';

const LOCALES = { ro: 'ro-RO', es: 'es-ES' } as const;

/** Una casilla con día. */
interface CalendarCell {
  readonly day: number;
  readonly date: number;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isRead: boolean;
  readonly isFasting: boolean;
  /** «marți, 6 octombrie»: con la lectura y el estado, el nombre accesible. */
  readonly dateLabel: string;
  /** La lectura del día (también es el `title` al pasar el ratón). */
  readonly reading: string;
}

let nextId = 0;

/**
 * Calendario del plan: elegir **un día concreto** de la edición.
 *
 * Mes a la vista (‹ ›), semanas de lunes a domingo y en cada día su estado:
 *  · **día abierto** (el que enseña la página): relleno navy;
 *  · **hoy**: aro navy;
 *  · **leído**: punto verde;
 *  · **post și rugăciune** (primer jueves): fondo oro.
 * Al pasar el ratón sale la lectura; los lectores de pantalla la oyen con el
 * estado.
 *
 * Teclado (patrón *grid* de WAI-ARIA para selectores de fecha): una sola
 * casilla en el orden de tabulación; flechas = día / semana, Inicio / Fin =
 * lunes / domingo, RePág / AvPág = mes, Intro / Espacio = abrir ese día.
 */
@Component({
  selector: 'app-impreuna-calendar',
  imports: [TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-calendar.component.html',
  styleUrl: './day-calendar.component.scss',
})
export class DayCalendarComponent {
  private readonly impreuna = inject(ImpreunaService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Día abierto en la página. */
  readonly selected = input.required<number>();
  /** Se elige un día (clic, Intro o Espacio). */
  readonly pick = output<number>();

  protected readonly labelId = `imp-cal-${nextId++}`;
  private readonly year = this.impreuna.edition.year;
  private readonly total = this.impreuna.edition.total;

  /** Mes a la vista: sigue al día abierto, pero se puede hojear con ‹ ›. */
  protected readonly viewMonth = linkedSignal(() => monthOfDay(this.year, this.selected()));
  /** Casilla con el foco del teclado (la única tabulable). */
  private readonly focusDay = linkedSignal(() => this.selected());

  private readonly locale = computed(() => LOCALES[this.impreuna.lang()]);

  protected readonly monthLabel = computed(() => {
    const text = new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      new Date(this.year, this.viewMonth(), 1, 12),
    );
    return text.charAt(0).toLocaleUpperCase(this.locale()) + text.slice(1);
  });

  /**
   * Lunes a domingo abreviados a tres letras («LUN MAR MIE…») y su nombre
   * completo (`abbr`). No la inicial: en rumano «L M M J V S D» no distingue
   * marți de miercuri.
   */
  protected readonly weekdays = computed(() => {
    const short = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long' });
    // 9/11/2026 es lunes: siete días seguidos dan la semana en orden.
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2026, 10, 9 + i, 12);
      return { short: short.format(date).replace('.', ''), long: long.format(date) };
    });
  });

  protected readonly weeks = computed(() => {
    const today = this.impreuna.today();
    const selected = this.selected();
    const read = this.impreuna.read();
    const dateFormat = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    return monthGrid(this.year, this.viewMonth()).map((week) =>
      week.map((day): CalendarCell | null => {
        if (day === null) return null;
        const date = localDateOfDay(this.year, day);
        return {
          day,
          date: date.getDate(),
          isToday: today.status === 'running' && day === today.day,
          isSelected: day === selected,
          isRead: read.has(day),
          isFasting: isFastingDay(this.year, day),
          dateLabel: dateFormat.format(date),
          reading: this.impreuna.view(day)!.reading,
        };
      }),
    );
  });

  /** La casilla que entra en el orden de tabulación. */
  protected readonly tabDay = computed(() => {
    const month = this.viewMonth();
    const inView = (day: number) => monthOfDay(this.year, day) === month;
    if (inView(this.focusDay())) return this.focusDay();
    if (inView(this.selected())) return this.selected();
    const today = this.impreuna.today();
    if (today.status === 'running' && inView(today.day)) return today.day;
    return monthGrid(this.year, month).flat().find((d): d is number => d !== null) ?? 1;
  });

  /**
   * «Azi» en la cabecera, sólo cuando se ha hojeado a otro mes: vuelve al mes
   * de hoy y, si el día abierto no es hoy, abre hoy.
   */
  protected readonly showToday = computed(() => {
    const today = this.impreuna.today();
    return today.status === 'running' && this.viewMonth() !== monthOfDay(this.year, today.day);
  });

  protected readonly canPrev = computed(() => this.viewMonth() > 0);
  protected readonly canNext = computed(() => this.viewMonth() < 11);

  protected goToday(): void {
    const day = this.impreuna.today().day;
    this.viewMonth.set(monthOfDay(this.year, day));
    this.focusDay.set(day);
    if (day !== this.selected()) this.pick.emit(day);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  protected showMonth(delta: number): void {
    this.viewMonth.update((m) => Math.min(11, Math.max(0, m + delta)));
  }

  protected choose(day: number): void {
    this.focusDay.set(day);
    this.pick.emit(day);
  }

  protected onKey(event: KeyboardEvent, day: number): void {
    const date = localDateOfDay(this.year, day);
    const weekday = (date.getDay() + 6) % 7; // lunes = 0
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        target = day - 1;
        break;
      case 'ArrowRight':
        target = day + 1;
        break;
      case 'ArrowUp':
        target = day - 7;
        break;
      case 'ArrowDown':
        target = day + 7;
        break;
      case 'Home':
        target = day - weekday;
        break;
      case 'End':
        target = day + (6 - weekday);
        break;
      case 'PageUp':
      case 'PageDown': {
        const month = date.getMonth() + (event.key === 'PageUp' ? -1 : 1);
        if (month < 0 || month > 11) return;
        // El mismo número de día en el otro mes (o su último día).
        const lastOfMonth = new Date(this.year, month + 1, 0).getDate();
        const other = new Date(this.year, month, Math.min(date.getDate(), lastOfMonth), 12);
        target = Math.round((Date.UTC(this.year, other.getMonth(), other.getDate()) - Date.UTC(this.year, 0, 1)) / 86_400_000) + 1;
        break;
      }
      default:
        return;
    }
    event.preventDefault();
    const next = Math.min(this.total, Math.max(1, target));
    this.focusDay.set(next);
    this.viewMonth.set(monthOfDay(this.year, next));
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  /** Pone el foco en la casilla tabulable (al abrir el calendario en un diálogo). */
  focus(): void {
    this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-day="${this.tabDay()}"]`)?.focus();
  }
}
