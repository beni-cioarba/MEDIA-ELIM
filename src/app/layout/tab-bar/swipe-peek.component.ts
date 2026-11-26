import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  Injector,
  ViewContainerRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavItem } from '../../core/navigation/nav.model';
import { PAGE_PREVIEW } from '../../core/navigation/page-preview';
import { PresentationService } from '../../core/presentation.service';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb.component';
import { PagePreviewService } from './page-preview.service';
import { TabNavService } from './tab-nav.service';

/** Barra de pestañas visible: el mismo corte que la propia barra (`< lg`). */
const CON_BARRA = '(max-width: 1023.98px)';

/**
 * Las secciones vecinas que asoman mientras se arrastra la página entre
 * pestañas (`SwipeTabsDirective`), como las pantallas de al lado en WhatsApp.
 *
 * Hay **un hueco por pestaña** (`.peek__slot`, en el orden de la barra) con
 * la página real de esa pestaña (su componente y sus datos de ruta, vía
 * `PagePreviewService`) precedida de su migaja: exactamente lo que se verá al
 * soltar, colocado donde quedará.
 *
 * ── Una vista previa por pestaña, para siempre (26/11/2026) ───────────
 * Primero se montaban al empezar el gesto (la portada: 76 ms en un portátil;
 * el dedo se movía y la página no). Luego, las dos vecinas en reposo tras
 * cada cambio, pero eso era construir dos páginas después de **cada**
 * deslizamiento, justo cuando el visitante encadena otro.
 *
 * Ahora cada vista previa se construye **una sola vez**, la primera vez que su
 * pestaña es vecina de la activa (en reposo, una por reposo), y se queda en su
 * hueco: cambiar de pestaña no crea ni mueve nada. Los huecos están maquetados
 * pero sin pintar (`visibility: hidden`). El gesto descubre el de la vecina
 * marcándolo él mismo (`data-shown="next|prev"`), por índice y en el mismo
 * evento táctil: no espera a Angular, que sin zone.js repinta en otra tarea y
 * podría señalar el hueco de antes del último cambio.
 * Con la caché de páginas del router (`TabReuseStrategy`), tras la primera
 * vuelta deslizar no construye nada.
 *
 * Coste: hasta seis páginas más en memoria, sólo con la barra de pestañas a la
 * vista y fuera de la presentación, y sólo las de las pestañas por las que se
 * pasa. Lo que haga trabajo propio en una vista previa consulta `PAGE_PREVIEW`
 * (carruseles sin avance, el escenario sin sondeo del directo).
 */
@Component({
  selector: 'app-swipe-peek',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BreadcrumbComponent],
  host: {
    'aria-hidden': 'true',
    inert: '',
  },
  template: `
    @for (tab of tabs; track tab.id; let i = $index) {
      <div class="peek__slot">
        @if (montadas()[i]) {
          <app-breadcrumb [trail]="[tab]" />
        }
        <ng-container #outlet />
      </div>
    }
  `,
  styleUrl: './swipe-peek.component.scss',
})
export class SwipePeekComponent {
  private readonly tabNav = inject(TabNavService);
  private readonly pages = inject(PagePreviewService);
  private readonly presentation = inject(PresentationService);
  private readonly injector = inject(Injector);
  private readonly outlets = viewChildren('outlet', { read: ViewContainerRef });

  protected readonly tabs: readonly NavItem[] = this.tabNav.tabs;

  /** Vista previa de cada pestaña (por índice), una vez construida. */
  private readonly refs: (ComponentRef<unknown> | null)[] = this.tabs.map(() => null);
  protected readonly montadas = signal<readonly boolean[]>(this.tabs.map(() => false));

  constructor() {
    // Con un gesto en marcha, el lado que asoma tiene que estar construido.
    // Normalmente ya lo está; si el gesto llega antes que el reposo, se
    // construye ahora. `pageFor` es reactivo a las descargas: si la página aún
    // no ha llegado, este efecto vuelve a correr cuando llegue.
    effect(() => {
      const peek = this.tabNav.peek();
      const i = peek ? this.tabs.indexOf(peek.tab) : -1;
      if (i < 0 || !peek?.tab.path) return;
      const page = this.pages.pageFor(peek.tab.path);
      if (page) untracked(() => this.construir(i, page));
    });

    // En reposo y sin gesto: construye las que falten de las **dos pestañas a
    // cada lado** (las contiguas primero), una por reposo —construir una
    // página es la tarea larga—, y descarga el resto de páginas de pestaña.
    // Dos por lado y no una: quien desliza deprisa encadena dos cambios sin
    // pausa, y la segunda vecina tiene que estar lista antes de que haya
    // reposo. Ninguna asoma nunca en blanco.
    effect((onCleanup) => {
      const base = this.tabNav.activeIndex();
      if (base < 0 || this.tabNav.peek() !== null) return;
      if (this.presentation.isFullscreen() || !conBarra()) return;
      const faltan = [base + 1, base - 1, base + 2, base - 2].filter(
        (i) => this.tabs[i]?.path && !this.montadas()[i],
      );
      // Leído aquí para volver a pasar cuando termine una descarga.
      const listas = faltan.map((i) => this.pages.pageFor(this.tabs[i]!.path!));

      const ids: IdReposo[] = [];
      const siguiente = (n: number): void => {
        const i = faltan[n];
        const page = listas[n];
        if (i === undefined) return;
        ids.push(
          enReposo(() => {
            if (page) this.construir(i, page);
            siguiente(n + 1);
          }),
        );
      };
      ids.push(
        enReposo(() => {
          this.pages.warm(this.tabs.map((tab) => tab.path).filter((p): p is string => p !== undefined));
          siguiente(0);
        }),
      );
      onCleanup(() => ids.forEach(cancelarReposo));
    });

    inject(DestroyRef).onDestroy(() => this.refs.forEach((ref) => ref?.destroy()));
  }

  /** Construye la vista previa de la pestaña `i` (una sola vez). */
  private construir(i: number, page: NonNullable<ReturnType<PagePreviewService['pageFor']>>): void {
    const outlet = this.outlets()[i];
    if (this.refs[i] || !outlet) return;
    this.refs[i] = outlet.createComponent(page.component, {
      injector: Injector.create({
        parent: this.injector,
        providers: [
          { provide: ActivatedRoute, useValue: page.route },
          { provide: PAGE_PREVIEW, useValue: true },
        ],
      }),
    });
    this.montadas.update((m) => m.map((v, j) => v || j === i));
  }
}

function conBarra(): boolean {
  return typeof matchMedia === 'function' && matchMedia(CON_BARRA).matches;
}

type IdReposo = number | ReturnType<typeof setTimeout>;

function enReposo(fn: () => void): IdReposo {
  return typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300);
}

function cancelarReposo(id: IdReposo): void {
  if (typeof cancelIdleCallback === 'function' && typeof id === 'number') cancelIdleCallback(id);
  else clearTimeout(id);
}
