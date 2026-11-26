import { DOCUMENT, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';
import { UiStore } from '../../core/state/ui.store';
import { injectIsBrowser } from '../../core/util/platform';
import { TabDirection, TabNavService } from './tab-nav.service';

/** Movimiento a partir del cual se decide si el gesto es horizontal o vertical. */
const UMBRAL_DECISION_PX = 10;
/** Para ser horizontal, |dx| tiene que superar |dy| por este factor. */
const HORIZONTALIDAD = 1.2;
/** Arrastrar más de esta fracción del ancho y soltar = cambiar de pestaña. */
const FRACCION_CAMBIO = 0.4;
/** …o soltar con esta velocidad (px/ms) en el sentido del arrastre: el «flick». */
const VELOCIDAD_FLICK = 0.45;
/** Sin vecina en ese sentido, el contenido cede sólo esta fracción (resistencia). */
const RESISTENCIA = 0.28;
/** Ventana para medir la velocidad al soltar. */
const VENTANA_VELOCIDAD_MS = 90;
/** Duración del asentamiento (al soltar) y del fundido de la vista previa. */
const MS_ASENTAR = 260;
const MS_FUNDIDO = 180;
/** Margen sobre `MS_ASENTAR` por si `transitionend` no llega. */
const MARGEN_FIN_MS = 80;
/**
 * Franja de los bordes que se deja al sistema: en iOS y Android deslizar
 * desde el borde es «atrás». Un gesto que empieza ahí no es nuestro.
 */
const BORDE_PX = 24;
/** Barra de pestañas visible: el mismo corte que la propia barra (`< lg`). */
const CON_BARRA = '(max-width: 1023.98px)';
/**
 * Superficies de página: lo que se arrastra y donde puede empezar el gesto.
 * Hijos directos del shell; la cabecera, la barra de pestañas, el dock y el
 * cajón quedan fuera. El pie llega con `@defer`: se busca en cada gesto.
 */
const SUPERFICIES = ':scope > main, :scope > app-breadcrumb, :scope > app-footer';

/**
 * Lo que vive dentro del shell sin ser superficie: tocarlo mientras la página
 * se mueve no es un gesto de página (es pulsar una pestaña, el dock…).
 */
const FUERA_DE_SUPERFICIE =
  'app-top-nav, app-tab-bar, app-floating-actions, app-mobile-nav, app-install-invite';

/**
 * Lo que ya tiene su propio gesto horizontal y no debe cambiar de pestaña:
 * carruseles, campos, vídeos, diálogos y cualquier cosa marcada a mano.
 */
const EXCLUIDOS = [
  '[data-no-swipe]',
  // Los dos carruseles tienen su propio deslizamiento. El de la portada
  // (`app-hero-carousel`, 536 de 812 px en un teléfono) estaba fuera de la
  // lista y un mismo gesto cambiaba de foto **y** de pestaña (26/11/2026).
  'app-card-carousel',
  'app-hero-carousel',
  '.ui-carousel',
  'input',
  'textarea',
  'select',
  'video',
  'iframe',
  'dialog',
].join(',');

/**
 * - `quieto`: nada en marcha.
 * - `decidiendo`: un dedo abajo, aún sin saber si el gesto es horizontal.
 * - `arrastrando`: la página sigue al dedo.
 * - `asentando`: se ha soltado y la página vuelve a su sitio o sale. Si
 *   vuelve, un toque nuevo **la atrapa** donde esté. Si sale (el cambio ya
 *   está decidido), el toque nuevo **se guarda** (ver `GestoGuardado`).
 * - `navegando`: la página vieja ya salió y el router cuelga la nueva. Un
 *   toque nuevo se guarda.
 * - `revelando`: la vista previa se funde sobre la página real. Un toque
 *   nuevo termina el fundido en el acto y empieza su gesto.
 */
type Estado = 'quieto' | 'decidiendo' | 'arrastrando' | 'asentando' | 'navegando' | 'revelando';

interface Muestra {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/**
 * Un gesto que llegó mientras el anterior terminaba: su toque, sus
 * movimientos y, si ya se levantó el dedo, cuándo. Se **reproduce** en cuanto
 * la pestaña nueva está puesta, con sus tiempos reales: un deslizamiento
 * rápido sigue siendo un «flick» aunque se ejecute unos ms después.
 */
interface GestoGuardado {
  readonly inicio: Muestra;
  readonly movimientos: Muestra[];
  /** `undefined`: el dedo sigue abajo; `null`: gesto cancelado. */
  fin?: number | null;
}

/**
 * Arrastrar la página entre pestañas, como en WhatsApp.
 *
 * ── Qué hace la app del teléfono (auditado) ───────────────────────────
 *  1. El contenido **sigue al dedo** desde el primer píxel horizontal y por
 *     el lado contrario **asoma la sección vecina**.
 *  2. El indicador de la barra avanza **en proporción** al arrastre.
 *  3. Al soltar: si se ha pasado ~la mitad o el gesto ha sido rápido
 *     («flick»), termina el cambio; si no, vuelve a su sitio.
 *  4. En la primera y la última sección el contenido cede poco y vuelve
 *     (resistencia elástica): no hay nada detrás.
 *  5. El scroll vertical manda: si el gesto empieza vertical, no hay
 *     arrastre lateral en todo ese gesto.
 *  6. **Nunca hay que esperar ni se pierde un gesto**: se pueden encadenar
 *     deslizamientos tan rápido como se quiera.
 *
 * ── Encadenar gestos (26/11/2026) ─────────────────────────────────────
 * Antes, desde que se soltaba hasta el final del fundido, cualquier toque se
 * ignoraba entero. Después, aun aceptándolo, un deslizamiento rápido (100 ms
 * de dedo) que caía mientras se construía la página nueva se perdía: el dedo
 * ya se había levantado cuando la app volvía a escuchar. Ahora:
 *  - Un gesto que llega con un cambio en curso **se guarda y se reproduce**
 *    en cuanto la pestaña nueva está puesta (`GestoGuardado`): si fue un
 *    flick, la página sale hacia la siguiente; si el dedo sigue abajo, la
 *    página se pone bajo él.
 *  - Una página que vuelve a su sitio se puede atrapar a mitad.
 *  - Ya no hay construcción por medio: las páginas de pestaña se guardan
 *    (`TabReuseStrategy`) y cada vista previa se construye una sola vez
 *    (`SwipePeekComponent`).
 *
 * El final del asentamiento lo marca `transitionend` del propio contenido (con
 * un temporizador de respaldo), no un temporizador fijo: en un teléfono
 * ocupado la transición empieza tarde.
 *
 * ── Cómo se hace aquí ─────────────────────────────────────────────────
 * Lo que asoma es la página vecina real (`SwipePeekComponent` +
 * `PagePreviewService`), con su migaja, donde quedará, construida de antemano
 * y sin pintar hasta que hace falta. Al soltar ocupa la pantalla, se navega y
 * se funde sobre la página real, que es idéntica.
 *
 * ── Rendimiento ───────────────────────────────────────────────────────
 * Manejadores pasivos y fuera de Angular. Durante el arrastre sólo se
 * escriben un `transform` y dos variables CSS, una vez por fotograma
 * (`requestAnimationFrame`), y qué hueco de la vista previa se ve
 * (`data-shown`) al cambiar de sentido: nada de detección de cambios por
 * movimiento. Las superficies llevan `touch-action: pan-y pinch-zoom` (lo pone
 * el shell): el navegador hace el scroll vertical y el zoom, y el horizontal
 * nos lo deja sin esperar a JS.
 *
 * Las variables del arrastre (`--swipe-dx`, `--tab-drag`) se escriben en la
 * vista previa y en la barra, **no en el `<html>`**: una propiedad
 * personalizada se hereda, y cambiarla en la raíz obliga a recalcular el
 * estilo de todo el documento en cada fotograma.
 *
 * ── Dónde escucha ─────────────────────────────────────────────────────
 * En el anfitrión del shell (`hostDirectives` de `MainLayoutComponent`), no
 * en el `<main>`: así el gesto empieza igual sobre el contenido, la migaja o
 * el pie, que se mueven juntos como una sola pantalla.
 */
@Directive({ selector: '[appSwipeTabs]' })
export class SwipeTabsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly tabsNav = inject(TabNavService);
  private readonly ui = inject(UiStore);
  private readonly zone = inject(NgZone);

  private estado: Estado = 'quieto';
  /** El asentamiento en curso termina en un cambio de pestaña. */
  private cambiando = false;
  private objetivo: Element | null = null;
  private superficie: HTMLElement | null = null;
  /** La vista previa y la barra: las únicas que leen las variables del gesto. */
  private peekEl: HTMLElement | null = null;
  private barraEl: HTMLElement | null = null;
  /** El hueco de la vista previa que se está enseñando. */
  private huecoEl: HTMLElement | null = null;
  private x0 = 0;
  private y0 = 0;
  private dx = 0;
  private sentido: TabDirection | null = null;
  private hayVecina = false;
  private muestras: { t: number; x: number }[] = [];
  private fotograma = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  /** Quita la escucha de `transitionend` del asentamiento en curso. */
  private quitarEspera: (() => void) | null = null;
  /**
   * Gestos que llegaron con un cambio en curso, en orden. **Cada uno cuenta**:
   * cinco deslizamientos rápidos son cinco pestañas, no la última de ellos.
   */
  private cola: GestoGuardado[] = [];
  /**
   * Lo que se desplaza con el dedo: las superficies (`<main>`, migaja de pan
   * y pie), como una pantalla entera de WhatsApp. La cabecera y la barra de
   * pestañas se quedan.
   */
  private movibles: HTMLElement[] = [];
  /**
   * Capa transparente que recibe los toques **mientras la página se mueve**
   * (asentando, navegando, revelando). Ver `activarEscudo`.
   */
  private escudo: HTMLElement | null = null;

  constructor() {
    // En el prerender no hay dedos ni fotogramas que cancelar.
    if (!injectIsBrowser()) return;
    const onStart = (e: TouchEvent): void => this.empezar(e);
    const onMove = (e: TouchEvent): void => this.mover(e);
    const onEnd = (e: TouchEvent): void => this.soltar(e);
    const onCancel = (): void => this.soltar(null);

    this.zone.runOutsideAngular(() => {
      this.host.addEventListener('touchstart', onStart, { passive: true });
      this.host.addEventListener('touchmove', onMove, { passive: true });
      this.host.addEventListener('touchend', onEnd, { passive: true });
      this.host.addEventListener('touchcancel', onCancel, { passive: true });
    });

    inject(DestroyRef).onDestroy(() => {
      this.host.removeEventListener('touchstart', onStart);
      this.host.removeEventListener('touchmove', onMove);
      this.host.removeEventListener('touchend', onEnd);
      this.host.removeEventListener('touchcancel', onCancel);
      this.limpiar();
      this.escudo?.remove();
      this.escudo = null;
    });
  }

  // ── Eventos ────────────────────────────────────────────────────────
  private empezar(e: TouchEvent): void {
    const t = e.touches.length === 1 ? e.touches[0] : undefined;
    let objetivo = e.target instanceof Element ? e.target : null;

    switch (this.estado) {
      case 'arrastrando':
        // Un segundo dedo durante el arrastre: lo resuelve `mover` (zoom).
        if (!t) return;
        // Un dedo **nuevo y solo** con un arrastre vivo: el final del anterior
        // no llegó (el navegador lo envió a un nodo ya retirado). Red de
        // seguridad: se cierra aquel y se atiende éste, nunca se bloquea.
        this.limpiar();
        break;
      case 'asentando':
        if (!t) return;
        if (this.cambiando) this.guardar(t, e.timeStamp, objetivo);
        else this.atrapar(t, e.timeStamp, objetivo);
        return;
      case 'navegando':
        if (t) this.guardar(t, e.timeStamp, objetivo);
        return;
      case 'revelando':
        // La página real ya está debajo y es idéntica: se acaba el fundido.
        this.limpiar();
        break;
    }

    this.estado = 'quieto';
    if (!t) return;
    // Si cayó en el escudo (ya retirado por `limpiar`), lo que cuenta es lo
    // que hay debajo. Los movimientos de este dedo seguirán llegando al
    // escudo, que nunca sale del documento.
    if (objetivo === this.escudo) objetivo = document.elementFromPoint(t.clientX, t.clientY);
    this.iniciar(t.clientX, t.clientY, e.timeStamp, objetivo);
  }

  private mover(e: TouchEvent): void {
    const t = e.touches[0];
    if (!t) return;
    const abierto = this.gestoAbierto();
    if (abierto) {
      if (e.touches.length !== 1) abierto.fin = null;
      else abierto.movimientos.push({ x: t.clientX, y: t.clientY, t: e.timeStamp });
      return;
    }
    if (e.touches.length !== 1) {
      // Un segundo dedo es un zoom: se abandona el arrastre.
      this.soltarEn(null);
      return;
    }
    this.moverA(t.clientX, t.clientY, e.timeStamp);
  }

  private soltar(e: TouchEvent | null): void {
    const abierto = this.gestoAbierto();
    if (abierto) {
      abierto.fin = e ? e.timeStamp : null;
      return;
    }
    this.soltarEn(e ? e.timeStamp : null);
  }

  // ── Gesto ──────────────────────────────────────────────────────────
  /** Arranque de un gesto en `x, y` (de un `touchstart` o de uno guardado). */
  private iniciar(x: number, y: number, t: number, objetivo: Element | null): void {
    if (!matchMedia(CON_BARRA).matches || this.ui.drawerOpen()) return;
    if (this.tabsNav.activeIndex() < 0) return;
    if (x < BORDE_PX || x > window.innerWidth - BORDE_PX) return;
    const superficie = this.superficies().find((el) => el.contains(objetivo)) ?? null;
    // Fuera de las superficies (cabecera, barra, dock) o sobre algo con gesto
    // horizontal propio declarado: no es nuestro. La comprobación cara (cajas
    // con scroll horizontal, que lee el layout) espera a que el gesto resulte
    // horizontal: aquí empieza también cada scroll vertical.
    if (!superficie || objetivo?.closest(EXCLUIDOS)) return;
    this.objetivo = objetivo;
    this.superficie = superficie;
    this.estado = 'decidiendo';
    this.x0 = x;
    this.y0 = y;
    this.dx = 0;
    this.sentido = null;
    this.muestras = [{ t, x }];
  }

  /**
   * Un dedo toca mientras la página vuelve a su sitio: se detiene donde está
   * **en pantalla** (no donde iba) y el arrastre sigue desde ahí.
   */
  private atrapar(t: Touch, timeStamp: number, objetivo: Element | null): void {
    const primero = this.movibles[0];
    if (!primero || objetivo?.closest(FUERA_DE_SUPERFICIE)) return;
    this.cancelarEspera();
    const x = desplazamientoActual(primero);
    this.root.classList.remove('is-swipe-settling');
    for (const el of this.movibles) el.style.transition = '';
    this.pintar(x);
    // El inverso de `desplazamiento()`: con el dedo aquí, la página está en `x`.
    this.dx = this.hayVecina ? x : x / RESISTENCIA;
    this.x0 = t.clientX - this.dx;
    this.y0 = t.clientY;
    this.muestras = [{ t: timeStamp, x: t.clientX }];
    this.estado = 'arrastrando';
  }

  /** Un gesto nuevo con un cambio aún en curso: se guarda para reproducirlo. */
  private guardar(t: Touch, timeStamp: number, objetivo: Element | null): void {
    if (objetivo?.closest(FUERA_DE_SUPERFICIE)) return;
    this.cola.push({ inicio: { x: t.clientX, y: t.clientY, t: timeStamp }, movimientos: [] });
  }

  /** El gesto guardado cuyo dedo sigue abajo (sólo puede ser el último). */
  private gestoAbierto(): GestoGuardado | null {
    const ultimo = this.cola[this.cola.length - 1];
    return ultimo && ultimo.fin === undefined ? ultimo : null;
  }

  /**
   * Ejecuta la cola en orden. Se detiene en el primer gesto que vuelve a
   * cambiar de pestaña (al terminar ese cambio se sigue con el resto) o que
   * deja el dedo arrastrando. Los que no hacen nada (verticales, cortos,
   * cancelados) se descartan y se pasa al siguiente.
   */
  private procesarCola(): void {
    while (this.cola.length > 0) {
      const gesto = this.cola.shift()!;
      const resto = this.cola;
      this.limpiar();
      this.cola = resto;
      if (gesto.fin === null) continue;
      this.reproducir(gesto);
      const sigueVivo =
        (this.estado === 'asentando' && this.cambiando) ||
        this.estado === 'decidiendo' ||
        this.estado === 'arrastrando';
      if (sigueVivo) return;
    }
  }

  /**
   * La pestaña nueva ya está puesta: el gesto guardado empieza ahora, con sus
   * movimientos y, si ya acabó, su final. Lo que tenía debajo era la página
   * vieja (fuera de pantalla): se busca lo que hay ahora en ese punto.
   */
  private reproducir(g: GestoGuardado): void {
    const { inicio } = g;
    this.iniciar(inicio.x, inicio.y, inicio.t, document.elementFromPoint(inicio.x, inicio.y));
    for (const m of g.movimientos) {
      if (this.estado !== 'decidiendo' && this.estado !== 'arrastrando') return;
      this.moverA(m.x, m.y, m.t);
    }
    if (g.fin !== undefined) this.soltarEn(g.fin);
  }

  private moverA(x: number, y: number, t: number): void {
    if (this.estado !== 'decidiendo' && this.estado !== 'arrastrando') return;
    const dx = x - this.x0;
    const dy = y - this.y0;

    if (this.estado === 'decidiendo') {
      if (Math.hypot(dx, dy) < UMBRAL_DECISION_PX) return;
      if (
        Math.abs(dx) < Math.abs(dy) * HORIZONTALIDAD ||
        tocaLaSeleccion(this.x0, this.y0) ||
        tieneScrollHorizontal(this.objetivo, this.superficie)
      ) {
        this.estado = 'quieto';
        return;
      }
      this.estado = 'arrastrando';
      // Se recoloca el origen: el contenido arranca pegado al dedo, sin salto.
      this.x0 = x;
      this.movibles = this.superficies();
      this.peekEl = this.host.querySelector<HTMLElement>('app-swipe-peek');
      this.barraEl = this.host.querySelector<HTMLElement>('app-tab-bar');
      for (const el of this.movibles) el.style.willChange = 'transform';
      this.root.classList.add('is-swiping');
      this.peekEl?.style.setProperty('--swipe-top', `${pieDeCabecera()}px`);
    }

    this.dx = x - this.x0;
    this.muestras.push({ t, x });
    if (this.muestras.length > 12) this.muestras.shift();

    const sentido: TabDirection = this.dx < 0 ? 'next' : 'prev';
    if (sentido !== this.sentido) {
      this.sentido = sentido;
      const vecina = this.tabsNav.neighbor(sentido);
      this.hayVecina = vecina !== null;
      this.ensenarHueco(vecina ? this.tabsNav.tabs.indexOf(vecina) : -1, sentido);
      this.zone.run(() => this.tabsNav.peek.set(vecina ? { tab: vecina, direction: sentido } : null));
    }
    this.pintarEnFotograma();
  }

  /**
   * Descubre el hueco de la pestaña `i` por ese lado, en este mismo evento y
   * sin esperar a Angular (sin zone.js repinta en otra tarea). Dar la vuelta a
   * mitad de gesto sólo cambia qué hueco se ve.
   */
  private ensenarHueco(i: number, sentido: TabDirection): void {
    this.huecoEl?.removeAttribute('data-shown');
    this.huecoEl = i < 0 ? null : (this.peekEl?.querySelectorAll<HTMLElement>('.peek__slot')[i] ?? null);
    this.huecoEl?.setAttribute('data-shown', sentido);
    if (this.huecoEl) this.peekEl?.setAttribute('data-side', sentido);
    else this.peekEl?.removeAttribute('data-side');
  }

  /** Fin del gesto en el instante `t` (`null`: cancelado, vuelve sin más). */
  private soltarEn(t: number | null): void {
    if (this.estado === 'decidiendo') this.estado = 'quieto';
    if (this.estado !== 'arrastrando') return;
    cancelAnimationFrame(this.fotograma);

    const ancho = window.innerWidth;
    const v = t !== null ? velocidad(this.muestras, t) : 0;
    const mismoSentido = Math.sign(v) === Math.sign(this.dx);
    const cambiar =
      t !== null &&
      this.hayVecina &&
      (Math.abs(this.dx) > ancho * FRACCION_CAMBIO ||
        (mismoSentido && Math.abs(v) > VELOCIDAD_FLICK && Math.abs(this.dx) > 30));

    const sentido = this.sentido;
    if (cambiar && sentido) {
      this.cambiando = true;
      this.asentar(sentido === 'next' ? -ancho : ancho, () => this.completar(sentido));
    } else {
      this.cambiando = false;
      this.asentar(0, () => this.limpiar());
    }
  }

  private superficies(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(SUPERFICIES));
  }

  // ── Pintado ────────────────────────────────────────────────────────
  private pintarEnFotograma(): void {
    cancelAnimationFrame(this.fotograma);
    this.fotograma = requestAnimationFrame(() => this.pintar(this.desplazamiento()));
  }

  /**
   * Lo que se mueve el contenido: el dedo, o una fracción si no hay vecina.
   * Nunca más de una pantalla: al atrapar una página, el dedo puede seguir
   * empujando y detrás no hay nada que enseñar.
   */
  private desplazamiento(): number {
    const ancho = window.innerWidth;
    const x = this.hayVecina ? this.dx : this.dx * RESISTENCIA;
    return Math.max(-ancho, Math.min(ancho, x));
  }

  private pintar(x: number): void {
    const ancho = window.innerWidth || 1;
    const transform = x === 0 ? '' : `translate3d(${x}px, 0, 0)`;
    for (const el of this.movibles) el.style.transform = transform;
    this.peekEl?.style.setProperty('--swipe-dx', `${x}px`);
    // Progreso del indicador de la barra: +1 = una pestaña a la derecha.
    const progreso = this.hayVecina ? Math.max(-1, Math.min(1, -x / ancho)) : 0;
    this.barraEl?.style.setProperty('--tab-drag', String(progreso));
  }

  /**
   * Lleva el contenido a `x` con transición y llama a `hecho` cuando acaba de
   * verdad (`transitionend`) o, si no llega, pasado su tiempo y un margen.
   */
  private asentar(x: number, hecho: () => void): void {
    this.estado = 'asentando';
    this.activarEscudo(true);
    this.cancelarEspera();
    this.root.classList.add('is-swipe-settling');
    // Con movimiento reducido no se anima: el CSS ya quita las transiciones
    // de la vista previa y la barra, y el contenido salta igual que ellas.
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MS_ASENTAR;
    for (const el of this.movibles) {
      el.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : '';
    }
    this.pintar(x);

    const fin = (): void => {
      this.cancelarEspera();
      hecho();
    };
    const primero = this.movibles[0];
    if (ms && primero) {
      const onEnd = (ev: TransitionEvent): void => {
        if (ev.target === primero && ev.propertyName === 'transform') fin();
      };
      primero.addEventListener('transitionend', onEnd);
      this.quitarEspera = () => primero.removeEventListener('transitionend', onEnd);
    }
    this.temporizador = setTimeout(fin, ms ? ms + MARGEN_FIN_MS : 0);
  }

  private cancelarEspera(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.quitarEspera?.();
    this.quitarEspera = null;
  }

  /**
   * Cambio confirmado: la vista previa cubre la pantalla. Se navega, se
   * devuelve el contenido a su sitio sin transición (ya es la página nueva)
   * y la vista previa se funde sobre ella. Si mientras tanto ha llegado otro
   * gesto, se reproduce en lugar del fundido.
   */
  private completar(sentido: TabDirection): void {
    this.estado = 'navegando';
    const destino = this.tabsNav.activeIndex() + (sentido === 'next' ? 1 : -1);
    // La página nueva se verá desde arriba, que es lo que enseña la vista
    // previa. Se sube ya y **sin animación**: el `html` tiene scroll suave y
    // el del router se vería deslizarse bajo el fundido. La página vieja está
    // fuera de pantalla, así que este salto no se ve.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    this.zone.run(() => {
      void this.tabsNav
        .go(sentido)
        .catch(() => false)
        .then((ok) => {
          if (this.estado !== 'navegando') return;
          if (!ok) {
            this.cola = [];
            this.cambiando = false;
            this.asentar(0, () => this.limpiar());
            return;
          }
          // El indicador pasa de «anterior ± 1» a «nueva + 0» en el mismo
          // fotograma: se escriben las dos cosas a la vez. Sin zone.js, el
          // índice nuevo de Angular llega en otra tarea, y entre medias el
          // indicador se pasaba una pestaña.
          this.barraEl
            ?.querySelector<HTMLElement>('.tabs__indicator')
            ?.style.setProperty('--i', String(destino));
          this.barraEl?.style.setProperty('--tab-drag', '0');
          // Dos fotogramas: el primero pinta la página nueva y en el segundo,
          // con ella debajo, empieza el fundido.
          requestAnimationFrame(() => {
            this.soltarMovibles();
            requestAnimationFrame(() => {
              if (this.cola.length > 0) {
                // Ya hay más gestos: sin fundido, se reproducen ahora.
                this.procesarCola();
                return;
              }
              this.estado = 'revelando';
              this.root.classList.add('is-swipe-reveal');
              this.temporizador = setTimeout(() => this.limpiar(), MS_FUNDIDO);
            });
          });
        });
    });
  }

  /**
   * El escudo existe por cómo reparte el navegador los toques: **todo** un
   * toque (sus movimientos y su final) va al elemento donde empezó. Si el dedo
   * se apoya sobre la página que está saliendo y el router la retira (o la
   * guarda en la caché), el resto del toque se envía a un nodo fuera del
   * documento y no llega aquí: el gesto se quedaba «arrastrando» para siempre.
   * Mientras la página se mueve, los toques caen en el escudo, que es hijo del
   * shell y nunca se retira. No tapa la cabecera ni la barra de pestañas
   * (están por encima), y deja hacer scroll vertical y zoom como las
   * superficies.
   */
  private activarEscudo(activo: boolean): void {
    if (activo && !this.escudo) {
      const el = document.createElement('div');
      el.className = 'swipe-shield';
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 'calc(var(--z-nav) - 5)',
        touchAction: 'pan-y pinch-zoom',
        pointerEvents: 'none',
      });
      this.host.appendChild(el);
      this.escudo = el;
    }
    if (!this.escudo) return;
    if (activo) this.escudo.style.top = `${pieDeCabecera()}px`;
    this.escudo.style.pointerEvents = activo ? 'auto' : 'none';
  }

  private soltarMovibles(): void {
    for (const el of this.movibles) {
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
    }
  }

  private limpiar(): void {
    this.activarEscudo(false);
    this.cancelarEspera();
    cancelAnimationFrame(this.fotograma);
    this.estado = 'quieto';
    this.cambiando = false;
    this.sentido = null;
    this.dx = 0;
    this.cola = [];
    this.soltarMovibles();
    this.movibles = [];
    this.objetivo = null;
    this.superficie = null;
    this.root.classList.remove('is-swiping', 'is-swipe-settling', 'is-swipe-reveal');
    this.huecoEl?.removeAttribute('data-shown');
    this.huecoEl = null;
    this.peekEl?.removeAttribute('data-side');
    this.peekEl?.style.removeProperty('--swipe-dx');
    this.peekEl?.style.removeProperty('--swipe-top');
    this.barraEl?.style.removeProperty('--tab-drag');
    this.peekEl = null;
    this.barraEl = null;
    if (this.tabsNav.peek() !== null) this.zone.run(() => this.tabsNav.peek.set(null));
  }
}

