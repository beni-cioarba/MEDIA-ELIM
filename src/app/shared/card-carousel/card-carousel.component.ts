import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ClockService } from '../../core/services/clock.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Margen tras un desplazamiento nuestro durante el cual los eventos `scroll`
 * se consideran eco de ese movimiento y no del usuario. El desplazamiento
 * suave emite eventos durante ~500 ms; 1,2 s deja holgura de sobra.
 */
const MARGEN_AVANCE_MS = 1200;

/**
 * Píxeles a partir de los cuales un gesto deja de ser «un clic con pulso» y
 * pasa a ser un arrastre. Por debajo, el clic tiene que seguir funcionando:
 * nadie mantiene el ratón perfectamente quieto al pulsar.
 */
const UMBRAL_ARRASTRE_PX = 6;

/**
 * `<app-card-carousel>` — carrusel horizontal de tarjetas.
 *
 * **Qué resuelve.** Enseñar más elementos equivalentes de los que caben en una
 * fila, sin alargar la página y sin encoger las tarjetas hasta que dejen de
 * leerse. La referencia medida es el carrusel de `play.google.com/store/apps`:
 * pista `flex` con hueco de 16 px, tarjetas con `scroll-snap-align: start`,
 * sangrado igual al margen de la página y flechas circulares superpuestas.
 *
 * **Cómo está repartido el trabajo.** Toda la apariencia y la mecánica de
 * scroll son CSS del catálogo (`ui-carousel*` en `_primitives.scss`): así un
 * carrusel estático —por ejemplo el ejemplo de `/stil`— no necesita este
 * componente. Aquí sólo vive lo que el CSS no puede saber: **dónde está el
 * scroll**. De ahí salen el estado de las flechas, los degradados de los
 * bordes y el ocultar los controles cuando no hay nada que desplazar.
 *
 * **Decisiones de accesibilidad** (son la parte que se suele hacer mal):
 *  - La ventana es `tabindex="0"`: una región con scroll tiene que poder
 *    recorrerse con el teclado (WCAG 2.1.1). Con el foco dentro, las flechas
 *    del teclado desplazan de forma nativa.
 *  - **Avance automático opcional** (`autoplayMs`). La WCAG 2.2.2 no lo
 *    prohíbe: exige poder pararlo. Aquí se para **con el puntero encima, con
 *    el foco dentro, con la pestaña oculta, con `prefers-reduced-motion` y —
 *    lo más importante— en cuanto el usuario toca el carrusel**: si alguien
 *    ha deslizado o ha pulsado una flecha, ya está eligiendo él, y seguir
 *    moviéndolo sería pelearse con él. Sólo avanza si hay más tarjetas de las
 *    que caben.
 *  - Las flechas se deshabilitan en los extremos en vez de desaparecer de
 *    golpe, y el grupo se anuncia con `aria-roledescription="carrusel"`.
 *  - Con `prefers-reduced-motion` el desplazamiento deja de ser suave.
 *
 * **Arrastre con el ratón.** En táctil no hace falta: el deslizamiento nativo
 * ya existe, con su inercia y su rebote en los extremos, y ningún JavaScript
 * lo iguala —secuestrarlo sería empeorarlo—. Lo que falta es en escritorio,
 * donde con ratón no hay forma de arrastrar. Por eso el gesto se implementa
 * **sólo para `pointerType === 'mouse'`** y el táctil se deja en paz.
 *
 * (Y no, no hay componente que traiga esto hecho: Angular Material 22 tiene
 * 41 componentes y ninguno es un carrusel —`slider` es el control de rango—,
 * y el CDK no trae ni scroll horizontal ni arrastre de este tipo. Meter una
 * librería externa por un gesto de sesenta líneas, perdiendo de paso el
 * avance automático, el bucle y la accesibilidad ya hechos, no compensa.)
 *
 * Uso: las tarjetas se proyectan y cada una lleva `ui-carousel__item`.
 *
 * ```html
 * <app-card-carousel labelKey="home.board.title">
 *   <li class="ui-carousel__item">…</li>
 * </app-card-carousel>
 * ```
 */
