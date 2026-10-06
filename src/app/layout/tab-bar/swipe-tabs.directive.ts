import { DOCUMENT, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';
import { UiStore } from '../../core/state/ui.store';
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
 * Lo que ya tiene su propio gesto horizontal y no debe cambiar de pestaña:
 * carruseles, campos, vídeos, diálogos y cualquier cosa marcada a mano.
 */
const EXCLUIDOS = [
  '[data-no-swipe]',
  // El carrusel de tarjetas se arrastra; el del hero no (avanza solo y por
  // puntos), así que arrastrar sobre el hero sí cambia de pestaña.
  'app-card-carousel',
  '.ui-carousel',
  'input',
  'textarea',
  'select',
  'video',
  'iframe',
  'dialog',
].join(',');

type Estado = 'quieto' | 'decidiendo' | 'arrastrando' | 'asentando';

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
 *
 * ── Cómo se hace aquí ─────────────────────────────────────────────────
 * Las secciones de WhatsApp están todas montadas; aquí cada una es una ruta
 * perezosa y mantenerlas todas montadas costaría memoria y trabajo en
 * segundo plano. Lo que asoma se monta **al empezar el gesto** y es la
 * página vecina real (`SwipePeekComponent` + `PagePreviewService`), con su
 * migaja, donde quedará. Al soltar ocupa la pantalla, se navega y se funde
 * sobre la página real, que es idéntica.
 *
 * ── Rendimiento ───────────────────────────────────────────────────────
 * Manejadores pasivos y fuera de Angular. Durante el arrastre sólo se
 * escriben un `transform` y dos variables CSS, una vez por fotograma
 * (`requestAnimationFrame`): nada de detección de cambios por movimiento.
 * Las superficies llevan `touch-action: pan-y pinch-zoom` (lo pone el
 * shell): el navegador hace el scroll vertical y el zoom, y el horizontal nos
 * lo deja sin esperar a JS.
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
  private objetivo: Element | null = null;
  private superficie: HTMLElement | null = null;
  /** La vista previa y la barra: las únicas que leen las variables del gesto. */
  private peekEl: HTMLElement | null = null;
  private barraEl: HTMLElement | null = null;
  private x0 = 0;
  private y0 = 0;
  private dx = 0;
  private sentido: TabDirection | null = null;
  private hayVecina = false;
  private muestras: { t: number; x: number }[] = [];
  private fotograma = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  /**
   * Lo que se desplaza con el dedo: las superficies (`<main>`, migaja de pan
   * y pie), como una pantalla entera de WhatsApp. La cabecera y la barra de
   * pestañas se quedan.
   */
  private movibles: HTMLElement[] = [];

  constructor() {
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
    });
  }

  // ── Gesto ──────────────────────────────────────────────────────────
  private empezar(e: TouchEvent): void {
    if (this.estado === 'asentando') return;
    this.estado = 'quieto';
    if (e.touches.length !== 1 || !matchMedia(CON_BARRA).matches || this.ui.drawerOpen()) return;
    if (this.tabsNav.activeIndex() < 0) return;
    const t = e.touches[0];
    if (!t || t.clientX < BORDE_PX || t.clientX > window.innerWidth - BORDE_PX) return;
    const objetivo = e.target instanceof Element ? e.target : null;
    const superficie = this.superficies().find((el) => el.contains(objetivo)) ?? null;
    // Fuera de las superficies (cabecera, barra, dock) o sobre algo con gesto
    // horizontal propio declarado: no es nuestro. La comprobación cara (cajas
    // con scroll horizontal, que lee el layout) espera a que el gesto resulte
    // horizontal: aquí empieza también cada scroll vertical.
    if (!superficie || objetivo?.closest(EXCLUIDOS)) return;
    this.objetivo = objetivo;
    this.superficie = superficie;
    this.estado = 'decidiendo';
    this.x0 = t.clientX;
    this.y0 = t.clientY;
    this.dx = 0;
    this.sentido = null;
    this.muestras = [{ t: e.timeStamp, x: t.clientX }];
  }

  private mover(e: TouchEvent): void {
    const t = e.touches[0];
    if (!t || (this.estado !== 'decidiendo' && this.estado !== 'arrastrando')) return;
    if (e.touches.length !== 1) {
      // Un segundo dedo es un zoom: se abandona el arrastre.
      this.soltar(null);
      return;
    }
    const dx = t.clientX - this.x0;
    const dy = t.clientY - this.y0;

    if (this.estado === 'decidiendo') {
      if (Math.hypot(dx, dy) < UMBRAL_DECISION_PX) return;
      if (
        Math.abs(dx) < Math.abs(dy) * HORIZONTALIDAD ||
        hayTextoSeleccionado() ||
        tieneScrollHorizontal(this.objetivo, this.superficie)
      ) {
        this.estado = 'quieto';
        return;
      }
      this.estado = 'arrastrando';
      // Se recoloca el origen: el contenido arranca pegado al dedo, sin salto.
      this.x0 = t.clientX;
      this.movibles = this.superficies();
      this.peekEl = this.host.querySelector<HTMLElement>('app-swipe-peek');
      this.barraEl = this.host.querySelector<HTMLElement>('app-tab-bar');
      for (const el of this.movibles) el.style.willChange = 'transform';
      this.root.classList.add('is-swiping');
      this.peekEl?.style.setProperty('--swipe-top', `${pieDeCabecera()}px`);
    }

    this.dx = t.clientX - this.x0;
    this.muestras.push({ t: e.timeStamp, x: t.clientX });
    if (this.muestras.length > 12) this.muestras.shift();

    const sentido: TabDirection = this.dx < 0 ? 'next' : 'prev';
    if (sentido !== this.sentido) {
      this.sentido = sentido;
      const vecina = this.tabsNav.neighbor(sentido);
      this.hayVecina = vecina !== null;
      this.zone.run(() => this.tabsNav.peek.set(vecina ? { tab: vecina, direction: sentido } : null));
    }
    this.pintarEnFotograma();
  }

  private soltar(e: TouchEvent | null): void {
    if (this.estado === 'decidiendo') this.estado = 'quieto';
    if (this.estado !== 'arrastrando') return;
    cancelAnimationFrame(this.fotograma);

    const ancho = window.innerWidth;
    const v = e ? velocidad(this.muestras, e.timeStamp) : 0;
    const mismoSentido = Math.sign(v) === Math.sign(this.dx);
    const cambiar =
      e !== null &&
      this.hayVecina &&
      (Math.abs(this.dx) > ancho * FRACCION_CAMBIO ||
        (mismoSentido && Math.abs(v) > VELOCIDAD_FLICK && Math.abs(this.dx) > 30));

    const sentido = this.sentido;
    if (cambiar && sentido) {
      this.asentar(sentido === 'next' ? -ancho : ancho, () => this.completar(sentido));
    } else {
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

  /** Lo que se mueve el contenido: el dedo, o una fracción si no hay vecina. */
  private desplazamiento(): number {
    return this.hayVecina ? this.dx : this.dx * RESISTENCIA;
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

  /** Lleva el contenido a `x` con transición y luego llama a `hecho`. */
  private asentar(x: number, hecho: () => void): void {
    this.estado = 'asentando';
    this.root.classList.add('is-swipe-settling');
    // Con movimiento reducido no se anima: el CSS ya quita las transiciones
    // de la vista previa y la barra, y el contenido salta igual que ellas.
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MS_ASENTAR;
    for (const el of this.movibles) {
      el.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : '';
    }
    this.pintar(x);
    this.temporizador = setTimeout(hecho, ms);
  }

  /**
   * Cambio confirmado: la vista previa cubre la pantalla. Se navega, se
   * devuelve el contenido a su sitio sin transición (ya es la página nueva)
   * y la vista previa se funde sobre ella.
   */
  private completar(sentido: TabDirection): void {
    // La página nueva se verá desde arriba, que es lo que enseña la vista
    // previa. Se sube ya y **sin animación**: el `html` tiene scroll suave y
    // el del router se vería deslizarse bajo el fundido. La página vieja está
    // fuera de pantalla, así que este salto no se ve.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    this.zone.run(() => {
      void this.tabsNav.go(sentido).then((ok) => {
        if (!ok) {
          this.asentar(0, () => this.limpiar());
          return;
        }
        // En la misma tarea que el cambio de `activeIndex`: el indicador pasa
        // de «anterior + 1» a «nueva + 0» sin pintar un fotograma intermedio.
        this.barraEl?.style.setProperty('--tab-drag', '0');
        // Dos fotogramas: el primero pinta la página nueva (ya renderizada por
        // la detección de cambios de la navegación) y en el segundo, con ella
        // debajo, empieza el fundido.
        requestAnimationFrame(() => {
          this.soltarMovibles();
          requestAnimationFrame(() => {
            this.root.classList.add('is-swipe-reveal');
            this.temporizador = setTimeout(() => this.limpiar(), MS_FUNDIDO);
          });
        });
      });
    });
  }

  private soltarMovibles(): void {
    for (const el of this.movibles) {
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
    }
  }

  private limpiar(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
    cancelAnimationFrame(this.fotograma);
    this.estado = 'quieto';
    this.sentido = null;
    this.dx = 0;
    this.soltarMovibles();
    this.movibles = [];
    this.objetivo = null;
    this.superficie = null;
    this.root.classList.remove('is-swiping', 'is-swipe-settling', 'is-swipe-reveal');
    this.peekEl?.style.removeProperty('--swipe-dx');
    this.peekEl?.style.removeProperty('--swipe-top');
    this.barraEl?.style.removeProperty('--tab-drag');
    this.peekEl = null;
    this.barraEl = null;
    if (this.tabsNav.peek() !== null) this.zone.run(() => this.tabsNav.peek.set(null));
  }
}

/** px/ms de las muestras de los últimos `VENTANA_VELOCIDAD_MS`. */
function velocidad(muestras: readonly { t: number; x: number }[], ahora: number): number {
  const recientes = muestras.filter((m) => ahora - m.t <= VENTANA_VELOCIDAD_MS);
  const a = recientes[0];
  const b = recientes[recientes.length - 1];
  if (!a || !b || b.t === a.t) return 0;
  return (b.x - a.x) / (b.t - a.t);
}

function hayTextoSeleccionado(): boolean {
  return (window.getSelection()?.toString() ?? '').length > 0;
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
