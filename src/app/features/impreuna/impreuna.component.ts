import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { map } from 'rxjs';
import { CHURCH_CONFIG } from '../../core/church.config';
import {
  IMPREUNA_CULT_URL,
  IMPREUNA_FASTING_THEMES,
  IMPREUNA_FAST_SOURCE,
  IMPREUNA_SINCE,
  IMPREUNA_SITE,
  IMPREUNA_YOUTUBE,
  impreunaCalendarFile,
  impreunaPostUrl,
  youversionDayUrl,
  youversionPlanUrl,
} from '../../core/impreuna/impreuna.config';
import { EDITION_STATS, planDay } from '../../core/impreuna/impreuna-edition';
import {
  BIBLE_VERSIONS,
  PassageRef,
  bibleUrl,
  isFastingDay,
  isoDateOfDay,
  localDateOfDay,
  nextFastingDay,
  refLabel,
  relativeDay,
} from '../../core/impreuna/impreuna-plan';
import { ImpreunaService } from '../../core/impreuna/impreuna.service';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { SeoService } from '../../core/seo/seo.service';
import { CalendarService } from '../../core/services/calendar.service';
import { ClockService } from '../../core/services/clock.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { DayCalendarComponent } from './day-calendar/day-calendar.component';
import { DayVideoComponent } from './day-video/day-video.component';
import { ImpreunaHeaderComponent } from './impreuna-header/impreuna-header.component';
import { ImpreunaReminderComponent } from './reminder/impreuna-reminder.component';

const LOCALES = { ro: 'ro-RO', es: 'es-ES' } as const;
/** Cuánto se ve «Enlace copiado» tras compartir sin Web Share. */
const COPIED_MS = 2200;
/** Cuánto se ofrece «Deshacer» tras marcar todo hasta hoy. */
const UNDO_MS = 12_000;
/** Los cinco motivos generales del ayuno (`impreuna.fast.purpose_*`). */
const FAST_PURPOSES = [1, 2, 3, 4, 5].map((n) => `impreuna.fast.purpose_${n}`);

/** El día de ayuno que se está viendo, con su tema si el Cult lo publicó. */
interface FastView {
  readonly theme: string | null;
  /** Motivos concretos del mes; `null` = los cinco generales. */
  readonly reasons: readonly string[] | null;
  readonly source: string;
}

/**
 * Proiectul Împreună · el día (`/impreuna` = hoy, `/impreuna/ziua/:day` = un
 * día concreto: enlace para compartir y destino del calendario).
 *
 * Responde de un vistazo a «¿qué día estoy viendo y qué leo?»:
 *  · Barra del día: la fecha es un botón que abre el calendario; al lado, una
 *    etiqueta que dice dónde cae respecto a hoy («Azi», «Ieri», «Acum 36 de
 *    zile») y las flechas día a día con «Azi» para volver.
 *  · Lateral: el **calendario del plan** (elegir cualquier día; hoy, leídos y
 *    días de ayuno marcados) y el progreso. Sustituye a la lista «Săptămâna
 *    aceasta», que seguía al día elegido y hacía creer que se estaba en la
 *    semana actual.
 *  · Primer jueves: aviso de **post și rugăciune** con el motivo oficial (y el
 *    tema del mes si se ha cargado en `IMPREUNA_FASTING_THEMES`).
 */
