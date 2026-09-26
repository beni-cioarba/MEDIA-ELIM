import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** Una entrada del índice. El rótulo llega **ya traducido** por el anfitrión. */
export interface TocEntry {
  /** `id` del elemento del documento al que apunta. */
  readonly id: string;
  readonly label: string;
  /** 1 = apartado; 2 = sub-apartado (se sangra). */
  readonly level: 1 | 2;
  /** Dato corto a la izquierda del rótulo: el número de artículo, el capítulo… */
  readonly badge?: string;
}

/**
 * Índice lateral de un documento largo, con seguimiento del apartado activo.
 *
 * ── De dónde sale el diseño ───────────────────────────────────────────
 * Está medido sobre el «On this page» de `angular.dev`, que es la referencia
 * que se pidió. Lo que se copió (y por qué):
 *
 *  · **Columna fija a la derecha** de 16 rem, `position: sticky`, que
 *    **hace scroll por dentro** cuando el índice es más largo que la
 *    pantalla. Sin eso, un documento de 34 entradas deja la mitad del índice
 *    inalcanzable.
 *  · **Sangrado por nivel** (16 px → 32 px), no numeración ni filetes: el
 *    escalón basta para leer la jerarquía y no roba ancho al rótulo.
 *  · **Rótulos cortos**: 14 px, peso medio, dos niveles y nada más.
 *  · **«Volver arriba»** al final de la lista.
 *
 * Lo que **no** se copió: en `angular.dev` el activo se pinta con un degradado
 * recortado sobre el texto (`background-clip: text`), un recurso de su marca
 * oscura que aquí no pinta nada.
 *
 * ── El seguimiento, y el fallo que evita ──────────────────────────────
 * Medido en la propia `angular.dev`: al desplazarse por dentro de un apartado
 * largo **no queda ninguna entrada activa** —su observador marca sólo lo que
 * está cruzando la banda, y entre encabezado y encabezado no cruza nada—. El
 * índice se queda en blanco justo cuando más falta hace.
 *
 * Aquí el observador es sólo el **disparador**; el activo se calcula siempre
 * por posición: es la última entrada cuyo objetivo ya ha pasado la línea de
 * lectura. Así hay exactamente uno, siempre, sin huecos.
 *
 * Además se vigila el alto del documento con un `ResizeObserver`: en esta
 * página los apartados son `<details>` y abrir uno desplaza todo lo que viene
 * debajo sin que haya habido scroll.
 */
@Component({
  selector: 'app-doc-toc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './doc-toc.component.html',
  styleUrl: './doc-toc.component.scss',
})
export class DocTocComponent {
  /** Entradas del índice, en el orden en que aparecen en el documento. */
  readonly entries = input.required<readonly TocEntry[]>();

  /** Rótulo del índice, ya traducido («En esta página»). */
  readonly label = input.required<string>();

  /** Rótulo del enlace de vuelta arriba, ya traducido. */
  readonly topLabel = input.required<string>();

  /** Texto del resumen plegable en pantallas estrechas, ya traducido. */
  readonly compactLabel = input.required<string>();

  /**
   * Esconde la hoja del teléfono hasta que la página la pida.
   *
   * En el móvil el índice ya no vive pegado a la pantalla: lo abre la página
   * desde el dock flotante, para no gastar una franja fija en algo que se usa
   * a ratos. Sólo afecta por debajo de `sm`; de ahí para arriba el índice
   * manda sobre sí mismo.
   */
  readonly compactHidden = input(false);

  /**
   * Se emite al pulsar una entrada, **antes** de desplazar. El anfitrión lo
   * usa para preparar el destino: en la confesión de fe, abrir el `<details>`
   * del artículo. Sin esto el índice te dejaría delante de un título plegado.
   */
  readonly select = output<string>();

  /** Id del apartado que se está leyendo. */
  protected readonly activeId = signal<string | null>(null);

