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
 * perezosa, y montar las vecinas costaría su carga entera. Lo que asoma es
 * una **vista previa** (`SwipePeekComponent`): la cabecera de la sección
 * vecina —mismo navy, su título y sus páginas—, que es exactamente lo
 * primero que se ve al llegar. Al soltar, la vista previa ocupa la pantalla,
 * se navega y se funde sobre la página real.
 *
 * ── Rendimiento ───────────────────────────────────────────────────────
 * Manejadores pasivos y fuera de Angular. Durante el arrastre sólo se
 * escriben un `transform` y dos variables CSS, una vez por fotograma
 * (`requestAnimationFrame`): nada de detección de cambios por movimiento.
 * El `<main>` lleva `touch-action: pan-y pinch-zoom`: el navegador hace el
 * scroll vertical y el zoom, y el horizontal nos lo deja sin esperar a JS.
 */
@Directive({
  selector: '[appSwipeTabs]',
  host: { style: 'touch-action: pan-y pinch-zoom' },
})
export class SwipeTabsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly tabsNav = inject(TabNavService);
  private readonly ui = inject(UiStore);
  private readonly zone = inject(NgZone);

  private estado: Estado = 'quieto';
  private x0 = 0;
  private y0 = 0;
  private dx = 0;
  private sentido: TabDirection | null = null;
  private hayVecina = false;
  private muestras: { t: number; x: number }[] = [];
  private fotograma = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

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
    if (tieneGestoPropio(e.target, this.host)) return;
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
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTALIDAD || hayTextoSeleccionado()) {
        this.estado = 'quieto';
        return;
      }
      this.estado = 'arrastrando';
      // Se recoloca el origen: el contenido arranca pegado al dedo, sin salto.
      this.x0 = t.clientX;
      this.host.style.willChange = 'transform';
      this.root.classList.add('is-swiping');
      this.root.style.setProperty('--swipe-top', `${zonaSuperior(this.host)}px`);
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
    this.host.style.transform = x === 0 ? '' : `translate3d(${x}px, 0, 0)`;
    this.root.style.setProperty('--swipe-dx', `${x}px`);
    // Progreso del indicador de la barra: +1 = una pestaña a la derecha.
    const progreso = this.hayVecina ? Math.max(-1, Math.min(1, -x / ancho)) : 0;
    this.root.style.setProperty('--tab-drag', String(progreso));
  }

  /** Lleva el contenido a `x` con transición y luego llama a `hecho`. */
  private asentar(x: number, hecho: () => void): void {
    this.estado = 'asentando';
    this.root.classList.add('is-swipe-settling');
    this.host.style.transition = `transform ${MS_ASENTAR}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    this.pintar(x);
    this.temporizador = setTimeout(hecho, MS_ASENTAR);
  }

  /**
   * Cambio confirmado: la vista previa cubre la pantalla. Se navega, se
   * devuelve el contenido a su sitio sin transición (ya es la página nueva)
   * y la vista previa se funde sobre ella.
   */
  private completar(sentido: TabDirection): void {
    this.zone.run(() => {
      void this.tabsNav.go(sentido).then((ok) => {
        if (!ok) {
          this.asentar(0, () => this.limpiar());
          return;
        }
        // En la misma tarea que el cambio de `activeIndex`: el indicador pasa
        // de «anterior + 1» a «nueva + 0» sin pintar un fotograma intermedio.
        this.root.style.setProperty('--tab-drag', '0');
        requestAnimationFrame(() => {
          this.host.style.transition = '';
          this.host.style.transform = '';
          this.host.style.willChange = '';
          this.root.classList.add('is-swipe-reveal');
          this.temporizador = setTimeout(() => this.limpiar(), MS_FUNDIDO);
        });
      });
    });
  }

  private limpiar(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
    cancelAnimationFrame(this.fotograma);
    this.estado = 'quieto';
    this.sentido = null;
    this.dx = 0;
    this.host.style.transition = '';
    this.host.style.transform = '';
    this.host.style.willChange = '';
    this.root.classList.remove('is-swiping', 'is-swipe-settling', 'is-swipe-reveal');
    for (const prop of ['--swipe-dx', '--tab-drag', '--swipe-top']) this.root.style.removeProperty(prop);
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
 * Dónde empieza, en pantalla, la zona que se desliza: el borde superior del
 * `<main>` o, si ya se ha bajado, el pie de la cabecera fija. La vista previa
 * se coloca ahí para no tapar la cabecera (que, como en WhatsApp, se queda).
 */
function zonaSuperior(main: HTMLElement): number {
  const cabecera = document.querySelector('app-top-nav .nav')?.getBoundingClientRect().bottom ?? 0;
  return Math.max(0, cabecera, main.getBoundingClientRect().top);
}

/**
 * ¿El toque empieza en algo con desplazamiento horizontal propio? Recorre
 * desde el objetivo hasta el `<main>`: excluidos explícitos y cualquier caja
 * que de verdad se desplace en horizontal (tablas anchas, tiras con scroll).
 */
function tieneGestoPropio(target: EventTarget | null, limite: HTMLElement): boolean {
  let el = target instanceof Element ? target : null;
  if (el?.closest(EXCLUIDOS)) return true;
  while (el && el !== limite) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}
