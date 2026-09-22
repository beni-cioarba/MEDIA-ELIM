
import { Injectable, inject, signal, computed, DOCUMENT } from '@angular/core';

/**
 * Papel de esta instancia de la app dentro de la proyección.
 *  - `window`   ventana de proyección abierta desde el panel de control
 *               (`/media/ecran`): la que se lleva a la pantalla del templo.
 *  - `preview`  vista previa incrustada en el panel de control (mismo
 *               componente, en un `<iframe>`): sigue a la ventana o, si no
 *               hay ventana, proyecta ella sola en pequeño.
 *  - `inline`   pantalla completa en la propia pestaña de `/media` (tecla `F`),
 *               para un solo monitor.
 */
export type ProjectionRole = 'window' | 'preview' | 'inline';

/**
 * Estado del **modo presentación** de esta instancia.
 *
 * Tres formas de estar presentando, todas con el mismo resultado visual
 * (`.stage.is-fullscreen`):
 *  1. Fullscreen API nativa (pantalla completa del navegador).
 *  2. Fullscreen *simulado* (clase CSS en `<body>`), respaldo cuando la API
 *     no está disponible o el usuario deniega el permiso.
 *  3. **Ruta de proyección** (`/media/ecran`): la ventana o el iframe que
 *     nacen ya proyectando, sin depender de la Fullscreen API. Dentro de esa
 *     ventana la pantalla completa nativa es opcional (sólo oculta el marco
 *     del navegador) y se pide con `F` o con el botón de los controles.
 *
 * Expone:
 *  - `isFullscreen`      → presentando (por cualquiera de las tres vías).
 *  - `isNativeFullscreen`→ la ventana ocupa la pantalla completa de verdad.
 *  - `isSimulated`       → respaldo CSS activo.
 *  - `role`              → papel de esta instancia (o `null` fuera de proyección).
 */
@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly document = inject(DOCUMENT);

  private readonly nativeFullscreen = signal<boolean>(false);
  private readonly simulatedFullscreen = signal<boolean>(false);
  private readonly projectionRole = signal<ProjectionRole | null>(null);

  readonly isNativeFullscreen = this.nativeFullscreen.asReadonly();
  readonly isSimulated = this.simulatedFullscreen.asReadonly();
  readonly role = this.projectionRole.asReadonly();

  /** Presentando, por la vía que sea. */
  readonly isFullscreen = computed(
    () =>
      this.nativeFullscreen() || this.simulatedFullscreen() || this.projectionRole() !== null,
  );

  /** Ruta de proyección activa (ventana o vista previa). */
  readonly isProjectionRoute = computed(() => this.projectionRole() !== null);

  /** Vista previa incrustada: sin controles ni pantalla completa. */
  readonly isPreview = computed(() => this.projectionRole() === 'preview');

  /**
   * ¿Tiene sentido ofrecer «pantalla completa» aquí? Sólo en la ventana de
   * proyección que aún no la ocupa (en el iframe nunca; inline ya lo es).
   */
  readonly canRequestNativeFullscreen = computed(
    () => this.projectionRole() === 'window' && !this.nativeFullscreen(),
  );

  constructor() {
    // Mantener la signal sincronizada con el estado real del navegador,
    // incluyendo cuando el usuario sale con la tecla Escape.
    const onChange = () => this.nativeFullscreen.set(!!this.document.fullscreenElement);
    this.document.addEventListener('fullscreenchange', onChange);
    this.document.addEventListener('webkitfullscreenchange', onChange);
  }

  /**
   * Alterna la presentación.
   *  - En la ruta de proyección alterna sólo la pantalla completa nativa: la
   *    ventana sigue proyectando aunque el navegador vuelva a tener marco.
   *  - En el resto, entra o sale del modo presentación (nativo o simulado).
   */
  async toggle(): Promise<void> {
    if (this.projectionRole() !== null) {
      await this.toggleNative();
      return;
    }
    if (this.isFullscreen()) {
      await this.exit();
      return;
    }
    await this.enter();
  }

  /**
   * Alterna **sólo** la pantalla completa nativa. Devuelve `false` si el
   * navegador rechazó la petición: sin API, o porque exigía un gesto del
   * usuario en esta misma ventana (caso de la orden que llega desde el panel
   * de control en navegadores sin delegación de capacidades).
   */
  async toggleNative(): Promise<boolean> {
    if (this.nativeFullscreen()) {
      await this.exitNative();
      return true;
    }
    return this.requestNative();
  }

  /** Declara esta instancia como ruta de proyección (ventana o vista previa). */
  enterProjectionRoute(role: Exclude<ProjectionRole, 'inline'>): void {
    this.projectionRole.set(role);
    this.document.body.classList.add('is-projection-route');
  }

  leaveProjectionRoute(): void {
    this.projectionRole.set(null);
    this.document.body.classList.remove('is-projection-route');
  }

  /** Pantalla completa nativa (requiere gesto del usuario en esta ventana). */
  async requestNative(): Promise<boolean> {
    const el = this.document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const request =
      el.requestFullscreen?.bind(el) ??
      el.webkitRequestFullscreen?.bind(el) ??
      el.msRequestFullscreen?.bind(el);
    if (!request) return false;
    try {
      await request();
      return true;
    } catch {
      return false;
    }
  }

  private async enter(): Promise<void> {
    if (await this.requestNative()) return;
    // API no disponible, permiso denegado o contexto sin fullscreen → respaldo CSS.
    this.activateSimulated();
  }

  private async exit(): Promise<void> {
    if (this.simulatedFullscreen()) {
      this.deactivateSimulated();
      return;
    }
    await this.exitNative();
  }

  private async exitNative(): Promise<void> {
    const doc = this.document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };
    const exit =
      doc.exitFullscreen?.bind(doc) ??
      doc.webkitExitFullscreen?.bind(doc) ??
      doc.msExitFullscreen?.bind(doc);
    if (!exit || !this.document.fullscreenElement) return;
    try {
      await exit();
    } catch {
      /* ya no estaba en pantalla completa */
    }
  }

  /** Permite cerrar el modo simulado con la tecla Escape (la API nativa lo hace sola). */
  exitSimulatedIfActive(): boolean {
    if (this.simulatedFullscreen()) {
      this.deactivateSimulated();
      return true;
    }
    return false;
  }

  private activateSimulated(): void {
    this.simulatedFullscreen.set(true);
    this.document.body.classList.add('is-simulated-fullscreen');
  }

  private deactivateSimulated(): void {
    this.simulatedFullscreen.set(false);
    this.document.body.classList.remove('is-simulated-fullscreen');
  }
}
