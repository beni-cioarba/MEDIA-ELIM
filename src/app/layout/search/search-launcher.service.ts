import {
  ApplicationRef,
  ComponentRef,
  DOCUMENT,
  EnvironmentInjector,
  Injectable,
  Type,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import { routePackLoader } from '../../core/i18n/route-packs';
import { TranslationPackService } from '../../core/i18n/translation-pack.service';
import { PresentationService } from '../../core/presentation.service';
import { UiStore } from '../../core/state/ui.store';
import type { SearchDialogComponent } from './search-dialog.component';

/**
 * Abre el buscador. Es lo único del buscador que viaja en el arranque, con el
 * botón de la cabecera: el diálogo, el motor, los proveedores y los textos se
 * descargan al abrirlo (o un instante antes: `preload`).
 */
@Injectable({ providedIn: 'root' })
export class SearchLauncher {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly packs = inject(TranslationPackService);
  private readonly ui = inject(UiStore);
  private readonly presentation = inject(PresentationService);

  private current: ComponentRef<SearchDialogComponent> | null = null;
  private loading: Promise<Type<SearchDialogComponent>> | null = null;

  private readonly _opening = signal(false);
  /** Se ha pedido abrir y aún se está descargando. */
  readonly opening = this._opening.asReadonly();

  /** Adelanta la descarga (al apuntar o enfocar el botón). Si falla, ya se pedirá al abrir. */
  preload(): void {
    this.load().catch(() => undefined);
  }

  async open(opener?: HTMLElement | null): Promise<void> {
    // Proyectando no hay buscador; y si ya está abierto, basta con él.
    if (this.current || this._opening() || this.presentation.isFullscreen()) return;
    const back = opener ?? (this.document.activeElement as HTMLElement | null);
    const keepKeyboard = this.holdKeyboard();
    this._opening.set(true);
    try {
      const component = await this.load();
      this.ui.closeAll();
      this.mount(component, back);
    } finally {
      this._opening.set(false);
      keepKeyboard?.remove();
    }
  }

  private load(): Promise<Type<SearchDialogComponent>> {
    this.loading ??= Promise.all([
      import('./search-dialog.component'),
      // Los rótulos, con el diálogo: nunca se pinta una clave.
      this.packs.load('search', routePackLoader('search')),
    ]).then(
      ([module]) => module.SearchDialogComponent,
      (error: unknown) => {
        this.loading = null;
        throw error;
      },
    );
    return this.loading;
  }

  private mount(component: Type<SearchDialogComponent>, back: HTMLElement | null): void {
    const ref = createComponent(component, { environmentInjector: this.injector });
    this.current = ref;
    ref.instance.closed.subscribe((navigated) => {
      if (this.current !== ref) return;
      this.current = null;
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      // Tras ir a un resultado, el foco va al contenido nuevo; si no, a quien abrió.
      const target = navigated ? this.document.getElementById('main-content') : back;
      target?.focus({ preventScroll: true });
    });
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);
    ref.changeDetectorRef.detectChanges();
  }

  /**
   * iOS sólo saca el teclado si el foco entra en un campo **dentro** del toque,
   * y el diálogo llega después (se descarga). Se enfoca en el acto un campo
   * invisible: el teclado sale, y el del diálogo lo hereda.
   */
  private holdKeyboard(): HTMLInputElement | null {
    const view = this.document.defaultView;
    if (!view?.matchMedia?.('(pointer: coarse)').matches) return null;
    const input = this.document.createElement('input');
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    // 16 px: con menos, iOS amplía la página.
    input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;font-size:16px';
    this.document.body.appendChild(input);
    input.focus({ preventScroll: true });
    return input;
  }
}
