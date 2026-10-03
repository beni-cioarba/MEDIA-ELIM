import { DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { UiStore } from '../../core/state/ui.store';
import { TabNavService } from './tab-nav.service';

/** Distancia mínima del gesto: el mayor de estos dos (px / fracción del ancho). */
const MIN_PX = 64;
const MIN_FRACCION = 0.18;
/** El gesto tiene que ser claramente horizontal: |dx| > |dy| × esto. */
const HORIZONTALIDAD = 1.8;
/** Un deslizamiento, no un arrastre lento (que suele ser leer o seleccionar). */
const MAX_MS = 700;
/**
 * Franja de los bordes que se deja al sistema: en iOS y Android deslizar
 * desde el borde es «atrás». Un gesto que empieza ahí no es nuestro.
 */
const BORDE_PX = 24;

/**
 * Lo que ya tiene su propio gesto horizontal y no debe cambiar de pestaña:
 * carruseles, campos, vídeos, mapas y cualquier cosa marcada a mano.
 */
const EXCLUIDOS = [
  '[data-no-swipe]',
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

/** Barra de pestañas visible: el mismo corte que la propia barra (`< lg`). */
const CON_BARRA = '(max-width: 1023.98px)';

/**
 * Deslizar sobre la página cambia de pestaña, como en las apps nativas
 * (WhatsApp, Instagram): de derecha a izquierda, a la siguiente; de izquierda
 * a derecha, a la anterior. La página nueva entra desde el lado del gesto.
 *
 * Se pone en el `<main>` del layout. Sólo actúa con el dedo y con la barra de
 * pestañas a la vista; en escritorio y en presentación no hace nada.
 *
 * ── Por qué con `touchstart`/`touchend` y fuera de la zona ────────────
 * Los manejadores son pasivos y no llaman a `preventDefault()`: el scroll
 * vertical nunca espera a JavaScript. Se registran fuera de Angular porque
 * se disparan con cada toque y casi nunca cambian nada; sólo se vuelve a la
 * zona para navegar.
 */
@Directive({ selector: '[appSwipeTabs]' })
export class SwipeTabsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly tabsNav = inject(TabNavService);
  private readonly ui = inject(UiStore);
  private readonly zone = inject(NgZone);

  private inicio: { x: number; y: number; t: number } | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    const onStart = (event: TouchEvent): void => this.empezar(event);
    const onEnd = (event: TouchEvent): void => this.terminar(event);
    const onCancel = (): void => {
      this.inicio = null;
    };

    this.zone.runOutsideAngular(() => {
      this.host.addEventListener('touchstart', onStart, { passive: true });
      this.host.addEventListener('touchend', onEnd, { passive: true });
      this.host.addEventListener('touchcancel', onCancel, { passive: true });
    });
    destroyRef.onDestroy(() => {
      this.host.removeEventListener('touchstart', onStart);
      this.host.removeEventListener('touchend', onEnd);
      this.host.removeEventListener('touchcancel', onCancel);
    });

    // La página nueva entra desde el lado del gesto. La clase se quita al
    // terminar la animación para que la siguiente vuelva a dispararse.
    inject(Router)
      .events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => {
        const sentido = this.tabsNav.lastDirection();
        if (!sentido) return;
        this.tabsNav.lastDirection.set(null);
        this.host.classList.remove('is-swipe-next', 'is-swipe-prev');
        // Forzar el reflujo para reiniciar la animación si se repite el sentido.
        void this.host.offsetWidth;
        this.host.classList.add(sentido === 'next' ? 'is-swipe-next' : 'is-swipe-prev');
      });

    const limpiar = (): void => this.host.classList.remove('is-swipe-next', 'is-swipe-prev');
    this.host.addEventListener('animationend', limpiar);
    destroyRef.onDestroy(() => this.host.removeEventListener('animationend', limpiar));
  }

  private empezar(event: TouchEvent): void {
    this.inicio = null;
    if (event.touches.length !== 1 || !matchMedia(CON_BARRA).matches || this.ui.drawerOpen()) return;
    const toque = event.touches[0];
    if (!toque || toque.clientX < BORDE_PX || toque.clientX > window.innerWidth - BORDE_PX) return;
    if (tieneGestoPropio(event.target, this.host)) return;
    this.inicio = { x: toque.clientX, y: toque.clientY, t: event.timeStamp };
  }

  private terminar(event: TouchEvent): void {
    const inicio = this.inicio;
    this.inicio = null;
    const toque = event.changedTouches[0];
    if (!inicio || !toque) return;

    const dx = toque.clientX - inicio.x;
    const dy = toque.clientY - inicio.y;
    const minimo = Math.max(MIN_PX, window.innerWidth * MIN_FRACCION);
    if (Math.abs(dx) < minimo || Math.abs(dx) < Math.abs(dy) * HORIZONTALIDAD) return;
    if (event.timeStamp - inicio.t > MAX_MS) return;
    // Seleccionar texto arrastrando también es un gesto horizontal.
    if ((window.getSelection()?.toString() ?? '').length > 0) return;

    this.zone.run(() => this.tabsNav.step(dx < 0 ? 'next' : 'prev'));
  }
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