/** Desplazamiento horizontal pintado ahora mismo (a mitad de transición incluido). */
function desplazamientoActual(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === 'none') return 0;
  return new DOMMatrixReadOnly(transform).m41;
}

/** px/ms de las muestras de los últimos `VENTANA_VELOCIDAD_MS`. */
function velocidad(muestras: readonly { t: number; x: number }[], ahora: number): number {
  const recientes = muestras.filter((m) => ahora - m.t <= VENTANA_VELOCIDAD_MS);
  const a = recientes[0];
  const b = recientes[recientes.length - 1];
  if (!a || !b || b.t === a.t) return 0;
  return (b.x - a.x) / (b.t - a.t);
}

/**
 * ¿El dedo empezó sobre texto seleccionado (está ajustando la selección)?
 *
 * Antes bastaba con que hubiera **cualquier** selección en la página: un toque
 * largo sin querer dejaba un texto marcado y, hasta quitarlo, ningún
 * deslizamiento cambiaba de pestaña (26/11/2026). Ahora sólo cuenta la
 * selección que está bajo el dedo, con el margen de las asas de arrastre.
 */
function tocaLaSeleccion(x: number, y: number): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
  const margen = 24;
  for (let i = 0; i < sel.rangeCount; i++) {
    for (const r of Array.from(sel.getRangeAt(i).getClientRects())) {
      if (x >= r.left - margen && x <= r.right + margen && y >= r.top - margen && y <= r.bottom + margen) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Borde inferior de la cabecera fija: ahí empieza la página tras navegar
 * (arriba del todo), así que ahí se coloca la vista previa.
 */
function pieDeCabecera(): number {
  return Math.max(0, document.querySelector('app-top-nav .nav')?.getBoundingClientRect().bottom ?? 0);
}

/**
 * ¿El toque empezó dentro de una caja que de verdad se desplaza en
 * horizontal (tablas anchas, tiras con scroll, una migaja larga)? Recorre
 * desde el objetivo hasta la superficie, ella incluida.
 */
function tieneScrollHorizontal(target: Element | null, limite: HTMLElement | null): boolean {
  let el = target;
  const tope = limite?.parentElement ?? null;
  while (el && el !== tope) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}