@Component({
  selector: 'app-card-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslatePipe, IconComponent],
  host: {
    '(mouseenter)': 'held.set(true)',
    '(mouseleave)': 'held.set(false)',
    '(focusin)': 'held.set(true)',
    '(focusout)': 'held.set(false)',
  },
  template: `
    <div
      class="ui-carousel"
      [class.is-scrollable-start]="canPrev()"
      [class.is-scrollable-end]="canNext()"
      [class.is-fitted]="!overflows()"
      [style.--carousel-item-w]="itemWidth"
      [style.--carousel-gutter]="gutter"
      [style.--carousel-gap]="gap"
      role="group"
      aria-roledescription="carrusel"
      [attr.aria-label]="labelKey | translate"
    >
      @if (overflows()) {
        <button
          type="button"
          class="ui-carousel__nav ui-carousel__nav--prev"
          [disabled]="!canPrev()"
          [attr.aria-label]="'carousel.prev' | translate"
          (click)="page(-1, true)"
        >
          <app-icon name="chevron-left" />
        </button>
      }

      <div #viewport class="ui-carousel__viewport" tabindex="0">
        <ul class="ui-carousel__track" role="list">
          <ng-container [ngTemplateOutlet]="items()" />
          @if (loop()) {
            <!-- Segunda copia para el bucle sin costura. Se marca como
                 decorativa después de pintar: para un lector de pantalla la
                 lista tiene los elementos que tiene, no el doble. -->
            <ng-container [ngTemplateOutlet]="items()" />
          }
        </ul>
      </div>

      @if (overflows()) {
        <button
          type="button"
          class="ui-carousel__nav ui-carousel__nav--next"
          [disabled]="!canNext()"
          [attr.aria-label]="'carousel.next' | translate"
          (click)="page(1, true)"
        >
          <app-icon name="chevron-right" />
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @media (prefers-reduced-motion: reduce) {
        .ui-carousel__viewport {
          scroll-behavior: auto;
        }
      }
    `,
  ],
})
export class CardCarouselComponent {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = inject(ClockService);

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  /** Clave i18n del nombre del carrusel (lo que anuncia el lector de pantalla). */
  @Input({ required: true }) labelKey!: string;

  /** Ancho de cada tarjeta. Cualquier longitud CSS: se pasa a `--carousel-item-w`. */
  @Input() itemWidth = 'clamp(17rem, 78vw, 21rem)';

  /**
   * Sangrado lateral de la pista. Se le pasa el margen de la página para que
   * la primera tarjeta quede alineada con el título de la sección y la última
   * pueda llegar al borde de la pantalla, como en la referencia.
   */
  @Input() gutter = '0px';

  /** Hueco entre tarjetas. 16 px es lo que mide la referencia. */
  @Input() gap = '1rem';

  /**
   * Milisegundos entre avances automáticos. `0` lo desactiva (por defecto).
   * Con contenido que se lee, por debajo de 5 s resulta agobiante.
   *
   * Es un `input()` de señal y no un `@Input` clásico **a propósito**: el
   * efecto del avance se crea en el constructor, cuando un `@Input` normal
   * todavía vale `undefined`. Con una señal, el efecto se vuelve a evaluar en
   * cuanto Angular asigna el valor.
   */
  readonly autoplayMs = input(0);

  /**
   * Bucle sin fin. Al activarlo la lista se pinta **dos veces** y, al pasar de
   * la primera copia, el desplazamiento retrocede el ancho de una copia de
   * golpe: como lo que hay delante es idéntico, el salto no se ve y el
   * carrusel parece infinito.
   *
   * Es la única forma de conseguirlo con desplazamiento nativo y anclaje. La
   * alternativa —volver al principio al llegar al final— se ve como un
   * rebobinado y parece un fallo.
   *
   * Úsalo sólo cuando haya más elementos de los que caben: si caben todos,
   * duplicarlos sólo crea un scroll que no debería existir.
   */
  readonly loop = input(false);

  /** Las tarjetas, como plantilla, para poder pintarlas dos veces. */
  readonly items = contentChild.required(TemplateRef);

  /** Distancia hasta el borde a partir de la cual se considera «al final». */
  private static readonly EDGE_TOLERANCE_PX = 2;

  /**
   * Momento del último desplazamiento provocado por nosotros. Los `scroll`
   * que lleguen dentro del margen siguiente son ecos de ese movimiento (el
   * desplazamiento suave emite muchos), no el usuario.
   */
  private ultimoAvanceAutomatico = 0;

