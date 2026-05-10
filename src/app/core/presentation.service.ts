import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal, computed } from '@angular/core';

/**
 * Encapsula la Fullscreen API del navegador para usar la web como
 * presentación en la pantalla de la iglesia.
 *
 * Si la API nativa no está disponible o el navegador rechaza el permiso
 * (p. ej. iframes sin `allow="fullscreen"`, navegadores móviles que
 * lo restringen, o usuarios que han denegado el permiso), se activa un
 * modo "simulated fullscreen" puramente CSS que ocupa todo el viewport
 * y oculta cualquier scroll del documento. Visualmente el resultado es
 * el mismo en el monitor de proyección.
 *
 * Expone:
 *  - `isFullscreen`     → true si el modo presentación está activo (real o simulado).
 *  - `isSimulated`      → true sólo cuando el modo activo es el fallback CSS.
 */
@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly document = inject(DOCUMENT);

  private readonly nativeFullscreen = signal<boolean>(false);
  private readonly simulatedFullscreen = signal<boolean>(false);

  readonly isFullscreen = computed(
    () => this.nativeFullscreen() || this.simulatedFullscreen(),
  );
  readonly isSimulated = this.simulatedFullscreen.asReadonly();

  constructor() {
    // Mantener la signal sincronizada con el estado real del navegador,
    // incluyendo cuando el usuario sale con la tecla Escape.
    const onChange = () => this.nativeFullscreen.set(!!this.document.fullscreenElement);
    this.document.addEventListener('fullscreenchange', onChange);
    this.document.addEventListener('webkitfullscreenchange', onChange);
  }

  async toggle(): Promise<void> {
    if (this.isFullscreen()) {
      await this.exit();
      return;
    }
    await this.enter();
  }

  private async enter(): Promise<void> {
    const el = this.document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const request =
      el.requestFullscreen?.bind(el) ??
      el.webkitRequestFullscreen?.bind(el) ??
      el.msRequestFullscreen?.bind(el);

    if (!request) {
      this.activateSimulated();
      return;
    }
    try {
      await request();
    } catch {
      // Permiso denegado o contexto que no permite fullscreen → fallback CSS.
      this.activateSimulated();
    }
  }

  private async exit(): Promise<void> {
    if (this.simulatedFullscreen()) {
      this.deactivateSimulated();
      return;
    }
    const doc = this.document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };
    const exit =
      doc.exitFullscreen?.bind(doc) ??
      doc.webkitExitFullscreen?.bind(doc) ??
      doc.msExitFullscreen?.bind(doc);
    if (exit) {
      try { await exit(); } catch { /* ignore */ }
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

