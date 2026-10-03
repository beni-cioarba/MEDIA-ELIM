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
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PAGE_PREVIEW } from '../../core/navigation/page-preview';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb.component';
import { PagePreviewService } from './page-preview.service';
import { TabNavService } from './tab-nav.service';

/**
 * La sección vecina que asoma mientras se arrastra la página entre pestañas
 * (`SwipeTabsDirective`), como la siguiente pantalla de WhatsApp.
 *
 * Monta **la página real** (su componente, con sus datos de ruta, vía
 * `PagePreviewService`) precedida de su migaja de pan: exactamente lo que se
 * verá al soltar, colocado donde quedará. Al terminar el gesto se destruye.
 *
 * La posición no pasa por Angular: la fija el CSS con las variables que el
 * gesto escribe en el `<html>` (`--swipe-dx`, `--swipe-top`) y las clases
 * `is-swipe-settling` / `is-swipe-reveal`.
 */
@Component({
  selector: 'app-swipe-peek',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BreadcrumbComponent],
  host: {
    'aria-hidden': 'true',
    inert: '',
    '[class.is-next]': "peek()?.direction === 'next'",
    '[class.is-prev]': "peek()?.direction === 'prev'",
  },
  template: `
    @if (trail(); as rastro) {
      <app-breadcrumb [trail]="rastro" />
    }
    <ng-container #outlet />
  `,
  styleUrl: './swipe-peek.component.scss',
})
export class SwipePeekComponent {
  private readonly tabNav = inject(TabNavService);
  private readonly pages = inject(PagePreviewService);
  private readonly injector = inject(Injector);
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });

  protected readonly peek = this.tabNav.peek;
  protected readonly trail = computed(() => {
    const tab = this.peek()?.tab;
    return tab ? [tab] : null;
  });

  private montada: ComponentRef<unknown> | null = null;

  constructor() {
    // Monta / desmonta la página vecina al empezar, cambiar de lado o
    // terminar el arrastre.
    effect(() => {
      const path = this.peek()?.tab.path ?? null;
      untracked(() => this.montar(path));
    });

    // Tras cada cambio de pestaña, en reposo, deja cargadas las dos vecinas:
    // al empezar el siguiente arrastre se montan en el mismo fotograma.
    effect((onCleanup) => {
      const i = this.tabNav.activeIndex();
      if (i < 0) return;
      const vecinas = [this.tabNav.tabs[i - 1]?.path, this.tabNav.tabs[i + 1]?.path].filter(
        (path): path is string => path !== undefined,
      );
      const id = enReposo(() => this.pages.warm(vecinas));
      onCleanup(() => cancelarReposo(id));
    });

    inject(DestroyRef).onDestroy(() => this.montar(null));
  }

  private montar(path: string | null): void {
    this.montada?.destroy();
    this.montada = null;
    if (!path) return;
    const page = this.pages.pageFor(path);
    if (!page) return;
    this.montada = this.outlet().createComponent(page.component, {
      injector: Injector.create({
        parent: this.injector,
        providers: [
          { provide: ActivatedRoute, useValue: page.route },
          { provide: PAGE_PREVIEW, useValue: true },
        ],
      }),
    });
  }
}

type IdReposo = number | ReturnType<typeof setTimeout>;

function enReposo(fn: () => void): IdReposo {
  return typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300);
}

function cancelarReposo(id: IdReposo): void {
  if (typeof cancelIdleCallback === 'function' && typeof id === 'number') cancelIdleCallback(id);
  else clearTimeout(id);
}
