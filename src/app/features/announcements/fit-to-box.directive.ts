import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * Escala mínima. Es la **red de seguridad** para un anuncio cargado, no la
 * norma: se redacta para que quepa a 1 (`35-announcements.md`). A 0,7 el
 * cuerpo (4,6u) queda justo en el mínimo absoluto (3,2u ≈ 35 px) y el titular
 * en 5,6u; las etiquetas no bajan de 3,2u porque la hoja las fija con `max()`.
 * Si ni así cabe, sobra contenido: sección `webOnly` o texto más corto.
 */
const MIN_FIT = 0.7;

/**
 * Pasos de la búsqueda binaria de la escala. Con 7 pasos entre 0,6 y 1 la
 * precisión es de ~0,001: la mayor escala que cabe, sin hueco sobrante.
 */
const SEARCH_STEPS = 7;

/**
 * Autoajuste de contenido a su caja, al estilo del «ajustar texto» de una
 * diapositiva.
 *
 * El host es una caja de altura fija que recorta (`overflow: hidden`); su
 * primer hijo es el contenido. Cuando el contenido no cabe, la directiva fija
 * en el host la variable CSS `--fit` (1 → 0,6) y la hoja de estilos la usa
 * como multiplicador de cuerpos y espaciados: **todo se encoge a la vez**,
 * conservando las proporciones del diseño.
 *
 * Sólo actúa cuando el host recorta de verdad: en la web pública la tarjeta
 * crece con su contenido y la directiva no hace nada. Así la misma tarjeta
 * sirve para la página `/anunturi` y para la diapositiva proyectada.
 *
 * Se recalcula cuando cambia el tamaño de la caja (con o sin QR, tamaño del
 * QR, otra pantalla) y cuando terminan de cargar las fuentes, que es el otro
 * momento en que el texto cambia de medida.
 */
@Directive({
  selector: '[appFitToBox]',
  standalone: true,
})
export class FitToBoxDirective implements AfterViewInit, OnDestroy {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private observer: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      this.observer = new ResizeObserver(() => this.fit());
      this.observer.observe(this.host);
      this.fit();
      document.fonts?.ready.then(() => this.fit()).catch(() => undefined);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private fit(): void {
    const inner = this.host.firstElementChild as HTMLElement | null;
    if (!inner) return;

    // Sin recorte no hay nada que ajustar (web pública): dejar la escala en 1.
    if (getComputedStyle(this.host).overflowY !== 'hidden') {
      this.host.style.removeProperty('--fit');
      return;
    }

    const box = this.host.clientHeight;
    if (box === 0) return;

    const fits = (scale: number): boolean => {
      this.host.style.setProperty('--fit', scale.toFixed(3));
      return inner.scrollHeight <= box;
    };

    // A escala natural cabe: nada que hacer.
    if (fits(1)) return;

    // El texto refluye al encoger, así que la relación tamaño ↔ altura no es
    // lineal: una búsqueda binaria encuentra la mayor escala que cabe (sin
    // dejar hueco) en pocas pasadas y sin depender de márgenes a ojo.
    let low = MIN_FIT; // cabe (o es el mínimo admisible)
    let high = 1; // no cabe
    for (let step = 0; step < SEARCH_STEPS; step++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    fits(low);
  }
}