  /**
   * El usuario ha tomado el control (ha deslizado, ha pulsado una flecha o ha
   * usado el teclado). A partir de ahí el carrusel no vuelve a moverse solo.
   */
  private readonly engaged = signal(false);

  /** Puntero encima o foco dentro: mientras se lee, no se mueve. */
  protected readonly held = signal(false);

  /** La ventana, una vez existe. La lee el efecto del avance automático. */
  private readonly viewportEl = signal<HTMLElement | null>(null);

  private readonly scrollLeft = signal(0);
  private readonly scrollWidth = signal(0);
  private readonly clientWidth = signal(0);

  /** Hay más tarjetas de las que caben: si no, sobran flechas y degradados. */
  protected readonly overflows = computed(
    () => this.scrollWidth() - this.clientWidth() > CardCarouselComponent.EDGE_TOLERANCE_PX,
  );

  protected readonly canPrev = computed(() => {
    if (this.loop() && this.overflows()) return true;
    return this.scrollLeft() > CardCarouselComponent.EDGE_TOLERANCE_PX;
  });

  protected readonly canNext = computed(() => {
    // Con bucle nunca se acaba: siempre hay siguiente y siempre hay anterior.
    if (this.loop() && this.overflows()) return true;
    return (
      this.scrollLeft() + this.clientWidth() <
      this.scrollWidth() - CardCarouselComponent.EDGE_TOLERANCE_PX
    );
  });

  constructor() {
    // `afterNextRender` y no el constructor: la vista tiene que existir para
    // poder medirla, y además esto no se ejecuta en el servidor.
    afterNextRender(() => {
      const el = this.viewport().nativeElement;
      // Medir y detectar el gesto del usuario son dos cosas distintas, y
      // mezclarlas costó dos bugs seguidos:
      //  · escuchando `wheel`/`pointerdown` sobre la ventana, **bajar la
      //    página con la rueda encima del carrusel** lo daba por tomado por
      //    el usuario y paraba el avance para siempre;
      //  · y midiendo dentro del mismo callback, la medición inicial —que no
      //    es ningún gesto— lo paraba antes incluso de empezar.
      const medir = (): void => {
        this.measure(el);
        this.marcarCopia(el);
      };
      const alDesplazar = (): void => {
        const previo = this.scrollLeft();
        medir();
        const loHemosMovidoNosotros = Date.now() - this.ultimoAvanceAutomatico < MARGEN_AVANCE_MS;
        const seHaMovido = Math.abs(el.scrollLeft - previo) > 2;
        if (seHaMovido && !loHemosMovidoNosotros) this.engaged.set(true);
      };

      // Fuera de la zona: el scroll dispara muchísimos eventos y no hace falta
      // una detección de cambios por cada uno. Las señales programan la suya.
      this.zone.runOutsideAngular(() => {
        medir();
        el.addEventListener('scroll', alDesplazar, { passive: true });

        // Dos observadores, porque son dos cosas distintas:
        //  · el TAMAÑO cambia al redimensionar la ventana o al cambiar de
        //    idioma (los textos son más largos);
        //  · el CONTENIDO cambia cuando entran o salen tarjetas —un evento
        //    nuevo, un anuncio que caduca—. Eso no mueve ni un píxel de la
        //    caja, así que el `ResizeObserver` no se entera: sin el
        //    `MutationObserver`, `overflows()` se quedaba con el valor de la
        //    primera medición y las flechas, el centrado y el avance
        //    automático decidían sobre un dato viejo.
        const track = el.firstElementChild;

        const observer = new ResizeObserver(medir);
        observer.observe(el);
        if (track) observer.observe(track);

        const mutaciones = new MutationObserver(medir);
        if (track) mutaciones.observe(track, { childList: true });

        const soltarArrastre = this.activarArrastre(el);

        this.destroyRef.onDestroy(() => {
          el.removeEventListener('scroll', alDesplazar);
          soltarArrastre();
          observer.disconnect();
          mutaciones.disconnect();
        });
      });

      this.viewportEl.set(el);
    });

    this.startAutoplay();
  }

