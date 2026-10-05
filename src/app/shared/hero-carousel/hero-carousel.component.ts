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
    '(pointerdown)': 'swipeStart($event)',
    '(pointerup)': 'swipeEnd($event)',
    '(pointercancel)': 'swipeX = null',
    '(keydown.arrowleft)': 'onArrow($event, -1)',
    '(keydown.arrowright)': 'onArrow($event, 1)',
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

        <!--
          Pie de la portada: una sola pieza, alineada con el titular. Arriba
          la pista de progreso (un segmento por foto) y debajo los mandos —
          pausa, anterior, siguiente—, el contador y el rótulo de la foto.
          Mandos explícitos y no sólo puntos: WCAG 2.2.2 pide poder parar un
          contenido que se mueve solo, y en el teléfono no hay «puntero
          encima» que lo pare.
        -->
        <div class="hero__bar">
          @if (slides().length > 1) {
            <div class="hero__dots" [style.--dots]="slides().length">
              @for (slide of slides(); track slide.id; let i = $index) {
                <button
                  type="button"
                  class="hero__dot"
                  [class.is-active]="i === index()"
                  [class.is-done]="i < index()"
                  [attr.aria-current]="i === index() ? 'true' : null"
                  [attr.aria-label]="captionKey(slide) | translate"
                  (click)="select(i)"
                >
                  <span class="hero__dot-fill"></span>
                </button>
              }
            </div>
          }

          <div class="hero__controls">
            @if (slides().length > 1) {
              @if (!reducedMotion) {
                <button
                  type="button"
                  class="hero__ctl"
                  [attr.aria-pressed]="userPaused()"
                  [attr.aria-label]="(userPaused() ? 'home.hero.play' : 'home.hero.pause') | translate"
                  (click)="togglePause()"
                >
                  <app-icon [name]="userPaused() ? 'play' : 'pause'" />
                </button>
              }
              <button
                type="button"
                class="hero__ctl hero__ctl--step"
                [attr.aria-label]="'home.hero.prev' | translate"
                (click)="step(-1)"
              >
                <app-icon name="chevron-left" />
              </button>
              <button
                type="button"
                class="hero__ctl hero__ctl--step"
                [attr.aria-label]="'home.hero.next' | translate"
                (click)="step(1)"
              >
                <app-icon name="chevron-right" />
              </button>

              <span class="hero__count" aria-hidden="true">
                <b>{{ pad(index() + 1) }}</b><span>/ {{ pad(slides().length) }}</span>
              </span>
            }

            @for (slide of currentList(); track slide.id) {
              <p class="hero__caption" aria-live="polite">{{ captionKey(slide) | translate }}</p>
            }
          </div>
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
        /* El gesto vertical es del navegador (scroll); el horizontal, del
           carrusel: deslizar cambia de foto, como en cualquier galería. */
        touch-action: pan-y;
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
        max-width: 44rem;
        margin-top: auto;
      }

      @media (min-width: 860px) {
        .hero__text {
          margin-block: auto;
        }
      }

      /*
       * Pie de la portada, contra el margen izquierdo y con un ancho fijo en
       * el eje del titular: deja libre la esquina inferior derecha, donde
       * flotan los botones de compartir y subir. Dos filas: la pista de
       * progreso y, debajo, mandos + contador + rótulo. Antes eran dos
       * pastillas sueltas (rótulo y «hoy») que se leían como la misma cosa;
       * el rótulo ahora es texto, no pastilla.
       */
      .hero__bar {
        display: grid;
        gap: 0.7rem;
        width: min(100%, 30rem);
      }

      .hero__controls {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
      }

      /* Mando redondo de cristal: 2,5 rem = 40 px, objetivo táctil holgado
         (WCAG 2.5.8 pide 24) sin que el pie crezca. */
      .hero__ctl {
        display: grid;
        place-items: center;
        flex: none;
        width: 2.5rem;
        height: 2.5rem;
        padding: 0;
        border: 1px solid rgb(247 250 252 / 0.24);
        border-radius: 50%;
        background: rgb(9 20 36 / 0.38);
        backdrop-filter: blur(8px);
        font-size: 1.1rem;
        color: var(--c-on-primary);
        cursor: pointer;
        transition:
          background var(--mo-fast) var(--ea-standard),
          border-color var(--mo-fast) var(--ea-standard);
      }

      .hero__ctl:hover {
        border-color: rgb(247 250 252 / 0.55);
        background: rgb(247 250 252 / 0.14);
      }

      .hero__ctl:focus-visible {
        outline: 2px solid var(--c-gold);
        outline-offset: 2px;
      }

      .hero__ctl[aria-pressed='true'] {
        border-color: var(--c-gold);
        color: var(--c-gold-soft);
      }

      /* Contador en cifras tabulares: «03 / 09» no baila al pasar de foto. */
      .hero__count {
        flex: none;
        display: inline-flex;
        align-items: baseline;
        gap: 0.3rem;
        margin-inline: 0.5rem 0.15rem;
        font-size: var(--fs-sm);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.06em;
        color: rgb(247 250 252 / 0.62);
      }

      .hero__count b {
        font-weight: 700;
        color: var(--c-on-primary);
      }

      .hero__caption {
        min-width: 0;
        margin: 0;
        padding-left: 0.75rem;
        border-left: 1px solid rgb(247 250 252 / 0.28);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--fs-sm);
        letter-spacing: var(--ls-meta);
        color: rgb(247 250 252 / 0.86);
        animation: hero-caption 0.6s var(--ea-standard) both;
      }

      @keyframes hero-caption {
        from {
          opacity: 0;
          transform: translateY(0.35rem);
        }
      }

      /*
       * Pista de progreso: un segmento por foto, siempre en UNA fila (con
       * más fotos cada segmento encoge en vez de saltar de línea). Ocupa el
       * ancho del pie, así que queda alineada con los mandos de debajo. El
       * botón mide 1,25 rem de alto para poder pulsarlo; lo que se ve es la
       * pista interior. Las fotos ya vistas quedan llenas a medio tono: se
       * lee de un vistazo por dónde va el pase.
       */
      .hero__dots {
        display: flex;
        flex-wrap: nowrap;
        gap: 0.3rem;
        width: 100%;
      }

      .hero__dot {
        display: grid;
        place-items: center;
        flex: 1 1 0;
        min-width: 0;
        height: 1.25rem;
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
        background: rgb(247 250 252 / 0.28);
        transition:
          background var(--mo-fast) var(--ea-standard),
          height var(--mo-fast) var(--ea-standard);
      }

      .hero__dot.is-done::before {
        background: rgb(247 250 252 / 0.62);
      }

      .hero__dot:hover::before {
        height: 5px;
        background: rgb(247 250 252 / 0.7);
      }

      /* El relleno avanza al ritmo del carrusel: es el reloj a la vista. */
      .hero__dot-fill {
        grid-area: 1 / 1;
        width: 100%;
        height: 3px;
        border-radius: var(--r-pill);
        background: var(--c-gold);
        box-shadow: 0 0 10px color-mix(in srgb, var(--c-gold) 55%, transparent);
        transform: scaleX(0);
        transform-origin: left center;
        opacity: 0;
      }

      .hero__dot.is-active .hero__dot-fill {
        opacity: 1;
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

      /* Teléfono: anterior/siguiente sobran —se desliza con el dedo y los
         segmentos se pueden pulsar— y su sitio es para el rótulo. La pausa
         se queda: es la que pide WCAG 2.2.2. */
      @media (max-width: 559.98px) {
        .hero__ctl--step {
          display: none;
        }
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
        .hero__caption,
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
  protected readonly paused = computed(
    () => this.userPaused() || this.hold() || !this.clock.pageVisible(),
  );

  /** Pausa pedida con el botón: manda sobre todo lo demás hasta que se reanude. */
  protected readonly userPaused = signal(false);

  /** Sin auto-avance no tiene sentido ofrecer un botón de pausa. */
  protected readonly reducedMotion = prefersReducedMotion();

  /** La diapositiva activa como lista de uno: el rótulo se re-monta (y anima) al cambiar. */
  protected readonly currentList = computed(() => {
    const slide = this.current();
    return slide ? [slide] : [];
  });

  /** Origen horizontal del gesto de deslizar en curso. */
  protected swipeX: number | null = null;

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
      const held = this.hold() || this.userPaused();
      this.restart();
      stop();

      if (total < 2 || !visible || held || this.reducedMotion) return;

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

  protected step(delta: number): void {
    const total = this._slides().length;
    if (total < 2) return;
    this.select((this.index() + delta + total) % total);
  }

  protected togglePause(): void {
    this.userPaused.update((v) => !v);
  }

  /** Flechas del teclado con el foco en la portada. */
  protected onArrow(event: Event, delta: number): void {
    event.preventDefault();
    this.step(delta);
  }

  /** Sólo el dedo: con ratón, arrastrar sobre la portada es seleccionar texto. */
  protected swipeStart(event: PointerEvent): void {
    this.swipeX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeX === null) return;
    const dx = event.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) >= 48) this.step(dx < 0 ? 1 : -1);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
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
