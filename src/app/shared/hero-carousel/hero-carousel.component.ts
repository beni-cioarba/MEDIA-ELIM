import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HeroSlide, ImageFocus } from '../../core/church.config';
import { ClockService } from '../../core/services/clock.service';
import { IconComponent } from '../icon/icon.component';

/** Cadencia por defecto del carrusel de portada. */
export const HERO_SLIDE_MS = 6_000;

/**
 * Traducción del encuadre a `object-position`. El eje X siempre es 50%: las
 * fotos son más altas de lo que necesita la banda, nunca más anchas, así que
 * lo único que hay que decidir es la altura.
 */
const FOCUS_Y: Readonly<Record<ImageFocus, string>> = {
  top: '0%',
  upper: '28%',
  center: '50%',
  lower: '72%',
  bottom: '100%',
};

/**
 * Carrusel de fondo a pantalla ancha con fundido cruzado.
 *
 * Reutilizable: recibe las diapositivas por `@Input` y proyecta el contenido
 * (titular, botones…) por encima mediante `<ng-content>`.
 *
 * Rendimiento y accesibilidad:
 *  - Sólo la primera imagen se carga con prioridad; el resto es `lazy`.
 *  - La rotación se detiene cuando la pestaña no está visible
 *    (`ClockService.pageVisible`) para no gastar batería ni repintar.
 *  - Respeta `prefers-reduced-motion`: sin auto-avance ni transiciones.
 */
@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IconComponent],
  template: `
    <div class="hero" [attr.aria-roledescription]="'carousel'">
      <div class="hero__media" aria-hidden="true">
        @for (frame of frames(); track frame.slide.id; let i = $index) {
          <img
            class="hero__image"
            [class.is-active]="i === index()"
            [src]="frame.slide.image"
            [style.object-position]="frame.position"
            [attr.fetchpriority]="i === 0 ? 'high' : null"
            [attr.loading]="i === 0 ? 'eager' : 'lazy'"
            decoding="async"
            alt=""
          />
        }
        <div class="hero__scrim"></div>
      </div>

      <div class="hero__content">
        <ng-content />

        @if (current(); as slide) {
          <p class="hero__caption">
            <app-icon name="sparkles" />
            <span>{{ captionKey(slide) | translate }}</span>
          </p>
        }
      </div>

      @if (slides().length > 1) {
        <div class="hero__dots" role="tablist" [attr.aria-label]="'home.hero.aria' | translate">
          @for (slide of slides(); track slide.id; let i = $index) {
            <button
              type="button"
              class="hero__dot"
              role="tab"
              [class.is-active]="i === index()"
              [attr.aria-selected]="i === index()"
              [attr.aria-label]="captionKey(slide) | translate"
              (click)="select(i)"
            ></button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .hero {
        position: relative;
        display: grid;
        place-items: center;
        overflow: hidden;
        isolation: isolate;

        /*
         * Geometría de la banda. Las fotos son 3:2 y un hero a sangre nunca
         * puede tener esa proporción (a 1920 px serían 1280 px de alto), así
         * que SIEMPRE se recorta algo. Lo que sí se puede es evitar que el
         * recorte crezca sin control en pantallas grandes:
         *
         *   - 50vw hace que la banda tienda a 2:1 en vez de estirarse a
         *     3:1 (a 1920 px: 960 px de alto → se pierde el 25 % de la foto
         *     en vez del 37 %; a 2560 px la diferencia es aún mayor).
         *   - El segundo término reserva la altura de la barra para que el
         *     hero entero quepa sobre la línea de flotación, también en
         *     portátiles bajos (1366×768).
         *   - El clamp fija el suelo en móvil y un techo para monitores
         *     enormes.
         */
        min-height: clamp(24rem, min(50vw, calc(100vh - var(--nav-height))), 64rem);
      }

      .hero__media {
        position: absolute;
        inset: 0;
        z-index: -1;
      }

      .hero__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* El encuadre lo decide cada diapositiva (object-position inline).
           Este valor es sólo la red de seguridad. */
        object-position: 50% 28%;
        opacity: 0;
        transform: scale(1.06);
        transition: opacity 1.2s ease, transform 7s linear;
      }

      .hero__image.is-active {
        opacity: 1;
        transform: scale(1);
      }

      .hero__scrim {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            180deg,
            rgba(18, 40, 68, 0.72) 0%,
            rgba(18, 40, 68, 0.58) 45%,
            rgba(18, 40, 68, 0.86) 100%
          );
      }

      .hero__content {
        position: relative;
        width: min(100%, 62rem);
        padding: clamp(3rem, 9vh, 6rem) clamp(1.2rem, 5vw, 3rem);
        text-align: center;
        color: var(--c-on-primary);
      }

      .hero__caption {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin: 1.6rem 0 0;
        padding: 0.32rem 0.85rem;
        border: 1px solid rgba(247, 250, 252, 0.28);
        border-radius: 999px;
        background: rgba(18, 40, 68, 0.4);
        backdrop-filter: blur(6px);
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        color: rgba(247, 250, 252, 0.9);
      }

      .hero__caption app-icon {
        color: var(--c-gold-soft);
      }

      .hero__dots {
        position: absolute;
        left: 50%;
        bottom: clamp(1rem, 3vh, 1.8rem);
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
      }

      .hero__dot {
        width: 2rem;
        height: 3px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: rgba(247, 250, 252, 0.35);
        cursor: pointer;
        transition: background 0.25s ease, width 0.25s ease;
      }

      .hero__dot.is-active {
        width: 3rem;
        background: var(--c-gold);
      }

      @media (prefers-reduced-motion: reduce) {
        .hero__image,
        .hero__dot {
          transition: none;
        }

        .hero__image {
          transform: none;
        }
      }
    `,
  ],
})
export class HeroCarouselComponent {
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _slides = signal<readonly HeroSlide[]>([]);
  protected readonly slides = this._slides.asReadonly();

  /**
   * Diapositivas con su encuadre ya resuelto. Se calcula una sola vez por
   * cambio de lista, no en cada detección de cambios.
   */
  protected readonly frames = computed(() =>
    this.slides().map((slide) => ({
      slide,
      position: `50% ${FOCUS_Y[slide.focus ?? 'upper']}`,
    })),
  );

  @Input({ required: true })
  set items(value: readonly HeroSlide[] | null) {
    this._slides.set(value ?? []);
    this.index.set(0);
  }

  /** Cadencia del auto-avance en milisegundos. */
  @Input() intervalMs = HERO_SLIDE_MS;

  protected readonly index = signal(0);

  protected readonly current = computed<HeroSlide | null>(
    () => this._slides()[this.index()] ?? null,
  );

  constructor() {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = (): void => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    effect(
      () => {
        const total = this._slides().length;
        const visible = this.clock.pageVisible();
        stop();

        if (total < 2 || !visible || prefersReducedMotion()) return;

        timer = setInterval(() => {
          this.index.update((i) => (i + 1) % total);
        }, this.intervalMs);
      },
      { allowSignalWrites: true },
    );

    this.destroyRef.onDestroy(stop);
  }

  protected select(index: number): void {
    this.index.set(index);
  }

  protected captionKey(slide: HeroSlide): string {
    return `home.hero.slides.${slide.i18nKey}`;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
