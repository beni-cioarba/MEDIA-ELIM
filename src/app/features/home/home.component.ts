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
   *  - 0 → bloque "Redes sociales"
   *  - 1 → bloque "Transmisiones / EN DIRECTO"
   *  - 2 → bloque "Galería del departamento de media"
   * Se auto-rota cada `slideDurationMs` ms, salvo que el usuario lo
   * pause manualmente con el botón de pausa o pulse `Espacio`.
   */
  protected readonly currentSlide = signal<0 | 1 | 2>(0);
  protected readonly slidesCount = 3;
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
  ] as const;

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

    // Sub-carrusel del slide de galería: rota el evento destacado.
    // Sólo se activa en modo presentación (donde el slide es visible) para
    // evitar trabajo innecesario en la web pública estática.
    const galleryTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!this.fullscreen() || this.currentSlide() !== 2) return;
      const total = this.config.mediaEvents.length;
      if (total === 0) return;
      this.featuredEventIndex.update((i) => (i + 1) % total);
    }, 4_000);

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

    this.destroyRef.onDestroy(() => {
      clearInterval(highlightTimer);
      clearInterval(galleryTimer);
      clearInterval(stateInterval);
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  protected setSlide(index: number): void {
    if (index < 0 || index >= this.slidesCount) return;
    this.currentSlide.set(index as 0 | 1 | 2);
  }

  protected next(): void {
    this.currentSlide.update((i) => ((i + 1) % this.slidesCount) as 0 | 1 | 2);
  }

  protected prev(): void {
    this.currentSlide.update(
      (i) => ((i - 1 + this.slidesCount) % this.slidesCount) as 0 | 1 | 2
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
