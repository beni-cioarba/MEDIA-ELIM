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
import { TranslatePipe } from '@ngx-translate/core';
import { HeroSlide, ImageFocus } from '../../core/church.config';
import { ClockService } from '../../core/services/clock.service';
import { IconComponent } from '../icon/icon.component';

/** Cadencia por defecto del carrusel de portada. */
export const HERO_SLIDE_MS = 6_000;

/**
 * Traducción del encuadre a `object-position`. Es lo que decide qué parte de
 * la foto se conserva cuando el marco de la portada es más apaisado que la
 * foto (3:2): con `upper` el recorte se lleva el suelo y deja las caras.
 */
const FOCUS_Y: Readonly<Record<ImageFocus, string>> = {
  top: '0%',
  upper: '28%',
  center: '50%',
  lower: '72%',
  bottom: '100%',
};

/**
 * Portada a pantalla completa con carrusel automático.
 *
 * **Por qué a sangre y a pantalla completa.** Es la entrada de la casa: al
 * abrir la web se ve una foto de la iglesia ocupando todo el alto útil (el
 * viewport menos la cabecera) y las fotos se van sucediendo solas. El intento
 * anterior —portada partida, foto en un marco 3:2— resolvía el recorte pero
 * convertía la bienvenida en una ficha de producto: correcta y fría.
 *
 * **Cómo se resuelve el recorte** (que era la objeción real): las fotos son
 * 3:2 y el marco a pantalla completa es más apaisado, así que sobra alto. En
 * vez de centrar el recorte a ciegas, cada diapositiva declara su `focus`
 * (`upper` por defecto), que se traduce a `object-position`: el recorte se
 * come el suelo, no las cabezas. En vertical (móvil o ventana estrecha) el
 * recorte pasa a ser lateral y se centra, que es lo correcto para un grupo.
 *
 * **Sensación de movimiento**, que es lo que hace que una portada esté viva:
 *  - *Ken Burns*: la foto activa hace un zoom lento durante los 6 s que dura,
 *    alternando el sentido en cada diapositiva para que no se lea como un tic.
 *  - *Fundido largo* (1,2 s) entre fotos, no un corte.
 *  - *Barra de progreso* en cada punto: se rellena al ritmo real del carrusel,
 *    así que se ve cuánto falta para el cambio y se entiende que es automático.
 *
 * Reutilizable: recibe las diapositivas por `@Input` y proyecta el titular,
 * el subtítulo y las acciones mediante `<ng-content>`.
 *
 * Rendimiento y accesibilidad:
 *  - Sólo la primera imagen se carga con prioridad; el resto es `lazy`.
 *  - La rotación se detiene con la pestaña oculta (`ClockService.pageVisible`)
 *    y mientras el puntero o el foco están sobre la portada (WCAG 2.2.2). La
 *    barra de progreso se pausa con ella: si se para, se ve que se para.
 *  - Elegir un punto reinicia la cuenta, para que la barra no mienta.
 *  - Respeta `prefers-reduced-motion`: sin auto-avance, sin zoom y sin fundido.
 */
