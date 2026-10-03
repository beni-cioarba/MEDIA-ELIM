
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
  DOCUMENT
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { APP_PATHS } from '../../core/navigation/app-paths';
import {
  PastFamilyOption,
  PresentationBlockId,
  PresentationBlockState,
  PresentationBlocksService,
  PresentationSlide,
  SelectableBlockId,
  familySelectionId,
} from '../../core/services/presentation-blocks.service';
import {
  DURATION_MAX_S,
  COUNTDOWN_LEAD_OPTIONS,
  DURATION_MIN_S,
  PresentationDisplayService,
  slideTimeKeys,
} from '../../core/services/presentation-display.service';
import { Announcement } from '../../core/church.config';
import { AnnouncementsService, announcementParts } from '../../core/services/announcements.service';
import { SlideTiming } from '../../core/services/carousel.service';
import { ServiceCountdownService } from '../../core/services/service-countdown.service';
import { Peer, PresentationSyncService, elapsedMs } from '../../core/services/presentation-sync.service';
import { DisplayScreen, ProjectionWindowService } from '../../core/services/projection-window.service';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { SlideProgressDirective } from '../../shared/slide-progress/slide-progress.directive';

/** Un bloque con sus diapositivas, para la lista lateral del panel. */
interface BlockGroup {
  readonly state: PresentationBlockState;
  readonly slides: readonly PresentationSlide[];
}

/**
 * **Panel de control** de la proyección (`/media/control`) — la «vista del
 * presentador», como en PowerPoint.
 *
 * Qué hace:
 *  - Abre la **ventana de proyección** (`ProjectionWindowService`), si puede
 *    directamente en la segunda pantalla, y la cierra.
 *  - Muestra la **vista previa** en vivo: un `<iframe>` con la propia ruta de
 *    proyección en modo `preview`. Es una instancia real del escenario, así
 *    que lo que ve el operador es exactamente lo que se proyecta; y si no hay
 *    ventana abierta, la vista previa hace de proyector para ensayar.
 *  - **Transporte** (anterior, pausa, siguiente, ir a…) y progreso de la
 *    diapositiva en curso, reflejando al líder por `PresentationSyncService`.
 *  - **Lista de diapositivas** agrupada por bloque, con interruptor, duración
 *    y casilla por anuncio; todo escribe en los mismos servicios que usa la
 *    ventana, que lo relee al instante (evento `storage`).
 *
 * El panel **no proyecta**: no se une a la elección de líder. Por eso puede
 * cerrarse o recargarse sin que la proyección se detenga.
 */
