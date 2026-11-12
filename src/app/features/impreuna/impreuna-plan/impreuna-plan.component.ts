import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { PLAN_DAYS } from '../../../core/impreuna/impreuna-edition';
import {
  PassageRef,
  isFastingDay,
  localDateOfDay,
  monthOfDay,
  monthRange,
  refLabel,
} from '../../../core/impreuna/impreuna-plan';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ImpreunaHeaderComponent } from '../impreuna-header/impreuna-header.component';

const LOCALES = { ro: 'ro-RO', es: 'es-ES' } as const;

/** Un mes en el selector: nombre y cuánto lleva leído. */
interface MonthTab {
  readonly index: number;
  readonly short: string;
  readonly long: string;
  /** Días del mes ya leídos sobre los que ya han llegado (0–100). */
  readonly pct: number;
  readonly isCurrent: boolean;
}

/**
 * Proiectul Împreună · plan completo (`/impreuna/plan?luna=11`).
 *
 * Un mes cada vez (31 filas como mucho: se lee de un vistazo y no hay que
 * virtualizar nada), con el selector de meses como resumen del año: cada mes
 * lleva su barra de avance. Tabla real en escritorio; en el móvil cada fila
 * se recompone en una ficha de tres líneas con el ✓ siempre a mano.
 */
@Component({
  selector: 'app-impreuna-plan',
  imports: [RouterLink, TranslatePipe, IconComponent, ImpreunaHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './impreuna-plan.component.html',
  styleUrl: './impreuna-plan.component.scss',
})
export class ImpreunaPlanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly impreuna = inject(ImpreunaService);

  protected readonly year = this.impreuna.edition.year;
  protected readonly lang = this.impreuna.lang;

  private readonly monthParam = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('luna'))), {
    initialValue: null,
  });

  /** Mes de hoy (o el primero / el último fuera de la edición). */
  private readonly currentMonth = computed(() => {
    const { status, day } = this.impreuna.today();
    if (status === 'before') return 0;
    if (status === 'ended') return 11;
    return monthOfDay(this.year, day);
  });

  protected readonly month = computed(() => {
    const n = Number(this.monthParam());
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n - 1 : this.currentMonth();
  });

  protected readonly onlyUnread = signal(false);

  protected readonly months = computed<readonly MonthTab[]>(() => {
    const short = new Intl.DateTimeFormat(LOCALES[this.lang()], { month: 'short' });
    const long = new Intl.DateTimeFormat(LOCALES[this.lang()], { month: 'long' });
    const read = this.impreuna.read();
    const { status, day: today } = this.impreuna.today();
    const reached = status === 'before' ? 0 : today;
    return Array.from({ length: 12 }, (_, index) => {
      const { first, last } = monthRange(this.year, index);
      const due = Math.max(0, Math.min(last, reached) - first + 1);
      let done = 0;
      for (let d = first; d <= last; d++) if (read.has(d)) done++;
      const date = new Date(this.year, index, 1, 12);
      return {
        index,
        short: short.format(date).replace('.', ''),
        long: long.format(date),
        pct: due ? Math.min(100, Math.round((done / due) * 100)) : 0,
        isCurrent: index === this.currentMonth() && status === 'running',
      };
    });
  });

  protected readonly monthLabel = computed(() => this.months()[this.month()].long);

  protected readonly days = computed(() => {
    const { first, last } = monthRange(this.year, this.month());
    return PLAN_DAYS.slice(first - 1, last).map((d) => this.impreuna.view(d.day)!);
  });
  protected readonly rows = computed(() => (this.onlyUnread() ? this.days().filter((d) => !d.isRead) : this.days()));
  protected readonly readInMonth = computed(() => this.days().filter((d) => d.isRead).length);

  protected readonly printPath = ['/', APP_PATHS.impreuna, APP_PATHS.impreunaPrint];
  protected readonly todayFragment = computed(() => `ziua-${this.impreuna.todayDay()}`);

  ngOnInit(): void {
    this.impreuna.refresh();
  }

  protected selectMonth(index: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { luna: index + 1 },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected dayLink(day: number): readonly (string | number)[] {
    const today = this.impreuna.today();
    return today.status === 'running' && day === today.day
      ? ['/', APP_PATHS.impreuna]
      : ['/', APP_PATHS.impreuna, APP_PATHS.impreunaDay, day];
  }

  /** Primer jueves: post și rugăciune. */
  protected isFasting(day: number): boolean {
    return isFastingDay(this.year, day);
  }

  protected refLabel(ref: PassageRef): string {
    return refLabel(ref, this.lang());
  }

  protected date(day: number): string {
    return new Intl.DateTimeFormat(LOCALES[this.lang()], { weekday: 'short', day: 'numeric', month: 'short' })
      .format(localDateOfDay(this.year, day))
      .replace(/\./g, '');
  }
}