@Component({
  selector: 'app-hero-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  host: {
    '(mouseenter)': 'hold.set(true)',
    '(mouseleave)': 'hold.set(false)',
    '(focusin)': 'hold.set(true)',
    '(focusout)': 'hold.set(false)',
  },
  template: `
    <section
      class="hero"
      [class.is-paused]="paused()"
      [style.--hero-ms]="intervalMs + 'ms'"
      [attr.aria-roledescription]="'carousel'"
      [attr.aria-label]="'home.hero.aria' | translate"
    >
      <div class="hero__stage" [style.background-color]="current()?.tone || null">
        @for (frame of frames(); track frame.slide.id; let i = $index) {
          <img
            class="hero__image"
            [class.is-active]="i === index()"
            [src]="frame.slide.image"
            [srcset]="frame.srcset"
            sizes="100vw"
            [style.object-position]="frame.position"
            [attr.fetchpriority]="i === 0 ? 'high' : null"
            [attr.loading]="i === 0 ? 'eager' : 'lazy'"
            [attr.aria-hidden]="i !== index()"
            [alt]="captionKey(frame.slide) | translate"
            width="1600"
            height="1067"
            decoding="async"
          />
        }
      </div>

      <div class="hero__scrim" aria-hidden="true"></div>

      <div class="hero__inner">
        <div class="hero__text">
          <ng-content />
        </div>

        <div class="hero__bar">
          @if (current(); as slide) {
            <p class="hero__caption" aria-live="polite">
              <app-icon name="sparkles" />
              <span>{{ captionKey(slide) | translate }}</span>
            </p>
          }

          @if (slides().length > 1) {
            <div class="hero__dots">
              @for (slide of slides(); track slide.id; let i = $index) {
                <button
                  type="button"
                  class="hero__dot"
                  [class.is-active]="i === index()"
                  [attr.aria-current]="i === index() ? 'true' : null"
                  [attr.aria-label]="captionKey(slide) | translate"
                  (click)="select(i)"
                >
                  <span class="hero__dot-fill"></span>
                </button>
              }
            </div>
          }
        </div>
      </div>

      <span class="hero__cue" aria-hidden="true"></span>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /*
       * Alto: en móvil se deja asomar el contenido siguiente (una portada que
       * ocupa toda la pantalla del teléfono esconde la web entera); a partir
       * de 860 px ocupa el viewport menos la cabecera, que es sticky y por
       * tanto sí ocupa sitio en el flujo.
       */
      .hero {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: max(26rem, 66svh);
        overflow: hidden;
        isolation: isolate;
        background: var(--c-primary-darkest);
        color: var(--c-on-primary);
      }

      @media (min-width: 860px) {
        .hero {
          min-height: calc(100svh - var(--nav-height));
        }
      }

      /*
       * El fondo lleva el **color medio de la foto activa** (medido con
       * canvas, en church.config.ts). Mientras la imagen viaja por la red se
       * ve su propio tono en vez del navy de marca, que no se parece a nada de
       * lo que va a aparecer: la entrada deja de dar un salto de color. Cuesta
       * cero bytes.
       */
      .hero__stage {
        position: absolute;
        inset: 0;
        z-index: -2;
        transition: background-color 1.2s var(--ea-standard);
      }

      .hero__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        /* El fundido es largo a propósito: con 0,3 s se lee como un corte. */
        transition: opacity 1.2s var(--ea-standard);
      }

      .hero__image.is-active {
        opacity: 1;
        /* Ken Burns. La duración es la del carrusel, así que el zoom termina
           justo cuando entra la foto siguiente. El sentido alterna para que
           cinco diapositivas no parezcan la misma repetida. */
        animation: hero-zoom-in var(--hero-ms, 6000ms) var(--ea-standard) both;
      }

      .hero__image.is-active:nth-child(even) {
        animation-name: hero-zoom-out;
      }

      .hero.is-paused .hero__image.is-active {
        animation-play-state: paused;
      }

      @keyframes hero-zoom-in {
        from {
          transform: scale(1.02);
        }
        to {
          transform: scale(1.12);
        }
      }

      @keyframes hero-zoom-out {
        from {
          transform: scale(1.12) translateX(1%);
        }
        to {
          transform: scale(1.02) translateX(0);
        }
      }

      /*
       * Velo. En horizontal oscurece el lado del texto y deja ver la foto en
       * el otro; en vertical el texto ocupa todo el ancho, así que el velo
       * pasa a ser de abajo arriba. Sin esto no hay contraste AA sobre una
       * foto clara.
       */
      .hero__scrim {
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          linear-gradient(
            to top,
            color-mix(in srgb, var(--c-primary-darkest) 92%, transparent) 0%,
            color-mix(in srgb, var(--c-primary-darkest) 78%, transparent) 30%,
            color-mix(in srgb, var(--c-primary-darkest) 42%, transparent) 62%,
            color-mix(in srgb, var(--c-primary-darkest) 12%, transparent) 100%
          );
      }

      @media (min-width: 860px) {
        .hero__scrim {
          background:
            linear-gradient(
              100deg,
              color-mix(in srgb, var(--c-primary-darkest) 92%, transparent) 0%,
              color-mix(in srgb, var(--c-primary-darkest) 74%, transparent) 34%,
              color-mix(in srgb, var(--c-primary-darkest) 28%, transparent) 62%,
              color-mix(in srgb, var(--c-primary-darkest) 10%, transparent) 100%
            ),
            linear-gradient(
              to top,
              color-mix(in srgb, var(--c-primary-darkest) 55%, transparent) 0%,
              transparent 28%
            );
        }
      }

      /* El contenido se apoya abajo y el texto se empuja al centro óptico con
         el margen automático: así el titular no queda pegado al pie ni baila
         al cambiar de alto de pantalla. */
      .hero__inner {
        display: flex;
        /* Ocupa todo el alto de la portada: es lo que permite que el texto se
           centre con un margen automatico y que el pie quede abajo del todo. */
        flex: 1 1 auto;
        flex-direction: column;
        gap: clamp(1.5rem, 4vh, 3rem);
        width: min(100%, var(--w-wide));
        margin-inline: auto;
        padding: clamp(2.5rem, 8vh, 6rem) clamp(1rem, 5vw, 3rem) clamp(1.25rem, 3vh, 2rem);
      }

      /*
       * En móvil el texto se apoya en el pie, que es donde el velo es opaco:
       * centrado caía en la franja media de la foto —la más clara y la más
       * llena de detalle— y el subtítulo dejaba de leerse. En escritorio hay
       * velo lateral, así que ahí sí se centra.
       */
      .hero__text {
        max-width: 38rem;
        margin-top: auto;
      }

      @media (min-width: 860px) {
        .hero__text {
          margin-block: auto;
        }
      }

      /*
       * Pie de la portada, todo contra el margen izquierdo: el rótulo de la
       * foto y, debajo, los puntos. Se mantiene a la izquierda a propósito —
       * es el mismo eje de lectura que el titular, y deja libre la esquina
       * inferior derecha, donde flotan los botones de compartir y subir.
       */
      .hero__bar {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.6rem;
      }

      .hero__caption {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        max-width: 100%;
        margin: 0;
        padding: 0.32rem 0.85rem;
        border: 1px solid rgb(247 250 252 / 0.28);
        border-radius: var(--r-pill);
        background: color-mix(in srgb, var(--c-primary-darkest) 55%, transparent);
        backdrop-filter: blur(6px);
        font-size: var(--fs-sm);
        letter-spacing: var(--ls-meta);
        color: var(--c-on-primary);
      }

      .hero__caption span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .hero__caption app-icon {
        flex: none;
        color: var(--c-gold-soft);
      }

      /* Puntos con barra de progreso. El botón mide 1,5 rem de alto para
         poder pulsarlo con el dedo; lo que se ve es la pista interior. */
      .hero__dots {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
      }

      .hero__dot {
        display: grid;
        place-items: center;
        width: 2.5rem;
        height: 1.5rem;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
      }

      .hero__dot::before {
        content: '';
        grid-area: 1 / 1;
        width: 100%;
        height: 3px;
        border-radius: var(--r-pill);
        background: rgb(247 250 252 / 0.32);
        transition: background var(--mo-fast) var(--ea-standard);
      }

      .hero__dot:hover::before {
        background: rgb(247 250 252 / 0.6);
      }

      /* El relleno avanza al ritmo del carrusel: es el reloj a la vista. */
      .hero__dot-fill {
        grid-area: 1 / 1;
        width: 100%;
        height: 3px;
        border-radius: var(--r-pill);
        background: var(--c-gold);
        transform: scaleX(0);
        transform-origin: left center;
      }

      .hero__dot.is-active .hero__dot-fill {
        animation: hero-progress var(--hero-ms, 6000ms) linear both;
      }

      .hero.is-paused .hero__dot-fill {
        animation-play-state: paused;
      }

      @keyframes hero-progress {
        from {
          transform: scaleX(0);
        }
        to {
          transform: scaleX(1);
        }
      }

      .hero__dot:focus-visible {
        outline: 2px solid var(--c-gold);
        outline-offset: 2px;
        border-radius: var(--r-xs);
      }

      /*
       * Señal de scroll. En una portada que ocupa toda la pantalla hay que
       * decir que abajo hay más; si no, se lee como una página de una sola
       * pantalla. Es decorativa (el contenido real está a un scroll) y sólo
       * aparece donde la portada es a pantalla completa y hay sitio.
       */
      .hero__cue {
        display: none;
      }

      @media (min-width: 860px) and (min-height: 640px) {
        .hero__cue {
          position: absolute;
          left: 50%;
          bottom: 1.1rem;
          display: block;
          width: 1.35rem;
          height: 1.35rem;
          margin-left: -0.675rem;
          border-right: 2px solid rgb(247 250 252 / 0.55);
          border-bottom: 2px solid rgb(247 250 252 / 0.55);
          transform: rotate(45deg);
          animation: hero-cue 2.4s var(--ea-standard) infinite;
        }
      }

      @keyframes hero-cue {
        0%,
        100% {
          transform: translateY(-0.2rem) rotate(45deg);
          opacity: 0.35;
        }
        50% {
          transform: translateY(0.2rem) rotate(45deg);
          opacity: 0.85;
        }
      }

      /* Sin movimiento: ni zoom, ni fundido, ni barra que corre, ni señal que
         rebota. El punto activo se marca con color, que es información, no
         decoración. */
      @media (prefers-reduced-motion: reduce) {
        .hero__image,
        .hero__dot::before {
          transition: none;
        }

        .hero__image.is-active,
        .hero__dot.is-active .hero__dot-fill,
        .hero__cue {
          animation: none;
        }

        .hero__dot.is-active .hero__dot-fill {
          transform: scaleX(1);
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
      /*
       * Tres anchos y `sizes="100vw"`: la portada ocupa el ancho de la
       * ventana, así que el navegador elige solo. Antes sólo había `src` con
       * los 1600 px, y **un teléfono se descargaba la imagen de escritorio
       * entera** para pintar 390 px. Ahora un móvil 2× coge la de 960 (la
       * mitad de peso) y la de 480 queda para pantallas pequeñas y sencillas.
       */
      srcset: `${slide.thumb} 480w, ${slide.medium} 960w, ${slide.image} 1600w`,
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

  /** Puntero o foco sobre la portada: la rotación espera a que se vaya. */
  protected readonly hold = signal(false);

  /**
   * Reinicio manual de la cuenta. Al elegir un punto hay que volver a empezar
   * el intervalo; si no, la barra de progreso y el cambio real de foto dejan
   * de ir juntos y la barra miente.
   */
  private readonly restart = signal(0);

  /**
   * El carrusel está parado (puntero encima, foco dentro o pestaña oculta).
   * Lo consume la plantilla para pausar también el zoom y la barra: una
   * portada que se para con la barra corriendo se lee como un fallo.
   */
  protected readonly paused = computed(() => this.hold() || !this.clock.pageVisible());

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

    effect(() => {
      const total = this._slides().length;
      const visible = this.clock.pageVisible();
      const held = this.hold();
      this.restart();
      stop();

      if (total < 2 || !visible || held || prefersReducedMotion()) return;

      timer = setInterval(() => {
        this.index.update((i) => (i + 1) % total);
      }, this.intervalMs);
    });

    this.destroyRef.onDestroy(stop);
  }

  protected select(index: number): void {
    this.index.set(index);
    this.restart.update((v) => v + 1);
  }

  protected captionKey(slide: HeroSlide): string {
    return `home.hero.slides.${slide.i18nKey}`;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