@Component({
    selector: 'app-presenter',
    // Consola de realización con su propio lenguaje visual (no el de la web):
    // sus tokens viven en el `:host` de su hoja de estilos.
    imports: [TranslatePipe, DragDropModule, BrandLogoComponent, IconComponent, SlideProgressDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './presenter.component.html',
    styleUrl: './presenter.component.scss'
})
export class PresenterComponent implements OnInit {
  protected readonly blocks = inject(PresentationBlocksService);
  protected readonly display = inject(PresentationDisplayService);
  protected readonly sync = inject(PresentationSyncService);
  protected readonly projection = inject(ProjectionWindowService);
  protected readonly announcements = inject(AnnouncementsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly zone = inject(NgZone);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  protected readonly durationMin = DURATION_MIN_S;
  protected readonly durationMax = DURATION_MAX_S;
  protected readonly mediaLink = `/${APP_PATHS.media}`;

  /** El navegador bloqueó la ventana emergente: hay que permitir pop-ups. */
  protected readonly popupBlocked = signal<boolean>(false);

  /** URL de la vista previa (misma ruta de proyección en modo `preview`). */
  protected readonly previewUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    this.projection.projectionUrl({ rol: 'preview' }),
  );

  /** Estado del líder (ventana o vista previa): índice, pausa, plazo. */
  protected readonly state = this.sync.remoteState;

  /** Plazo de la diapositiva en curso, para las barras de progreso (CSS). */
  protected readonly timing = computed<SlideTiming | null>(() => {
    const s = this.state();
    return s
      ? { startedAt: s.startedAt, durationMs: s.durationMs, paused: s.paused, elapsedAtPause: s.elapsedAtPause }
      : null;
  });

  /**
   * Reloj del panel: UNA señal por segundo, sólo para los textos (hora,
   * transcurrido / restante). Las barras no lo necesitan: son animaciones CSS.
   */
  protected readonly now = signal<number>(Date.now());

  /** Diapositivas activas, las mismas que recorre el líder. */
  protected readonly slides = this.blocks.activeSlides;

  protected readonly currentIndex = computed<number>(() => this.state()?.index ?? 0);
  protected readonly currentSlide = computed<PresentationSlide | null>(() => {
    const key = this.state()?.slideKey;
    return this.slides().find((s) => s.key === key) ?? this.slides()[this.currentIndex()] ?? null;
  });
  protected readonly nextSlide = computed<PresentationSlide | null>(() => {
    const list = this.slides();
    if (list.length < 2) return null;
    return list[(this.currentIndex() + 1) % list.length] ?? null;
  });
  protected readonly isPaused = computed<boolean>(() => this.state()?.paused ?? false);

  /** Segundos transcurridos y totales de la diapositiva en curso. */
  protected readonly elapsedS = computed<number>(() => {
    const s = this.state();
    if (!s) return 0;
    const ms = elapsedMs(s, this.now());
    return Math.floor((s.durationMs > 0 ? Math.min(ms, s.durationMs) : ms) / 1000);
  });
  protected readonly durationS = computed<number>(() => Math.round((this.state()?.durationMs ?? 0) / 1000));
  protected readonly remainingS = computed<number>(() => Math.max(0, this.durationS() - this.elapsedS()));

  /** Hora local del panel («19:42:07»). */
  protected readonly clock = computed<string>(() =>
    new Date(this.now()).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );

  // ---- Cuenta atrás del culto ------------------------------------------------

  private readonly countdown = inject(ServiceCountdownService);
  protected readonly countdownLeads = COUNTDOWN_LEAD_OPTIONS;
  protected readonly countdownTarget = this.countdown.target;

  /** Segundos que faltan para el comienzo (reloj de 1 s del panel). */
  protected readonly countdownLeftS = computed<number>(() => {
    const t = this.countdownTarget();
    return t ? Math.max(0, Math.ceil((t.at - this.now()) / 1000)) : 0;
  });

  /** Ya se está viendo en la proyección. */
  protected readonly countdownOnAir = computed<boolean>(() => {
    const t = this.countdownTarget();
    return !!t && this.display.countdown().enabled && this.now() >= t.showFrom;
  });

  /** Hora desde la que se proyecta («17:30»). */
  protected readonly countdownFrom = computed<string>(() => {
    const t = this.countdownTarget();
    return t
      ? new Date(t.showFrom).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
      : '';
  });

  protected setCountdownEnabled(event: Event): void {
    this.display.setCountdownEnabled((event.target as HTMLInputElement).checked);
  }

  protected setCountdownManual(event: Event, time: string): void {
    event.preventDefault();
    if (time) this.display.setCountdownManual(time);
  }

  // ---- Salidas (pantallas) ---------------------------------------------

  /** Ventanas de proyección vivas en esta máquina (las abriera quien las abriera). */
  protected readonly outputs = this.sync.outputs;

  /** La ventana viva que proyecta en esta pantalla, si la hay. */
  protected outputOn(screen: DisplayScreen): Peer | null {
    const name = this.projection.nameFor(screen);
    return this.outputs().find((o) => o.name === name) ?? null;
  }

  /** Número de una salida (1, 2…): el que muestra al identificarla. */
  protected outputNumber(peer: Peer): number {
    return this.outputs().findIndex((o) => o.id === peer.id) + 1;
  }

  /** Salidas que no están en ninguna pantalla detectada (ventanas sueltas, pestañas). */
  protected readonly looseOutputs = computed<readonly Peer[]>(() => {
    const names = new Set(this.projection.screens().map((s) => this.projection.nameFor(s)));
    return this.outputs().filter((o) => !names.has(o.name));
  });

  // ---- Anuncios programados ----------------------------------------------

  private readonly soloDialog = viewChild<ElementRef<HTMLDialogElement>>('soloDialog');
  /** Anuncio en la vista de prueba, o `null`. */
  protected readonly soloAnnouncement = signal<Announcement | null>(null);
  /** Parte que se ve (1-based) de un anuncio en varias diapositivas. */
  protected readonly soloPart = signal<number>(1);
  protected readonly soloParts = computed<number>(() => {
    const a = this.soloAnnouncement();
    return a ? announcementParts(a) : 1;
  });
  protected readonly soloPartList = computed<readonly number[]>(() =>
    Array.from({ length: this.soloParts() }, (_, i) => i + 1),
  );
  protected readonly soloUrl = computed<SafeResourceUrl | null>(() => {
    const a = this.soloAnnouncement();
    if (!a) return null;
    const params = { rol: 'solo', anunt: a.id, parte: String(this.soloPart()) };
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.projection.projectionUrl(params));
  });

  /**
   * Bloques con **todas** sus diapositivas (también los anuncios ocultos, para
   * poder volver a marcarlos), para la lista lateral.
   */
  protected readonly groups = computed<readonly BlockGroup[]>(() =>
    this.blocks.states().map((state) => ({ state, slides: this.blocks.expand(state.id, 'panel') })),
  );

  constructor() {
    this.zone.runOutsideAngular(() => {
      const timer = setInterval(() => this.zone.run(() => this.now.set(Date.now())), 1_000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    });
  }

  ngOnInit(): void {
    this.document.title = this.translate.instant('presenter.title');
  }

  // ---- Ventanas de proyección -----------------------------------------

  /** Proyectar en una pantalla detectada, o en una ventana suelta nueva. */
  protected async open(screen?: DisplayScreen): Promise<void> {
    const result = await this.projection.open(screen);
    this.popupBlocked.set(result === 'blocked');
  }

  /** Proyectar a la vez en todas las pantallas que no son la del panel. */
  protected async openAllExternal(): Promise<void> {
    for (const screen of this.projection.screens()) {
      if (!screen.isCurrent && !this.outputOn(screen)) await this.open(screen);
    }
  }

  /** Hay alguna pantalla externa sin proyectar todavía. */
  protected readonly hasFreeExternal = computed<boolean>(() =>
    this.projection.screens().some((s) => !s.isCurrent && !this.outputOn(s)),
  );

  protected closeOutput(peer: Peer): void {
    this.projection.close(peer.name);
  }

  protected focusOutput(peer: Peer): void {
    this.projection.focus(peer.name);
  }

  protected toggleOutputFullscreen(peer: Peer): void {
    this.projection.toggleFullscreen(peer.name);
  }

  /** ¿Puede el panel mandar a esta ventana (la abrió él)? */
  protected canControl(peer: Peer): boolean {
    return this.projection.canControl(peer.name);
  }

  protected identify(): void {
    this.sync.identify();
  }

  // ---- Vista de prueba de anuncios programados ----------------------------

  protected openSolo(announcement: Announcement): void {
    this.soloPart.set(1);
    this.soloAnnouncement.set(announcement);
    queueMicrotask(() => this.soloDialog()?.nativeElement.showModal());
  }

  protected closeSolo(): void {
    this.soloDialog()?.nativeElement.close();
    this.soloAnnouncement.set(null);
  }

  /** La misma vista de prueba en una ventana, para arrastrarla al proyector. */
  protected openSoloWindow(announcement: Announcement): void {
    const result = this.projection.openSolo({ anunt: announcement.id });
    this.popupBlocked.set(result === 'blocked');
  }

  /** Fecha corta («4 oct.»). */
  protected shortDate(iso: string | undefined): string {
    if (!iso) return '';
    const lang = this.translate.getCurrentLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`));
    } catch {
      return iso;
    }
  }

  // ---- Transporte --------------------------------------------------------

  protected prev(): void {
    this.sync.sendCommand({ type: 'prev' });
  }

  protected next(): void {
    this.sync.sendCommand({ type: 'next' });
  }

  protected togglePause(): void {
    this.sync.sendCommand({ type: 'toggle' });
  }

  /** Índice en la rotación de la diapositiva de la lista (`-1` si no está activa). */
  private indexOf(slide: PresentationSlide): number {
    const exacto = this.slides().findIndex((s) => s.key === slide.key);
    if (exacto >= 0) return exacto;

    // Las filas de evento del panel son una por evento; en la rotación, en
    // cambio, un evento viaja dentro de una página (una o dos por
    // diapositiva, según el QR). La fila apunta a la página que lo lleva.
    const id = this.eventIdOf(slide);
    if (id === null) return -1;
    return this.slides().findIndex((s) => s.events?.some((e) => e.id === id) ?? false);
  }

  /** Id del evento de una fila del panel (`null` si la fila no es de evento). */
  private eventIdOf(slide: PresentationSlide): string | null {
    return slide.block === 'upcoming' && slide.events?.length === 1 ? slide.events[0].id : null;
  }

  /** Ir a una diapositiva por su clave (sólo si está activa). */
  protected goTo(slide: PresentationSlide): void {
    const index = this.indexOf(slide);
    if (index >= 0) this.sync.sendCommand({ type: 'goto', index });
  }

  protected isCurrent(slide: PresentationSlide): boolean {
    if (this.currentSlide()?.key === slide.key) return true;
    // Fila de evento: está «en pantalla» si la diapositiva en curso es la
    // página que lo contiene.
    const index = this.indexOf(slide);
    return index >= 0 && index === this.currentIndex();
  }

  /** Posición 1-based de una diapositiva en la rotación, o `null` si no entra. */
  protected position(slide: PresentationSlide): number | null {
    const index = this.indexOf(slide);
    return index >= 0 ? index + 1 : null;
  }

  /** Rótulo humano de una diapositiva: anuncio, página o nombre del bloque. */
  protected label(slide: PresentationSlide): string {
    if (slide.announcement) {
      const part = slide.page ? ` · ${slide.page.index + 1}/${slide.page.total}` : '';
      return `${slide.announcement.title}${part}`;
    }
    if (slide.family) return slide.family.fullName;
    if (slide.prayerWeek) {
      return `${this.translate.instant(slide.titleKey)} · ${this.translate.instant('family_prayer.summary')}`;
    }
    if (this.eventIdOf(slide) !== null) return slide.events![0].title;
    const base = this.translate.instant(slide.titleKey);
    return slide.page ? `${base} · ${slide.page.index + 1}/${slide.page.total}` : base;
  }

  /** ¿Es una fila de evento? (para pintar su casilla). */
  protected eventId(slide: PresentationSlide): string | null {
    return this.eventIdOf(slide);
  }

  protected isEventVisible(slide: PresentationSlide): boolean {
    const id = this.eventIdOf(slide);
    return id === null || this.blocks.visibleEvents().some((e) => e.id === id);
  }

  protected setEventVisible(id: string, event: Event): void {
    this.blocks.setEventVisible(id, (event.target as HTMLInputElement).checked);
  }

  /**
   * Bloque con selección elemento a elemento (y atajos «sólo el primero» /
   * «todos»), o `null` si el bloque es una sola diapositiva.
   */
  protected selectable(id: PresentationBlockId): SelectableBlockId | null {
    return id === 'announcements' || id === 'upcoming' || id === 'families' ? id : null;
  }

  /** Id de selección de una diapositiva de familias (resumen o ficha), o `null`. */
  protected familyId(slide: PresentationSlide): string | null {
    return slide.block === 'families' && slide.prayerWeek ? familySelectionId(slide) : null;
  }

  protected setFamilyVisible(id: string, event: Event): void {
    this.blocks.setFamilyVisible(id, (event.target as HTMLInputElement).checked);
  }

  protected isAnnouncementVisible(slide: PresentationSlide): boolean {
    return this.blocks.visibleAnnouncements().some((a) => a.id === slide.announcement?.id);
  }

  // ---- Tiempo propio de cada elemento ----------------------------------------
  //
  // Cada fila con elemento propio (anuncio, evento, ficha de familia) puede
  // durar distinto que su bloque. Por defecto hereda el de la cabecera; el
  // control sólo se ve al apuntar la fila, y si se cambia queda a la vista en
  // oro con su ↺. Un bloque nuevo con varias diapositivas entra solo en cuanto
  // `slideTimeKeys` sepa nombrar sus elementos.

  /** Clave de tiempo de la fila, o `null` si la fila no tiene tiempo propio. */
  protected timeKey(slide: PresentationSlide): string | null {
    return slideTimeKeys(slide)[0] ?? null;
  }

  /** Segundos escritos a mano en una fila: se acotan y se guardan al salir. */
  protected setItemDuration(key: string, block: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const seconds = Number(input.value);
    if (Number.isFinite(seconds) && input.value.trim() !== '') {
      this.display.setSlideDuration(key, block, seconds);
    }
    input.value = String(this.display.itemDuration(key, block));
  }

  // ---- Familias de semanas anteriores ------------------------------------

  /** Domingo de la semana de una familia anterior, corto («14 sept.»). */
  protected weekShort(option: PastFamilyOption): string {
    const lang = this.translate.getCurrentLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(
        new Date(`${option.week.presentedOn}T12:00:00`),
      );
    } catch {
      return option.week.presentedOn;
    }
  }

  /** Marcar en el desplegable: la familia pasa (para hoy) a la lista del bloque. */
  protected addPastFamily(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.blocks.setPastFamilyShown(id, input.checked);
    input.checked = false;
  }

  // ---- Orden de los bloques -----------------------------------------------

  /** Soltar tras arrastrar (CDK): el nuevo orden se guarda y se proyecta ya. */
  protected dropped(event: CdkDragDrop<readonly BlockGroup[]>): void {
    this.blocks.moveBlock(event.previousIndex, event.currentIndex);
  }

  /**
   * Alternativa al arrastre con teclado: con el foco en el agarrador,
   * ↑ / ↓ mueven el bloque una posición (Inicio / Fin, al extremo).
   */
  protected onGripKeydown(event: KeyboardEvent, index: number): void {
    const last = this.groups().length - 1;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowUp':
        target = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        target = Math.min(last, index + 1);
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = last;
        break;
    }
    if (target === null || target === index) return;
    event.preventDefault();
    event.stopPropagation();
    this.blocks.moveBlock(index, target);
    // Mantener el foco en el mismo agarrador tras reordenar el DOM.
    queueMicrotask(() => {
      const grips = this.document.querySelectorAll<HTMLButtonElement>('.group__grip');
      grips[target as number]?.focus();
    });
  }

  // ---- Ajustes ------------------------------------------------------------

  /** Segundos escritos a mano: se acotan a los límites y se guardan al salir del campo. */
  protected setDuration(id: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const seconds = Number(input.value);
    if (Number.isFinite(seconds) && input.value.trim() !== '') {
      this.display.setDuration(id, seconds);
    }
    // Reflejar el valor efectivo (acotado o restaurado) en el campo.
    input.value = String(this.display.durationFor(id));
  }

  /** Intro en el campo de segundos: confirmar (dispara `change`) y soltar el foco. */
  protected commitDuration(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  protected setEnabled(id: PresentationBlockId, event: Event): void {
    this.blocks.setEnabled(id, (event.target as HTMLInputElement).checked);
  }

  protected setAnnouncementVisible(id: string, event: Event): void {
    this.blocks.setAnnouncementVisible(id, (event.target as HTMLInputElement).checked);
  }

  protected setAutoAdvance(event: Event): void {
    this.display.setAutoAdvance((event.target as HTMLInputElement).checked);
  }

  protected setLiveNotice(event: Event): void {
    this.display.setLiveNotice((event.target as HTMLInputElement).checked);
  }

  protected resetAll(): void {
    this.blocks.resetAll();
    this.display.resetDurations();
  }

  /** «0:12», «12:47» o «1:05:30». */
  protected format(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mmss = `${h > 0 ? String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
    return h > 0 ? `${h}:${mmss}` : mmss;
  }

  /**
   * Atajos del operador, idénticos a los de la proyección. Se ignoran cuando
   * el foco está en un control (un botón enfocado ya reacciona a Espacio).
   */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(target.tagName)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      this.sync.sendCommand({ type: 'goto', index: Number(event.key) - 1 });
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        this.prev();
        break;
      case ' ':
        event.preventDefault();
        // En modo manual Espacio avanza (no hay reloj que pausar).
        if (this.display.autoAdvance()) this.togglePause();
        else this.next();
        break;
    }
  }
}
