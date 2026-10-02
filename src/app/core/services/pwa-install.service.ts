import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { detectInstallEnvironment, InstallEnvironment } from '../util/install-platform';

/**
 * Evento de Chromium (no estándar, sin tipos en `lib.dom`). Guardarlo permite
 * lanzar el diálogo nativo de instalación cuando la persona lo pida.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** Resultado de pulsar «Instalar». */
export type InstallOutcome = 'accepted' | 'dismissed' | 'guide';

/**
 * Global que rellena el script en línea de `index.html`: el evento puede
 * llegar antes de que arranque Angular y, sobre todo, antes de que se monte
 * el pie (que entra con `@defer`). Sin esta captura temprana se perdería.
 */
declare global {
  interface Window {
    __elimInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

/** Marca de «ya instalada» desde este navegador (Chromium la anuncia con `appinstalled`). */
const INSTALLED_KEY = 'elim.pwa.installedAt';
/**
 * La marca caduca: si alguien desinstala, el navegador no avisa. Pasado este
 * plazo se vuelve a ofrecer (y si sigue instalada, Chromium no dispara
 * `beforeinstallprompt` y el control se queda oculto igualmente).
 */
const INSTALLED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Modos de visualización que significan «abierta como aplicación». */
const APP_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

/**
 * Estado de instalación de la web como aplicación (PWA).
 *
 * Responde a una sola pregunta para la interfaz: **¿tiene sentido ofrecer
 * «Instalar» a quien está mirando?** Y, si lo pulsa, a cómo se instala ahí.
 *
 *  - **Ya es la app** (abierta desde el icono, en cualquier sistema) → no.
 *  - **Chromium con aviso nativo** guardado → sí, en un toque (escritorio
 *    incluido: si Chrome lo ofrece es que la web es instalable y no lo está).
 *  - **Móvil o tableta sin aviso nativo** (iOS, Firefox, Samsung, apps con
 *    navegador integrado…) → sí, con instrucciones de esa plataforma.
 *  - **Safari de macOS ≥ 17** → sí, con instrucciones («Añadir al Dock»).
 *  - Escritorio sin instalación posible (Firefox…) → no.
 *
 * Límite conocido e inevitable: **iOS no deja saber desde Safari si la app ya
 * está en la pantalla de inicio**. Allí el control se sigue ofreciendo en el
 * navegador; dentro de la app instalada (modo standalone) nunca aparece.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  /** Plataforma de quien mira (pura, calculada una vez). */
  readonly env: InstallEnvironment = detectInstallEnvironment(
    this.window?.navigator.userAgent ?? '',
    this.window?.navigator.maxTouchPoints ?? 0,
  );

  private readonly deferred = signal<BeforeInstallPromptEvent | null>(
    this.window?.__elimInstallPrompt ?? null,
  );
  private readonly standalone = signal(this.isStandalone());
  private readonly installed = signal(this.readInstalledMark());

  /** El navegador ofrece su diálogo de instalación (Chromium). */
  readonly canPromptNatively = computed(() => this.deferred() !== null);

  /** Mostrar el control «Instalar». */
  readonly available = computed(() => {
    if (this.standalone()) return false;
    if (this.deferred()) return true;
    if (this.installed()) return false;
    const { device, platform } = this.env;
    if (platform === 'mac-safari') return true;
    // En escritorio Chromium sin aviso = ya instalada o no instalable.
    return device !== 'desktop' && platform !== 'desktop-chromium' && platform !== 'unsupported';
  });

  constructor() {
    const win = this.window;
    if (!win) return;

    win.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      // Si Chromium lo vuelve a ofrecer, la marca de «instalada» era vieja.
      this.clearInstalledMark();
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
    win.addEventListener('appinstalled', () => this.markInstalled());

    for (const mode of APP_DISPLAY_MODES) {
      win.matchMedia?.(`(display-mode: ${mode})`).addEventListener?.('change', () =>
        this.standalone.set(this.isStandalone()),
      );
    }
  }

  /**
   * Instala con el diálogo nativo si lo hay; si no, devuelve `'guide'` para
   * que la interfaz muestre las instrucciones de la plataforma.
   */
  async install(): Promise<InstallOutcome> {
    const event = this.deferred();
    if (!event) return 'guide';
    // El aviso nativo sólo se puede usar una vez.
    this.deferred.set(null);
    if (this.window) this.window.__elimInstallPrompt = null;
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'accepted') this.markInstalled();
      return outcome;
    } catch {
      // Chromium rechaza `prompt()` si ya se usó o si la web dejó de ser
      // instalable: se cae a las instrucciones manuales.
      return 'guide';
    }
  }

  private isStandalone(): boolean {
    const win = this.window;
    if (!win) return false;
    const nav = win.navigator as Navigator & { standalone?: boolean };
    return (
      nav.standalone === true ||
      APP_DISPLAY_MODES.some((mode) => win.matchMedia?.(`(display-mode: ${mode})`).matches) ||
      this.document.referrer.startsWith('android-app://')
    );
  }

  private markInstalled(): void {
    this.deferred.set(null);
    this.installed.set(true);
    try {
      this.window?.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    } catch {
      /* almacenamiento bloqueado: basta con el estado en memoria */
    }
  }

  private clearInstalledMark(): void {
    this.installed.set(false);
    try {
      this.window?.localStorage.removeItem(INSTALLED_KEY);
    } catch {
      /* almacenamiento bloqueado */
    }
  }

  private readInstalledMark(): boolean {
    try {
      const at = Number(this.window?.localStorage.getItem(INSTALLED_KEY));
      return Number.isFinite(at) && at > 0 && Date.now() - at < INSTALLED_TTL_MS;
    } catch {
      return false;
    }
  }
}