  /**
   * La lista no cabe entera y queda contenido por debajo.
   *
   * Lo consume el difuminado del final: sustituye a la barra de scroll, que
   * se come 10 px de una columna de 16 rem y deja un carril gris fijo junto
   * a los rótulos. Sin barra **y** sin difuminado, nada diría que hay más de
   * 34 entradas ahí abajo.
   */
  protected readonly hayMas = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  /** El plegable de pantallas estrechas, para cerrarlo al elegir. */
  private readonly plegable = viewChild<ElementRef<HTMLDetailsElement>>('plegable');

  /**
   * Entradas con su elemento del documento ya resuelto.
   *
   * **No es una señal a propósito.** La plantilla no lo lee, y cuando lo era
   * el efecto que vigila `entries()` acababa leyéndolo y volviéndolo a
   * escribir: efecto → microtarea → escritura → efecto, en bucle infinito.
   * Un campo normal corta el ciclo y no pierde nada.
   */
  private objetivos: readonly { id: string; el: HTMLElement }[] = [];

  /** Ya se ha hecho la primera resolución tras pintar. */
  private montado = false;

  /** Rótulo del apartado activo, para el resumen de pantallas estrechas. */
  protected readonly activeLabel = computed(() => {
    const id = this.activeId();
    return this.entries().find((e) => e.id === id)?.label ?? '';
  });

  constructor() {
    afterNextRender(() => {
      this.montado = true;
      this.resolverObjetivos();
      this.vigilar();
      this.recalcular();
    });

    // Si cambian las entradas (idioma, filtro de búsqueda) hay que volver a
    // resolver los elementos: los ids que ya no se pintan sobran y los
    // nuevos faltan. La microtarea espera a que el documento del anfitrión
    // haya pintado esos ids.
    effect(() => {
      this.entries();
      if (!this.montado) return;
      queueMicrotask(() => {
        this.resolverObjetivos();
        this.recalcular();
      });
    });
  }

  /**
   * Pulsar una entrada: se avisa al anfitrión, se desplaza y se resalta.
   *
   * El desplazamiento lo hace `scrollIntoView`; el hueco de la cabecera fija
   * lo pone el CSS con `scroll-margin-top` sobre los objetivos, que es la
   * forma declarativa y la única que también acierta cuando se llega con el
   * enlace pegado en la barra de direcciones.
   */
  protected alPulsar(evento: Event, id: string): void {
    evento.preventDefault();

    // En pantallas estrechas el índice es un plegable que tapa el documento.
    const plegable = this.plegable()?.nativeElement;
    if (plegable?.open) plegable.open = false;

    this.irA(id);
  }

  /**
   * Lleva al apartado `id`: avisa al anfitrión, desplaza, marca y resalta.
   *
   * Es **público** porque no sólo se llega pulsando el índice: también se
   * llega con el enlace pegado en la barra de direcciones (`#art-botez`) o
   * desde el enlace permanente de un artículo. Las tres entradas tienen que
   * hacer exactamente lo mismo, así que hay una sola implementación y el
   * anfitrión la llama.
   */
  irA(id: string): void {
    this.select.emit(id);

    const destino = document.getElementById(id);
    if (!destino) return;

    /*
     * Se desplaza **ya**, sin esperar a que el anfitrión pinte la apertura
     * del `<details>`.
     *
     * Parece que habría que esperar, porque abrir un artículo cambia el alto
     * de la página. No hace falta: el que se abre es el propio destino y su
     * contenido crece **hacia abajo**, así que el borde superior —que es lo
     * que `block: 'start'` alinea— no se mueve ni un píxel.
     *
     * Y esperar salía caro: con `requestAnimationFrame` todo esto se quedaba
     * sin ejecutar en cuanto el navegador suspendía los fotogramas (pestaña
     * en segundo plano), y el índice dejaba de desplazar.
     */
    destino.scrollIntoView({
      behavior: this.movimientoPermitido() ? 'smooth' : 'auto',
      block: 'start',
    });
    this.activeId.set(id);
    this.resaltar(destino);

    /*
     * El ancla queda en la barra de direcciones para poder compartirla, y
     * `replaceState` evita meter una entrada por clic en el historial.
     *
     * **La ruta se escribe entera a propósito.** Pasando sólo `#id`, la URL
     * es relativa y el navegador la resuelve contra el `<base href="/">` del
     * documento —no contra `location.href`—, así que `/marturisirea-de-credinta`
     * se convertía en `/`. Con la ruta comodín de la app (`** → ''`), el
     * siguiente movimiento del router mandaba al usuario a la portada.
     */
    history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
  }

