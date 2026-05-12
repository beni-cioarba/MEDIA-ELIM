import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CHURCH_CONFIG } from '../../core/church.config';
import { PresentationService } from '../../core/presentation.service';
import { SocialLink } from '../../core/social-link.model';
import { YouTubeService } from '../../core/youtube.service';
import { SocialIconComponent } from '../../shared/social-icon/social-icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { QrPanelComponent } from '../../shared/qr-panel/qr-panel.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';
import { FloatingActionsComponent } from '../../shared/floating-actions/floating-actions.component';

/**
 * Pantalla principal de la web — pensada como una "diapositiva" estática
 * para proyectar en la iglesia: marca, redes sociales, QR y logo.
 *
 * Características clave:
 *  - i18n completo (ES/RO) vía `@ngx-translate/core`.
 *  - QR generado con la URL pública actual (configurable en `church.config.ts`).
 *  - Modo presentación a pantalla completa (Fullscreen API) con tecla `F`.
 *  - Resaltado rotatorio sutil entre redes para que la pantalla "viva".
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NgOptimizedImage,
    TranslateModule,
    SocialIconComponent,
    LangSwitcherComponent,
    QrPanelComponent,
    FooterComponent,
    ShareButtonComponent,
    FloatingActionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly presentation = inject(PresentationService);
  protected readonly youtube = inject(YouTubeService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reacciona ante cambios de idioma para recomputar etiquetas i18n. */
  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  /** Índice de la tarjeta resaltada actualmente (rota cada 4s). */
  protected readonly highlightedIndex = signal<number>(0);

  /**
   * Slide activo del carrusel lateral en modo presentación.
   *  - 0 → "Redes sociales"
   *  - 1 → "Transmisiones / EN DIRECTO"
   *  - 2 → "Galería del departamento de media"
   *  - 3 → "Programare săptămânală"
   *  - 4 → "Evenimente viitoare"
   * Se auto-rota cada `slideDurationMs` ms, salvo que el usuario lo
   * pause manualmente con el botón de pausa o pulse `Espacio`.
   */
  protected readonly currentSlide = signal<number>(0);
  protected readonly slidesCount = 5;
  protected readonly slideDurationMs = 12_000;

  /** Estado de pausa del carrusel (controlable manualmente). */
  protected readonly isPaused = signal<boolean>(false);

  /** Progreso (0-100) del slide actual hacia el siguiente. */
  protected readonly slideProgress = signal<number>(0);

  /** Etiquetas estáticas (i18n) para cada slide del carrusel. */
  protected readonly slideTitles = [
    'socials.section_title',
    'streams.title',
    'gallery.title',
    'weekly.title',
    'upcoming.title',
  ] as const;

  /** Indices del carrusel iterables în template (evita hardcode `[0,1,2]`). */
  protected readonly slideIndexes = Array.from({ length: this.slidesCount }, (_, i) => i);

  /**
   * Reloj reactivo que se actualiza la 1 minut. Folosit pentru:
   *   - calcular ziua curentă (highlight în programul săptămânal)
   *   - recalcula "faltan X días" pentru evenimente viitoare
   * Un singur signal evită multiple `setInterval` distribuite.
   */
  private readonly now = signal<number>(Date.now());

  /** Ziua săptămânii curentă (0=Duminică ... 6=Sâmbătă). */
  protected readonly currentWeekDay = computed<number>(() => {
    return new Date(this.now()).getDay();
  });

  /**
   * Programul săptămânal mutat astfel încât prima zi este astăzi.
   * Acest reorder face ca slide-ul de prezentare să arate mereu "azi" primul,
   * urmat de mâine etc. — mult mai relevant pentru audiența din biserică.
   */
  protected readonly weeklyProgramSorted = computed(() => {
    const today = this.currentWeekDay();
    const items = [...this.config.weeklyProgram];
    // Sort: distance forward in week from today (0..6).
    return items.sort((a, b) => {
      const da = (a.day - today + 7) % 7;
      const db = (b.day - today + 7) % 7;
      return da - db;
    });
  });

  /**
   * Evenimente viitoare cu metadate calculate (zile rămase, este astăzi).
   * Filtrează evenimentele trecute și le sortează cronologic.
   */
  protected readonly upcomingEventsView = computed(() => {
    const today = this.startOfDay(new Date(this.now()));
    return this.config.upcomingEvents
      .map((ev) => {
        const evDate = this.startOfDay(this.parseIsoDate(ev.date));
        const diffMs = evDate.getTime() - today.getTime();
        const daysLeft = Math.round(diffMs / 86_400_000);
        return { ...ev, daysLeft, isToday: daysLeft === 0, isPast: daysLeft < 0 };
      })
      .filter((ev) => !ev.isPast)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  });

  /** Programul de astăzi (dacă există) — folosit pentru highlight "AZI". */
  protected readonly todayProgram = computed(() => {
    const today = this.currentWeekDay();
    return this.config.weeklyProgram.find((p) => p.day === today) ?? null;
  });

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private parseIsoDate(iso: string): Date {
    // Format așteptat: YYYY-MM-DD. Construim local pentru a evita decalaje TZ.
    const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
    return new Date(y, (m || 1) - 1, d || 1);
  }

  /**
   * Returnează data formatată local (ex: "31 mai 2026") respectând limba activă.
   */
  protected formatEventDate(iso: string): string {
    const date = this.parseIsoDate(iso);
    const lang = this.translate.currentLang || this.translate.defaultLang || 'ro';
    try {
      return new Intl.DateTimeFormat(lang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return iso;
    }
  }

  /**
   * Índice del evento destacado dentro del slide de galería. Rota
   * automáticamente cada 3.5 s para dar dinamismo, sin afectar al
   * carrusel principal.
   */
  protected readonly featuredEventIndex = signal<number>(0);

  /** URL final que se codifica en el QR. */
  protected readonly qrData = computed<string>(() => this.resolveQrUrl());

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** Aria-label pre-traducido para cada red social (recomputa al cambiar idioma). */
  protected readonly socialAria = computed<Record<string, string>>(() => {
    this.langChange();
    const out: Record<string, string> = {};
    for (const s of this.config.socials) {
      const name = this.translate.instant(`socials.items.${s.i18nKey}.name`);
      out[s.id] = this.translate.instant('socials.open_aria', { name });
    }
    return out;
  });

  /**
   * Cambia el evento destacado actal de la galería.
   */
  selectFeaturedEvent(index: number) {
    this.featuredEventIndex.set(index);
  }

  ngOnInit(): void {
    this.youtube.start();

    // Resaltado rotatorio entre redes sociales: cambia cada 4s para que la
    // pantalla "viva". Se pausa si la pestaña está oculta para no gastar CPU.
    const highlightTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const total = this.config.socials.length;
      if (total === 0) return;
      this.highlightedIndex.update((i) => (i + 1) % total);
    }, 4_000);

    // Sub-carrusel del slide de galería: rota el evento destacado cada 4.5s.
    // Si estamos en modo presentación, solo rota si el slide de galería (2) está activo.
    // Si NO estamos en modo presentación, rota siempre (ya que todo está visible).
    const galleryTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this.fullscreen() && this.currentSlide() !== 2) return;
      
      const total = this.config.mediaEvents.length;
      if (total === 0) return;
      this.featuredEventIndex.update((i) => (i + 1) % total);
    }, 4_500);

    // Auto-rotación del carrusel basada en `requestAnimationFrame`.
    // El loop se *detiene por completo* cuando no estamos en fullscreen o
    // la pestaña está oculta — evita el lag observado al entrar en modo
    // presentación (antes corría siempre, en paralelo a la transición CSS).
    let rafId = 0;
    let lastTimestamp: number | null = null;
    let elapsed = 0;
    let lastObservedSlide = this.currentSlide();

    const tick = (timestamp: number) => {
      if (lastTimestamp == null) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const slide = this.currentSlide();
      if (slide !== lastObservedSlide) {
        lastObservedSlide = slide;
        elapsed = 0;
        this.slideProgress.set(0);
      }

      const active =
        this.fullscreen() &&
        !this.isPaused() &&
        !(typeof document !== 'undefined' && document.hidden);

      if (active) {
        elapsed += delta;
        const pct = Math.min(100, (elapsed / this.slideDurationMs) * 100);
        this.slideProgress.set(pct);
        if (elapsed >= this.slideDurationMs) {
          elapsed = 0;
          this.slideProgress.set(0);
          this.next();
        }
        rafId = requestAnimationFrame(tick);
      } else {
        if (this.slideProgress() !== 0) this.slideProgress.set(0);
        elapsed = 0;
        lastTimestamp = null;
        rafId = 0;
      }
    };

    // Arranca/para el rAF según cambia el modo presentación o la pausa.
    const stateInterval = setInterval(() => {
      const shouldRun =
        this.fullscreen() &&
        !this.isPaused() &&
        !(typeof document !== 'undefined' && document.hidden);
      if (shouldRun && rafId === 0) {
        lastTimestamp = null;
        rafId = requestAnimationFrame(tick);
      }
    }, 250);

    // Reloj reactivo: actualiza `now()` cada minuto pentru ca "AZI" și
    // contoarele "faltan X zile" să fie corecte chiar dacă pagina rămâne
    // deschisă ore întregi (sau peste miezul nopții).
    const clockTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      this.now.set(Date.now());
    }, 60_000);

    this.destroyRef.onDestroy(() => {
      clearInterval(highlightTimer);
      clearInterval(galleryTimer);
      clearInterval(stateInterval);
      clearInterval(clockTimer);
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  protected setSlide(index: number): void {
    if (index < 0 || index >= this.slidesCount) return;
    this.currentSlide.set(index);
  }

  protected next(): void {
    this.currentSlide.update((i) => (i + 1) % this.slidesCount);
  }

  protected prev(): void {
    this.currentSlide.update(
      (i) => (i - 1 + this.slidesCount) % this.slidesCount
    );
  }

  protected togglePause(): void {
    this.isPaused.update((p) => !p);
  }

  /**
   * Atajos de teclado pensados para el portátil que controla la presentación:
   *  - F           → alterna pantalla completa.
   *  - Esc         → sale del modo simulado.
   *  - ←  /  →     → navega entre slides del carrusel.
   *  - Espacio     → pausa / reanuda el auto-avance.
   *  - 1 / 2       → salta directamente al slide indicado.
   */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.presentation.isSimulated()) {
      event.preventDefault();
      this.presentation.exitSimulatedIfActive();
      return;
    }
    if (event.key === 'f' || event.key === 'F') {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      void this.presentation.toggle();
      return;
    }
    // Controles del carrusel (sólo activos en modo presentación para no
    // entorpecer la navegación normal del visitante en la web pública).
    if (!this.fullscreen()) return;
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
      case ' ': // Espacio
      case 'Spacebar':
        event.preventDefault();
        this.togglePause();
        break;
      case '1':
        event.preventDefault();
        this.setSlide(0);
        break;
      case '2':
        event.preventDefault();
        this.setSlide(1);
        break;
      case '3':
        event.preventDefault();
        this.setSlide(2);
        break;
      case '4':
        event.preventDefault();
        this.setSlide(3);
        break;
      case '5':
        event.preventDefault();
        this.setSlide(4);
        break;
    }
  }

  protected toggleFullscreen(): void {
    void this.presentation.toggle();
  }

  protected gradient(link: SocialLink): string {
    const [from, to] = link.gradient;
    return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  }

  protected eventGradient(event: { gradient: readonly [string, string] }): string {
    const [from, to] = event.gradient;
    return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  }

  /**
   * Resuelve la URL a codificar en el QR.
   * Ahora está forzado a usar la URL public din `church.config.ts` pentru a
   * garanta mereu redirecționarea la producție, chiar dacă e rulat pe localhost.
   */
  private resolveQrUrl(): string {
    return this.config.publicUrl;
  }
}
