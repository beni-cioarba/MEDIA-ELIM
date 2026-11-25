import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  OutputEmitterRef,
  Type,
  createComponent,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Lo que tiene que cumplir un visor para abrirse como capa. */
export interface OverlayHost {
  readonly closed: OutputEmitterRef<void>;
}

/**
 * Monta y desmonta un componente de capa (visor documental, galería…)
 * colgado de `<body>`, **cargándolo bajo demanda**: el componente viaja en su
 * propio chunk y sólo se descarga la primera vez que alguien lo abre. Al
 * cerrar devuelve el foco a quien lo abrió.
 *
 * «Atrás» (atajo, botón del ratón, gesto) la cierra: va fuera de la página,
 * así que sin esto se quedaba encima de la página anterior.
 *
 * Una sola capa abierta a la vez por instancia. Se usa desde los servicios
 * de cada visor (`DocumentViewerService`, `GalleryViewerService`).
 */
export class LazyOverlay<C extends OverlayHost> {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private current: ComponentRef<C> | null = null;

  private readonly onPopState = (): void => this.close();

  constructor(private readonly load: () => Promise<Type<C>>) {}

  async open(inputs: Record<string, unknown>): Promise<void> {
    const opener = this.document.activeElement as HTMLElement | null;
    const component = await this.load();

    this.close();
    const ref = createComponent(component, { environmentInjector: this.injector });
    for (const [name, value] of Object.entries(inputs)) ref.setInput(name, value);
    ref.instance.closed.subscribe(() => {
      this.close();
      opener?.focus({ preventScroll: true });
    });
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);
    this.current = ref;
    this.document.defaultView?.addEventListener('popstate', this.onPopState);
  }

  close(): void {
    const ref = this.current;
    if (!ref) return;
    this.current = null;
    this.document.defaultView?.removeEventListener('popstate', this.onPopState);
    this.appRef.detachView(ref.hostView);
    ref.destroy();
  }
}
