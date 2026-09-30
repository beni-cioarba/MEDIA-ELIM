import { DestroyRef, Directive, ElementRef, Injectable, inject, output } from '@angular/core';

/**
 * Margen de anticipación: un elemento se da por «cerca» cuando le falta
 * **una pantalla y media** para entrar. Es lo que tarda un desplazamiento
 * normal con la rueda o el dedo; así el contenido ya está pintado cuando
 * llega, y el esqueleto sólo se ve en un salto brusco.
 */
const ANTICIPACION = '150% 0px 150% 0px';

/**
 * Un **único** `IntersectionObserver` para toda la app.
 *
 * Un observador por elemento funciona, pero cada uno es una suscripción al
 * cálculo de intersecciones del navegador; con uno solo, el navegador hace
 * una pasada por fotograma para todos. Cada elemento se observa **una vez**:
 * en cuanto avisa, se deja de observar (lo pintado no se despinta).
 */
@Injectable({ providedIn: 'root' })
export class NearViewportService {
  private readonly avisos = new Map<Element, () => void>();
  private observador: IntersectionObserver | null = null;

  observar(elemento: Element, aviso: () => void): void {
    // Sin soporte (navegadores muy antiguos): se pinta todo, como antes.
    if (typeof IntersectionObserver === 'undefined') {
      aviso();
      return;
    }
    this.observador ??= new IntersectionObserver((entradas) => this.alCruzar(entradas), {
      rootMargin: ANTICIPACION,
    });
    this.avisos.set(elemento, aviso);
    this.observador.observe(elemento);
  }

  olvidar(elemento: Element): void {
    this.avisos.delete(elemento);
    this.observador?.unobserve(elemento);
  }

  private alCruzar(entradas: readonly IntersectionObserverEntry[]): void {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      const aviso = this.avisos.get(entrada.target);
      this.olvidar(entrada.target);
      aviso?.();
    }
  }
}

/**
 * Avisa **una sola vez** cuando el elemento se acerca a la pantalla.
 *
 * Es la base de la carga progresiva: la página pinta un esqueleto ligero con
 * el alto aproximado y cambia al contenido real cuando esto dispara.
 *
 * Por qué no `@defer (on viewport)`: `@defer` sirve para **trocear código**
 * (aquí las fichas ya van en el chunk de la página) y su disparador de
 * viewport no deja anticiparse. Esto sólo decide *cuándo* pintar, con una
 * pantalla y media de margen, y se puede forzar desde fuera (un enlace
 * directo a una semana antigua la pinta sin esperar).
 *
 * ```html
 * <div (appNearViewport)="pintar(id)">…esqueleto…</div>
 * ```
 */
@Directive({ selector: '[appNearViewport]' })
export class NearViewportDirective {
  readonly appNearViewport = output<void>();

  constructor() {
    const elemento: HTMLElement = inject(ElementRef).nativeElement;
    const servicio = inject(NearViewportService);
    servicio.observar(elemento, () => this.appNearViewport.emit());
    inject(DestroyRef).onDestroy(() => servicio.olvidar(elemento));
  }
}