@Component({
  selector: 'app-impreuna',
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    QRCodeComponent,
    DayCalendarComponent,
    DayVideoComponent,
    ImpreunaHeaderComponent,
    ImpreunaReminderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './impreuna.component.html',
  styleUrl: './impreuna.component.scss',
})
export class ImpreunaComponent {
  private readonly seo = inject(SeoService);
  private readonly clock = inject(ClockService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly calendar = inject(CalendarService);
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(CHURCH_CONFIG);
  private readonly injector = inject(Injector);
  protected readonly impreuna = inject(ImpreunaService);
  protected readonly pwa = inject(PwaInstallService);

  protected readonly year = this.impreuna.edition.year;
  protected readonly total = this.impreuna.edition.total;
  protected readonly lang = this.impreuna.lang;
  private readonly locale = computed(() => LOCALES[this.lang()]);

  // ── Día abierto ───────────────────────────────────────────────────────
  private readonly param = toSignal(this.route.paramMap.pipe(map((p) => p.get('day'))), { initialValue: null });
  /** Día pedido en la URL que no existe en el plan (se avisa y se enseña hoy). */
  protected readonly notFound = computed(() => {
    const raw = this.param();
    return raw !== null && !planDay(Number(raw)) ? raw : null;
  });
  protected readonly selected = computed(() => {
    const raw = this.param();
    return raw !== null && planDay(Number(raw)) ? Number(raw) : this.impreuna.todayDay();
  });
  protected readonly day = computed(() => this.impreuna.view(this.selected())!);

  /** «Marți, 6 octombrie». */
  protected readonly dateLong = computed(() => {
    const text = this.formatDate(this.day().day, { weekday: 'long', day: 'numeric', month: 'long' });
    return text.charAt(0).toLocaleUpperCase(this.locale()) + text.slice(1);
  });
  /** Dónde cae el día abierto respecto a hoy: «Azi», «Ieri», «Peste 5 zile»… */
  protected readonly relative = computed(() =>
    relativeDay(this.day().day, this.impreuna.today().day, this.locale()),
  );
  protected readonly isRunning = computed(() => this.impreuna.today().status === 'running');

  protected readonly version = computed(() => BIBLE_VERSIONS[this.lang()]);
  protected readonly otherLang = computed(() => (this.lang() === 'ro' ? 'es' : 'ro'));

  // ── Post și rugăciune ─────────────────────────────────────────────────
  protected readonly purposeKeys = FAST_PURPOSES;
  protected readonly fast = computed<FastView | null>(() => {
    const day = this.day();
    if (!isFastingDay(this.year, day.day)) return null;
    const theme = IMPREUNA_FASTING_THEMES.find((t) => t.date === day.date);
    return {
      theme: theme?.theme ?? null,
      reasons: theme?.reasons?.length ? theme.reasons : null,
      source: theme?.source ?? IMPREUNA_FAST_SOURCE,
    };
  });
  /** El día siguiente al abierto es de ayuno (aviso de víspera). */
  protected readonly fastTomorrow = computed(() => {
    const next = this.day().day + 1;
    return next <= this.total && isFastingDay(this.year, next) ? next : null;
  });
  /** Próximo día de ayuno desde hoy (para «Cum funcționează»). */
  protected readonly nextFastDay = computed(() => {
    const { status, day } = this.impreuna.today();
    return status === 'ended' ? null : nextFastingDay(this.year, status === 'before' ? 1 : day, this.total);
  });
  protected readonly nextFastLabel = computed(() => {
    const day = this.nextFastDay();
    return day ? this.formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  });
  protected readonly nextFastRelative = computed(() => {
    const day = this.nextFastDay();
    return day ? relativeDay(day, this.impreuna.today().day, this.locale()) : '';
  });
  protected readonly nextFastTheme = computed(() => {
    const day = this.nextFastDay();
    return day ? (IMPREUNA_FASTING_THEMES.find((t) => t.date === isoDateOfDay(this.year, day))?.theme ?? null) : null;
  });

  // ── Enlaces ───────────────────────────────────────────────────────────
  protected readonly bibleUrl = (ref: PassageRef) => bibleUrl(ref, this.lang());
  protected readonly otherBibleUrl = (ref: PassageRef) => bibleUrl(ref, this.otherLang());
  protected readonly refLabel = (ref: PassageRef) => refLabel(ref, this.lang());
  protected readonly postUrl = computed(() => {
    const id = this.day().media?.postId;
    return id ? impreunaPostUrl(id) : null;
  });
  protected readonly watchUrl = computed(() => {
    const id = this.day().media?.video;
    return id ? IMPREUNA_YOUTUBE.watch(id) : null;
  });
  protected readonly youversionDayUrl = computed(() =>
    youversionDayUrl(this.impreuna.edition.youversionPlan, this.day().youversionDay),
  );
  protected readonly youversionPlanUrl = youversionPlanUrl(this.impreuna.edition.youversionPlan);
  protected readonly youtube = IMPREUNA_YOUTUBE;
  protected readonly site = IMPREUNA_SITE;
  protected readonly cultUrl = IMPREUNA_CULT_URL;
  protected readonly planPath = ['/', APP_PATHS.impreuna, APP_PATHS.impreunaPlan];

  private readonly calendarFile = computed(() => impreunaCalendarFile(this.year, this.lang()));
  protected readonly webcalUrl = computed(() => this.calendar.webcalUrlFor(this.calendarFile()));
  protected readonly googleCalendarUrl = computed(() => this.calendar.googleSubscribeUrl(this.webcalUrl()));
  protected readonly icsUrl = computed(() => `assets/calendars/${this.calendarFile()}`);

  /** Ruta de un día: el de hoy es `/impreuna` (la URL que se recuerda). */
  protected dayLink(day: number): readonly (string | number)[] {
    const today = this.impreuna.today();
    return today.status === 'running' && day === today.day
      ? ['/', APP_PATHS.impreuna]
      : ['/', APP_PATHS.impreuna, APP_PATHS.impreunaDay, day];
  }
  protected readonly todayLink = ['/', APP_PATHS.impreuna];

  /** Enlace público del día (compartir y QR): siempre el dominio canónico. */
  protected readonly shareUrl = computed(() => {
    const path = this.dayLink(this.selected()).slice(1).join('/');
    const lang = this.lang() === 'es' ? '?lang=es' : '';
    return `${this.config.publicUrl.replace(/\/$/, '')}/${path}${lang}`;
  });

  // ── Contenido fijo ───────────────────────────────────────────────────
  protected readonly stats = EDITION_STATS;
  protected readonly since = IMPREUNA_SINCE;
  protected readonly editionCount = this.year - IMPREUNA_SINCE + 1;

  // ── Calendario en diálogo (desde el botón de la fecha) ───────────────
  private readonly picker = viewChild<ElementRef<HTMLDialogElement>>('picker');
  private readonly pickerCalendar = viewChild<DayCalendarComponent>('pickerCalendar');
  protected readonly pickerOpen = signal(false);

  // ── Compartir ─────────────────────────────────────────────────────────
  protected readonly copied = signal(false);

  // ── Marcar todo hasta hoy, con «Deshacer» ────────────────────────────
  /** Lo que había antes de marcar todo y cuántos días se marcaron. */
  protected readonly undo = signal<{ readonly previous: ReadonlySet<number>; readonly added: number } | null>(null);
  private undoTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Vídeos: al entrar y con cada tic del reloj (cada minuto con la pestaña
    // visible, y al volver a ella). El servicio sólo pregunta a la web del
    // proyecto si falta el vídeo de hoy y, como mucho, cada 30 minutos.
    effect(() => {
      this.clock.now();
      untracked(() => this.impreuna.refresh());
    });

    // La pestaña del navegador dice qué día se está viendo: «Iacov 1 · Azi ·
    // Proiectul Împreună» o «Psalmii 113…; · 6 oct. · Proiectul Împreună».
    effect(() => {
      this.lang();
      const day = this.day();
      const when = day.isToday ? this.relative() : this.formatDate(day.day, { day: 'numeric', month: 'short' });
      const title = untracked(() => this.translate.instant('impreuna.title') as string);
      this.seo.setOverride({ title: `${day.reading} · ${when} · ${title}` });
    });

    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.seo.setOverride(null);
      clearTimeout(this.undoTimer);
    });
  }

  protected markThrough(): void {
    const before = this.impreuna.read().size;
    const previous = this.impreuna.markThrough(this.impreuna.todayDay());
    this.undo.set({ previous, added: this.impreuna.read().size - before });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.undo.set(null), UNDO_MS);
  }

  protected undoMarkThrough(): void {
    const state = this.undo();
    if (!state) return;
    this.impreuna.restoreRead(state.previous);
    this.undo.set(null);
    clearTimeout(this.undoTimer);
  }

  /** Abre un día (desde el calendario o el diálogo). */
  protected goTo(day: number): void {
    void this.router.navigate(this.dayLink(day));
  }

  protected openPicker(): void {
    const dialog = this.picker()?.nativeElement;
    if (!dialog || dialog.open) return;
    this.pickerOpen.set(true);
    dialog.showModal();
    // El foco, en el día abierto (no en el botón de cerrar).
    afterNextRender(() => this.pickerCalendar()?.focus(), { injector: this.injector });
  }

  protected closePicker(): void {
    this.picker()?.nativeElement.close();
  }

  /** Clic fuera del panel (en el fondo del diálogo): cerrar. */
  protected onPickerClick(event: MouseEvent): void {
    if (event.target === this.picker()?.nativeElement) this.closePicker();
  }

  protected pickDay(day: number): void {
    this.closePicker();
    this.goTo(day);
  }

  protected async share(): Promise<void> {
    const day = this.day();
    const text = this.translate.instant('impreuna.day.share_text', {
      day: day.day,
      date: this.formatDate(day.day, { day: 'numeric', month: 'long' }),
      reading: day.reading,
    }) as string;
    const url = this.shareUrl();
    const nav = this.document.defaultView?.navigator;
    if (nav?.share) {
      try {
        await nav.share({ title: this.translate.instant('impreuna.title') as string, text, url });
        return;
      } catch {
        // Cancelado por el usuario o no permitido: se copia el enlace.
      }
    }
    if (await this.calendar.copyToClipboard(`${text}\n${url}`)) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), COPIED_MS);
    }
  }

  protected resetProgress(): void {
    const ok = this.document.defaultView?.confirm(this.translate.instant('impreuna.progress.reset_confirm') as string);
    if (ok) this.impreuna.clearRead();
  }

  protected install(): void {
    void this.pwa.install();
  }

  private formatDate(day: number, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale(), options).format(localDateOfDay(this.year, day));
  }
}
