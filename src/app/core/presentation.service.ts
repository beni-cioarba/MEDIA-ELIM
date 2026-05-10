import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/**
 * Encapsula la Fullscreen API del navegador para usar la web como
 * presentación en la pantalla de la iglesia.
 *
 * Expone una signal `isFullscreen` para que los componentes reaccionen
 * de forma declarativa a los cambios de estado.
 */
@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly document = inject(DOCUMENT);

  readonly isFullscreen = signal<boolean>(false);

  constructor() {
    // Mantener la signal sincronizada con el estado real del navegador,
    // incluyendo cuando el usuario sale con la tecla Escape.
    this.document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!this.document.fullscreenElement);
    });
  }

  async toggle(): Promise<void> {
    if (this.document.fullscreenElement) {
      await this.document.exitFullscreen();
    } else {
      await this.document.documentElement.requestFullscreen();
    }
  }
}
