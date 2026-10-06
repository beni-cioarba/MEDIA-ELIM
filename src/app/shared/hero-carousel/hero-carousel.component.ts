import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  computed,
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
 *  - Sólo la primera imagen se carga con prioridad; se montan las fotos ya
 *    vistas y la siguiente, no las nueve de golpe.
 *  - Un solo reloj: el final de la animación de la barra (`animationend`)
 *    cambia de foto, así que barra, zoom y cambio nunca se desacompasan.
 *  - Se pausa con el botón (WCAG 2.2.2), con foco de teclado dentro, con la
 *    pestaña oculta y con la portada fuera de pantalla; al volver sigue
 *    exactamente donde estaba. El ratón encima ya no la para.
 *  - Elegir un punto empieza la barra de esa foto desde cero.
 *  - Respeta `prefers-reduced-motion`: sin auto-avance, sin zoom y sin fundido.
 */
@Component({
  selector: 'app-hero-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  host: {
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
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
        <!-- Sólo se montan las fotos ya vistas y la siguiente: las nueve a la
             vez están todas «en el viewport» (apiladas), así que el lazy del
             navegador no frenaba ninguna y se descargaban de golpe al entrar. -->
        @for (frame of frames(); track frame.slide.id; let i = $index) {
          @if (mounted().has(i)) {
          <img
            class="hero__image"
            [class.is-active]="i === index()"
            [class.is-leaving]="i === leaving()"
            [class.is-alt]="i % 2 === 1"
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
                  <span class="hero__dot-fill" (animationend)="onProgressEnd($event, i)"></span>
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

      /* El sentido alterno va por clase y no por :nth-child, porque las
         fotos se montan a medida que hacen falta. */
      .hero__image.is-alt.is-active,
      .hero__image.is-alt.is-leaving {
        animation-name: hero-zoom-out;
      }

      /* La que sale conserva su animación, congelada donde estaba: si se
         quitara, saltaría de golpe a escala 1 en mitad del fundido. Cambiar
         sólo animation-play-state no reinicia la animación. */
      .hero__image.is-leaving {
        animation: hero-zoom-in var(--hero-ms, 6000ms) var(--ea-standard) both;
        animation-play-state: paused;
      }

      .hero.is-paused .hero__image.is-active {
        animation-play-state: paused;
      }

      /* Zoom contenido (1,00 → 1,05). Llegó a 1,12: cada punto de zoom es un
         punto más de ampliación sobre una foto que en un monitor de 1920 ya
         se estira, y se notaba en las caras. Con 5 % sigue habiendo
         movimiento y la foto no pierde nitidez. */
      @keyframes hero-zoom-in {
        from {
          transform: scale(1);
        }
        to {
          transform: scale(1.05);
        }
      }

      @keyframes hero-zoom-out {
        from {
          transform: scale(1.05) translateX(0.6%);
        }
        to {
          transform: scale(1) translateX(0);
        }
      }

      /*
       * Velo **localizado** (oct. 2026). Antes era un degradado lateral que
       * dejaba media foto al 74-92 % de navy: el texto se leía, pero la foto
       * —que es la protagonista— se veía apagada y azulada. Ahora el texto vive
       * abajo a la izquierda y el velo es una elipse que nace en esa esquina:
       * oscurece donde hay letra (≥ 55 % bajo el subtítulo, que con texto
       * blanco da ≥ 4,5:1 aun sobre una pared blanca) y deja limpio el centro
       * y la derecha. Una franja inferior suave sostiene el pie de mandos.
       */
      .hero__scrim {
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          linear-gradient(
            to top,
            color-mix(in srgb, var(--c-primary-darkest) 88%, transparent) 0%,
            color-mix(in srgb, var(--c-primary-darkest) 70%, transparent) 28%,
            color-mix(in srgb, var(--c-primary-darkest) 30%, transparent) 52%,
            transparent 78%
          );
      }

      @media (min-width: 860px) {
        .hero__scrim {
          background:
            radial-gradient(
              125% 95% at 0% 100%,
              color-mix(in srgb, var(--c-primary-darkest) 84%, transparent) 0%,
              color-mix(in srgb, var(--c-primary-darkest) 66%, transparent) 38%,
              color-mix(in srgb, var(--c-primary-darkest) 28%, transparent) 64%,
              transparent 88%
            ),
            linear-gradient(
              to top,
              color-mix(in srgb, var(--c-primary-darkest) 45%, transparent) 0%,
              transparent 22%
            );
        }
      }

      /* El contenido se apoya abajo: texto y, debajo, el pie de mandos. */
      .hero__inner {
        display: flex;
        /* Ocupa todo el alto de la portada: el margen automático del texto lo
           empuja abajo y el centro de la foto queda libre. */
        flex: 1 1 auto;
        flex-direction: column;
        gap: clamp(1rem, 2.6vh, 1.75rem);
        width: min(100%, var(--w-wide));
        margin-inline: auto;
        padding: clamp(2rem, 6vh, 4rem) clamp(1rem, 5vw, 3rem) clamp(1rem, 2.6vh, 1.6rem);
      }

      /*
       * Texto anclado abajo a la izquierda, en todas las anchuras. Centrado en
       * vertical tapaba justo la franja media de la foto, donde están las
       * caras; abajo se apoya en la zona más oscura del velo y deja que la
       * imagen respire. Es el patrón de las portadas de cine y streaming.
       */
      .hero__text {
        max-width: 36rem;
        margin-top: auto;
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
        gap: 0.45rem;
        width: min(100%, 24rem);
      }

      .hero__controls {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        min-width: 0;
      }

      /* Mando redondo de cristal: 2 rem = 32 px, por encima de los 24 que
         pide WCAG 2.5.8, y discreto: el pie no debe competir con la foto. */
      .hero__ctl {
        display: grid;
        place-items: center;
        flex: none;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid rgb(247 250 252 / 0.18);
        border-radius: 50%;
        background: rgb(9 20 36 / 0.22);
        backdrop-filter: blur(10px) saturate(140%);
        font-size: 0.95rem;
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
        margin-inline: 0.45rem 0.1rem;
        font-size: var(--fs-xs);
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
        padding-left: 0.6rem;
        border-left: 1px solid rgb(247 250 252 / 0.24);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--fs-xs);
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
      /* OJO: la barra es el reloj del carrusel. Si se oculta con display:none
         su animación no corre y el pase deja de avanzar. */
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
        height: 1rem;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
      }

      .hero__dot::before {
        content: '';
        grid-area: 1 / 1;
        width: 100%;
        height: 2px;
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
        height: 4px;
        background: rgb(247 250 252 / 0.7);
      }

      /* El relleno avanza al ritmo del carrusel: es el reloj a la vista. */
      .hero__dot-fill {
        grid-area: 1 / 1;
        width: 100%;
        height: 2px;
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
          width: 0.9rem;
          height: 0.9rem;
          margin-left: -0.45rem;
          border-right: 1.5px solid rgb(247 250 252 / 0.5);
          border-bottom: 1.5px solid rgb(247 250 252 / 0.5);
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
      srcset:
        `${slide.thumb} 480w, ${slide.medium} 960w, ${slide.image} 1600w` +
        (slide.large ? `, ${slide.large} 2560w` : ''),
    })),
  );

  @Input({ required: true })
  set items(value: readonly HeroSlide[] | null) {
    this._slides.set(value ?? []);
    this.index.set(0);
    this.seen.set(new Set([0]));
    this.leaving.set(null);
  }

  /** Cadencia del auto-avance en milisegundos. */
  @Input() intervalMs = HERO_SLIDE_MS;

  protected readonly index = signal(0);

  /**
   * Foco de **teclado** dentro de la portada: la rotación espera a que se vaya
   * (quien navega con Tab necesita que lo enfocado no cambie bajo sus pies).
   * El ratón ya no pausa: pasar por encima —o quedarse encima al volver con el
   * scroll— paraba el pase sin que nadie lo pidiera. Para pararlo de verdad
   * está el botón de pausa (WCAG 2.2.2).
   */
  protected readonly hold = signal(false);

  /** La portada se ve en pantalla. Fuera de ella no se anima nada. */
  private readonly inView = signal(true);

  /**
   * El carrusel está parado: pausa pedida, foco de teclado dentro, pestaña
   * oculta o portada fuera de pantalla.
   *
   * **Un solo reloj.** El avance lo dispara el final de la animación CSS de
   * la barra de progreso (`animationend`), no un `setInterval`. Antes había
   * dos relojes: al reanudar, el temporizador volvía a contar 6 s desde cero
   * mientras la barra y el zoom seguían por donde iban, así que la barra se
   * llenaba, el zoom se congelaba y la foto tardaba aún varios segundos en
   * cambiar. Con `animation-play-state` pausar y reanudar es exacto: la foto
   * cambia justo cuando la barra se llena, siempre.
   */
  protected readonly paused = computed(
    () => this.userPaused() || this.hold() || !this.inView() || !this.clock.pageVisible(),
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

  /**
   * Fotos montadas: la activa, las ya vistas y la siguiente (que así está
   * descargada y decodificada antes de su turno y el fundido no da tirón).
   */
  protected readonly mounted = computed<ReadonlySet<number>>(() => {
    const total = this._slides().length;
    const set = new Set(this.seen());
    if (total > 1) set.add((this.index() + 1) % total);
    return set;
  });

  private readonly seen = signal<ReadonlySet<number>>(new Set([0]));

  /** La foto que sale, durante su fundido (ver `.is-leaving`). */
  protected readonly leaving = signal<number | null>(null);
  private leavingTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(([entry]) => this.inView.set(entry.isIntersecting));
      io.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => io.disconnect());
    }
    this.destroyRef.onDestroy(() => {
      if (this.leavingTimer !== null) clearTimeout(this.leavingTimer);
    });
  }

  /** Fin de la barra de la foto activa: es la señal de pasar a la siguiente. */
  protected onProgressEnd(event: AnimationEvent, i: number): void {
    // `endsWith`: con encapsulación emulada Angular antepone el id del
    // componente al nombre de los @keyframes.
    if (!event.animationName.endsWith('hero-progress') || i !== this.index()) return;
    this.step(1);
  }

  protected select(index: number): void {
    const prev = this.index();
    if (index === prev) return;

    this.leaving.set(prev);
    if (this.leavingTimer !== null) clearTimeout(this.leavingTimer);
    // Lo que dura el fundido (1,2 s) y un margen.
    this.leavingTimer = setTimeout(() => this.leaving.set(null), 1300);

    this.seen.update((s) => (s.has(index) ? s : new Set(s).add(index)));
    this.index.set(index);
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    this.hold.set(!!target?.matches?.(':focus-visible'));
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) this.hold.set(false);
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