  /**
   * Avance automático. Vive en un efecto porque sus condiciones son señales:
   * en cuanto una cambia (el puntero entra, la pestaña se oculta, el usuario
   * desliza), el temporizador se cancela solo. Al llegar al final vuelve al
   * principio: un carrusel que se queda parado en el borde parece roto.
   */
  private startAutoplay(): void {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = (): void => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    effect(() => {
      // **Todas las señales se leen antes de decidir**, sin cortocircuito: en
      // un `&&` perezoso, la primera condición falsa deja las demás sin leer
      // y el efecto no se suscribe a ellas, así que nunca se reactiva.
      const el = this.viewportEl();
      const ms = this.autoplayMs();
      const hayDeSobra = this.overflows();
      const conducidoPorElUsuario = this.engaged();
      const enPausa = this.held();
      const visible = this.clock.pageVisible();

      const activo =
        el !== null &&
        ms > 0 &&
        hayDeSobra &&
        !conducidoPorElUsuario &&
        !enPausa &&
        visible &&
        !prefersReducedMotion();

      stop();
      if (!activo) return;

      const ventana = el as HTMLElement;
      timer = setInterval(() => {
        this.zone.runOutsideAngular(() => {
          this.ultimoAvanceAutomatico = Date.now();
          // Con bucle: si ya se ha pasado de la primera copia, se retrocede el
          // ancho de una copia **de golpe** antes de dar el paso siguiente.
          // Delante hay exactamente lo mismo, así que el salto no se ve.
          this.recolocarBucle(ventana);
          if (this.canNext()) {
            ventana.scrollBy({ left: this.stepWidth(ventana) });
          } else {
            ventana.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
          }
        });
      }, ms);
    });

    this.destroyRef.onDestroy(stop);
  }

  /**
   * Devuelve el desplazamiento al principio de la primera copia cuando se ha
   * entrado en la segunda. Instantáneo y sin animación: es la costura del
   * bucle, y sólo funciona si no se ve.
   */
  private recolocarBucle(el: HTMLElement): void {
    if (!this.loop()) return;
    const unaCopia = el.scrollWidth / 2;
    if (unaCopia > 0 && el.scrollLeft >= unaCopia) {
      el.scrollLeft -= unaCopia;
    }
  }

  /**
   * Marca la segunda copia como decorativa. Para un lector de pantalla la
   * lista tiene los elementos que tiene: si se leyeran las dos copias, diría
   * diez tarjetas donde hay cinco.
   */
  private marcarCopia(el: HTMLElement): void {
    if (!this.loop()) return;
    const hijos = Array.from(el.firstElementChild?.children ?? []) as HTMLElement[];
    const mitad = hijos.length / 2;
    hijos.forEach((hijo, i) => {
      const esCopia = i >= mitad;
      hijo.toggleAttribute('aria-hidden', esCopia);
      hijo.inert = esCopia;
    });
  }

