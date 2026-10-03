import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavItem } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';

/** Sentido de un cambio de pestaña: de dónde entra la página nueva. */
export type TabDirection = 'next' | 'prev';

/**
 * Las pestañas del móvil y el paso de una a otra.
 *
 * Lo comparten la barra (`TabBarComponent`) y el gesto de deslizar sobre la
 * página (`SwipeTabsDirective`): los dos tienen que saber **qué pestañas hay,
 * cuál está activa y cuál es la siguiente**, y no deben poder discrepar.
 *
 * Las pestañas son **todo el primer nivel de `MAIN_NAV`** —también las dos
 * llamadas a la acción, «Donează» y «În direct»—, en su orden. Sin lista
 * propia: una entrada nueva en el menú aparece aquí sola.
 */
@Injectable({ providedIn: 'root' })
export class TabNavService {
  private readonly router = inject(Router);
  private readonly navActive = inject(NavActiveService);

  readonly tabs: readonly NavItem[] = MAIN_NAV.filter((item) => item.path !== undefined);

  /** Pestaña del bloque en el que se está (`-1` = ninguna, p. ej. `/stil`). */
  readonly activeIndex = computed(() => {
    const root = this.navActive.trail()[0];
    return root ? this.tabs.findIndex((tab) => tab.id === root.id) : -1;
  });

  /**
   * Sentido del último cambio hecho con el gesto. Lo lee el layout para que
   * la página nueva entre desde el lado correcto; se consume al animar.
   */
  readonly lastDirection = signal<TabDirection | null>(null);

  /**
   * Pasa a la pestaña contigua. No da la vuelta: en la última, deslizar
   * hacia la siguiente no hace nada (como en las apps nativas).
   * Devuelve si ha habido cambio.
   */
  step(direction: TabDirection): boolean {
    const current = this.activeIndex();
    if (current < 0) return false;
    const target = this.tabs[current + (direction === 'next' ? 1 : -1)];
    if (!target?.path) return false;
    this.lastDirection.set(direction);
    void this.router.navigateByUrl(target.path);
    return true;
  }
}