  /**
   * Resalta el destino un instante.
   *
   * Es lo que responde a «he pulsado aquí, ¿dónde he ido a parar?». Sin él, en
   * un documento de treinta apartados iguales el salto deja al lector sin
   * saber cuál de todos es el suyo.
   */
  private resaltar(destino: HTMLElement): void {
    destino.classList.remove('is-targeted');
    // Forzar el reflujo para poder repetir la animación sobre el mismo
    // elemento: sin esto, pulsar dos veces la misma entrada no destella.
    void destino.offsetWidth;
    destino.classList.add('is-targeted');
    const quitar = () => destino.classList.remove('is-targeted');
    destino.addEventListener('animationend', quitar, { once: true });
    // Red de seguridad: con `prefers-reduced-motion` la animación está
    // anulada y `animationend` no llega nunca, así que la clase se quedaría
    // puesta para siempre.
    setTimeout(quitar, 2000);
  }

  private resolverObjetivos(): void {
    this.objetivos = this.entries()
      .map((entrada) => ({ id: entrada.id, el: document.getElementById(entrada.id) }))
      .filter((o): o is { id: string; el: HTMLElement } => o.el !== null);
  }

  /**
   * Vigila lo que puede cambiar el apartado activo: el scroll, el tamaño de
   * la ventana y **el alto del documento** (abrir un `<details>` desplaza
   * todo lo de abajo sin que haya habido scroll).
   */
  private vigilar(): void {
    let pendiente = false;
    const alCambiar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        this.recalcular();
      });
    };

    addEventListener('scroll', alCambiar, { passive: true });
    addEventListener('resize', alCambiar, { passive: true });

    // El scroll **del propio índice** no burbujea hasta `window`, así que hay
    // que oírlo aparte o el difuminado no se apaga al llegar al final.
    const lista = this.lista()?.nativeElement;
    lista?.addEventListener('scroll', alCambiar, { passive: true });

    const ro = new ResizeObserver(alCambiar);
    ro.observe(document.documentElement);

    this.destroyRef.onDestroy(() => {
      removeEventListener('scroll', alCambiar);
      removeEventListener('resize', alCambiar);
      lista?.removeEventListener('scroll', alCambiar);
      ro.disconnect();
    });
  }

  /**
   * El activo es **la última entrada que ya ha pasado la línea de lectura**.
   *
   * La línea va un poco por debajo de la cabecera fija: un apartado se da por
   * activo cuando su título llega ahí arriba, no cuando aparece por abajo.
   * Antes de que pase el primero, manda el primero; así el índice nunca está
   * sin activo, que es el fallo del original.
   */
  private recalcular(): void {
    const objetivos = this.objetivos;
    if (objetivos.length === 0) return;

    const linea = this.lineaDeLectura();
    let activo = objetivos[0].id;
    for (const objetivo of objetivos) {
      if (objetivo.el.getBoundingClientRect().top - linea > 1) break;
      activo = objetivo.id;
    }

    // Al final del documento gana el último: el apartado de cierre suele ser
    // más corto que la pantalla y nunca llegaría a cruzar la línea.
    const fin = document.documentElement.scrollHeight - innerHeight - 2;
    if (scrollY >= fin) activo = objetivos[objetivos.length - 1].id;

    if (activo !== this.activeId()) {
      this.activeId.set(activo);
      this.mantenerVisible(activo);
    }

    this.revisarDesbordamiento();
  }

  /** ¿Sobra lista por debajo de lo que se ve? */
  private revisarDesbordamiento(): void {
    const contenedor = this.lista()?.nativeElement;
    if (!contenedor) return;
    const sobra =
      contenedor.scrollHeight - contenedor.clientHeight - contenedor.scrollTop > 4;
    if (sobra !== this.hayMas()) this.hayMas.set(sobra);
  }

  /** Alto de la cabecera fija + un respiro, leído del token para no duplicarlo. */
  private lineaDeLectura(): number {
    const alto = getComputedStyle(document.documentElement).getPropertyValue('--nav-height');
    const px = parseFloat(alto) || 0;
    // El token va en `rem`: se convierte con el tamaño de raíz real, que en
    // esta app es fluido.
    const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (alto.includes('rem') ? px * raiz : px) + 24;
  }

  /**
   * Mantiene la entrada activa a la vista **dentro del índice**.
   *
   * Con 34 entradas el índice es más alto que la pantalla, así que a mitad de
   * documento el activo caía fuera de su propio scroll: se resaltaba algo que
   * no se veía. `block: 'nearest'` mueve lo mínimo, y sólo mueve el índice —
   * nunca la página.
   */
  private mantenerVisible(id: string): void {
    const contenedor = this.lista()?.nativeElement;
    if (!contenedor || contenedor.scrollHeight <= contenedor.clientHeight) return;

    const enlace = contenedor.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(id)}"]`);
    if (!enlace) return;

    /*
     * Se mueve `scrollTop` a mano en vez de usar `scrollIntoView`.
     *
     * `scrollIntoView`, aunque sea con `block: 'nearest'`, sube por la cadena
     * de contenedores y **puede desplazar también la página**. Aquí eso sería
     * un bucle: mover la página dispara el oyente de scroll, que recalcula el
     * activo, que vuelve a llamar aquí. Tocando sólo `scrollTop` del índice
     * no hay forma de que la página se entere.
     */
    const caja = contenedor.getBoundingClientRect();
    const fila = enlace.getBoundingClientRect();
    const margen = 24;

    if (fila.top < caja.top + margen) {
      contenedor.scrollTop -= caja.top + margen - fila.top;
    } else if (fila.bottom > caja.bottom - margen) {
      contenedor.scrollTop += fila.bottom - (caja.bottom - margen);
    }
  }

  private movimientoPermitido(): boolean {
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Lleva el foco al resumen de la hoja compacta.
   *
   * Lo usa la página al abrir su panel: el botón que lo abre está al final
   * del documento, así que sin esto el usuario de teclado abre el panel y se
   * queda fuera de él.
   */
  enfocarCompacto(): void {
    this.plegable()?.nativeElement.querySelector('summary')?.focus();
  }

  /** Vuelta al principio del documento. */
  protected alPrincipio(evento: Event): void {
    evento.preventDefault();
    scrollTo({ top: 0, behavior: this.movimientoPermitido() ? 'smooth' : 'auto' });
    history.replaceState(null, '', location.pathname + location.search);
  }

  /** El índice está activo en esta entrada. */
  protected esActiva(id: string): boolean {
    return this.activeId() === id;
  }

  /**
   * `href` de una entrada, **con la ruta delante**.
   *
   * Un `href="#id"` a secas no vale en esta app: el documento lleva
   * `<base href="/">` y el navegador resuelve los enlaces de sólo fragmento
   * contra la base, no contra la dirección actual. Abrir una entrada en una
   * pestaña nueva llevaba a `/#id` — la portada— en vez de al apartado.
   *
   * El clic normal no llega a usarlo (lo intercepta `alPulsar`), pero el
   * «abrir en pestaña nueva», el «copiar dirección del enlace» y el
   * comportamiento sin JavaScript sí.
   */
  protected enlaceA(id: string): string {
    return `${location.pathname}${location.search}#${id}`;
  }
}