  /**
   * Arrastre con el ratón: el carrusel sigue al puntero hasta que se suelta.
   *
   * Los cinco detalles que lo separan de un arrastre que funciona a medias:
   *
   *  1. **Sólo ratón.** En táctil el deslizamiento nativo ya está, y es mejor.
   *  2. **Captura del puntero**, para que el gesto siga aunque el ratón salga
   *     del carrusel o de la ventana.
   *  3. **Se apaga el anclaje mientras se arrastra.** Con
   *     `scroll-snap-type: mandatory`, cada asignación de `scrollLeft` vuelve
   *     al punto de anclaje más cercano: el carrusel se queda pegado y no se
   *     mueve. Al soltar se vuelve a encender y la tarjeta se coloca sola.
   *  4. **Las tarjetas no reciben puntero mientras se arrastra**, ni durante
   *     los instantes siguientes. Sin esto, soltar el arrastre encima de una
   *     tarjeta navega a su sección: arrastras para mirar y acabas en otra
   *     página. Se hace así, y no cancelando el clic en fase de captura,
   *     porque es **determinista**: si el elemento no recibe punteros, no hay
   *     clic que cancelar ni orden de fases del que depender.
   *  5. **Se anula el arrastre nativo de imágenes y enlaces.** Si no, el
   *     navegador empieza su propio *drag and drop* con la foto fantasma en
   *     vez de desplazar.
   *
   * Devuelve la función que quita todos los escuchadores.
   */
  private activarArrastre(el: HTMLElement): () => void {
    let arrastrando = false;
    let inicioX = 0;
    let inicioScroll = 0;
    let recorrido = 0;

    const alBajar = (evento: PointerEvent): void => {
      if (evento.pointerType !== 'mouse' || evento.button !== 0) return;
      if (!this.overflows()) return;
      arrastrando = true;
      recorrido = 0;
      inicioX = evento.clientX;
      inicioScroll = el.scrollLeft;
      el.setPointerCapture(evento.pointerId);
      el.classList.add('is-dragging');
    };

    const alMover = (evento: PointerEvent): void => {
      if (!arrastrando) return;
      const avance = evento.clientX - inicioX;
      recorrido = Math.max(recorrido, Math.abs(avance));
      el.scrollLeft = inicioScroll - avance;
    };

    let liberar: ReturnType<typeof setTimeout> | null = null;

    const alSoltar = (evento: PointerEvent): void => {
      if (!arrastrando) return;
      arrastrando = false;
      el.releasePointerCapture?.(evento.pointerId);
      el.classList.remove('is-dragging');

      // Sólo si de verdad hubo arrastre: un clic con pulso —nadie mantiene el
      // ratón perfectamente quieto— tiene que seguir abriendo la tarjeta.
      if (recorrido <= UMBRAL_ARRASTRE_PX) return;

      // Las tarjetas siguen sordas al puntero un instante más: el `click`
      // llega después del `pointerup`, y si lo recibieran, navegarían.
      el.classList.add('is-just-dragged');
      if (liberar !== null) clearTimeout(liberar);
      liberar = setTimeout(() => el.classList.remove('is-just-dragged'), 160);

      // Recolocar en la tarjeta más cercana: volver a encender `scroll-snap`
      // no reancla por sí solo —el navegador espera al siguiente
      // desplazamiento—, así que sin esto se queda parado a media tarjeta.
      const paso = this.stepWidth(el);
      if (paso > 0) {
        el.scrollTo({ left: Math.round(el.scrollLeft / paso) * paso, behavior: 'smooth' });
      }
    };

    const alArrastrarNativo = (evento: DragEvent): void => {
      if (arrastrando) evento.preventDefault();
    };

    el.addEventListener('pointerdown', alBajar);
    el.addEventListener('pointermove', alMover);
    el.addEventListener('pointerup', alSoltar);
    el.addEventListener('pointercancel', alSoltar);
    el.addEventListener('dragstart', alArrastrarNativo);

    return () => {
      if (liberar !== null) clearTimeout(liberar);
      el.removeEventListener('pointerdown', alBajar);
      el.removeEventListener('pointermove', alMover);
      el.removeEventListener('pointerup', alSoltar);
      el.removeEventListener('pointercancel', alSoltar);
      el.removeEventListener('dragstart', alArrastrarNativo);
    };
  }

  /** Ancho de un paso: una tarjeta más su hueco. */
  private stepWidth(el: HTMLElement): number {
    const primera = el.firstElementChild?.firstElementChild as HTMLElement | undefined;
    if (!primera) return el.clientWidth * 0.85;
    const hueco = parseFloat(getComputedStyle(el.firstElementChild as HTMLElement).gap) || 0;
    return primera.getBoundingClientRect().width + hueco;
  }

  private measure(el: HTMLElement): void {
    this.scrollLeft.set(el.scrollLeft);
    this.scrollWidth.set(el.scrollWidth);
    this.clientWidth.set(el.clientWidth);
  }

  /**
   * Avanza o retrocede una «página». Se desplaza algo menos que el ancho
   * visible a propósito: así la tarjeta que estaba a medias entra entera y no
   * se pierde el hilo de lo que se estaba mirando. El ajuste fino lo hace
   * `scroll-snap`, que lleva el scroll al borde de una tarjeta.
   */
  protected page(direction: 1 | -1, porElUsuario = false): void {
    if (porElUsuario) this.engaged.set(true);
    const el = this.viewport().nativeElement;
    // Hacia atrás desde el principio: se salta a la copia y se retrocede desde
    // allí, para que el bucle también funcione hacia el otro lado.
    if (this.loop() && direction === -1 && el.scrollLeft <= 2) {
      el.scrollLeft = el.scrollWidth / 2;
    }
    this.recolocarBucle(el);
    el.scrollBy({ left: direction * el.clientWidth * 0.85 });
  }

}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
