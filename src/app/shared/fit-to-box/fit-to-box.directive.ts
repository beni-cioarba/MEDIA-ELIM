import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnDestroy, inject } from '@angular/core';

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
 * También **crece** hasta `appFitToBoxMax` (por defecto 1, sin crecer) cuando
 * sobra sitio: en el lienzo entero de la proyección un anuncio corto dejaba
 * la cuarta parte de abajo vacía; con un máximo de 1,2 el mismo anuncio se
 * lee más grande y ocupa la diapositiva.
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

  /** Escala máxima: 1 = sólo encoge; > 1 = también crece si sobra sitio. */
  @Input() appFitToBoxMax = 1;

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

    // Cabe en alto Y en ancho. El ancho importa por los textos que no se
    // parten (`white-space: nowrap`: nombres, precios): podían crecer hasta
    // salirse de SU columna y pisar la de al lado aunque todo cupiera en alto
    // («Marcos Zăgrean», 03/10/2026). Ese desborde queda dentro del contenido,
    // así que se mira cada uno de esos elementos, no sólo el conjunto.
    const rigid = Array.from(inner.querySelectorAll<HTMLElement>('*')).filter(
      (el) => getComputedStyle(el).whiteSpace === 'nowrap',
    );
    const fits = (scale: number): boolean => {
      this.host.style.setProperty('--fit', scale.toFixed(3));
      if (inner.scrollHeight > box || inner.scrollWidth > inner.clientWidth + 1) return false;
      return rigid.every((el) => el.scrollWidth <= el.clientWidth + 1);
    };

    const max = Math.max(1, this.appFitToBoxMax);

    // A la escala máxima cabe: nada que buscar.
    if (fits(max)) return;

    // El texto refluye al cambiar de escala, así que la relación tamaño ↔
    // altura no es lineal: una búsqueda binaria encuentra la mayor escala que
    // cabe (sin dejar hueco) en pocas pasadas y sin márgenes a ojo. Si crece,
    // se parte de 1 (siempre admisible si cabe); si no, del mínimo.
    let low = max > 1 && fits(1) ? 1 : MIN_FIT; // cabe (o es el mínimo admisible)
    let high = max; // no cabe
    for (let step = 0; step < SEARCH_STEPS; step++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    fits(low);
  }
}
