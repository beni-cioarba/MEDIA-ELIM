import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { censusEvent, resolveInstallState } from '../install/install-state';
import { detectInstallEnvironment, InstallEnvironment } from '../util/install-platform';
import { LanguageService } from './language.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { injectIsBrowser } from '../util/platform';

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

/** Chromium (sin tipos en `lib.dom`): apps de `related_applications` ya instaladas. */
interface RelatedAppsNavigator extends Navigator {
  getInstalledRelatedApps?(): Promise<readonly unknown[]>;
}

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

/** Marca de «ya instalada»: anunciada por el navegador, abierta como app o dicha por la persona. */
const INSTALLED_KEY = 'elim.pwa.installedAt';
/**
 * La marca caduca: si alguien desinstala, el navegador no avisa. Cada vez que
 * se abre como app se renueva, y en Chromium un `beforeinstallprompt` la borra
 * antes. Medio año: en iPhone es lo único que se sabe, y volver a ofrecer cada
 * mes lo que ya se ha dicho que se tiene, cansa.
 */
const INSTALLED_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Modos de visualización que significan «abierta como aplicación». Sin
 * `fullscreen`: también lo cumple una pestaña normal a pantalla completa (F11,
 * la proyección), y el manifiesto pide `standalone`.
 */
const APP_DISPLAY_MODES = ['standalone', 'minimal-ui', 'window-controls-overlay'];

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
 *  - **Safari de macOS ≥ 17** y **Firefox ≥ 143 en Windows** → sí, con
 *    instrucciones («Añadir al Dock», «Añadir a la barra de tareas»).
 *  - Escritorio sin instalación posible → no.
 *  - **Instalada, pero abierta en el navegador**: Chromium lo dice
 *    (`getInstalledRelatedApps`, con `related_applications` del manifiesto, o
 *    la marca que deja haberla abierto como app) → no.
 *
 * Qué se sabe de cada uno lo decide `resolveInstallState` (`state`).
 *
 * Límite conocido e inevitable: **iOS no deja saber desde Safari si la app ya
 * está en la pantalla de inicio**. Allí el control se sigue ofreciendo en el
 * navegador; dentro de la app instalada (modo standalone) nunca aparece.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly telemetry = inject(TelemetryService);
  private readonly language = inject(LanguageService);
  // En el prerender, como si no hubiera ventana: el DOM del servidor tiene
  // `matchMedia` pero lanza «NotYetImplemented».
  private readonly window = injectIsBrowser() ? this.document.defaultView : null;

  /** Plataforma de quien mira (pura, calculada una vez). */
  readonly env: InstallEnvironment = detectInstallEnvironment(
    this.window?.navigator.userAgent ?? '',
    this.window?.navigator.maxTouchPoints ?? 0,
  );

  private readonly deferred = signal<BeforeInstallPromptEvent | null>(
    this.window?.__elimInstallPrompt ?? null,
  );
  private readonly standalone = signal(this.isStandalone());
  private readonly marked = signal(this.readInstalledMark());
  private readonly related = signal<boolean | null>(null);
  private readonly installedNow = signal(false);

  /** Se ha instalado en esta misma carga. */
  readonly justInstalled = this.installedNow.asReadonly();

  /** Lo que da el navegador en esta carga, sin nada guardado. */
  private readonly signals = computed(() => ({
    standalone: this.standalone(),
    justInstalled: this.installedNow(),
    prompt: this.deferred() !== null,
    related: this.related(),
  }));

  /** El detector: ¿la tiene quien está mirando? */
  readonly state = computed(() => resolveInstallState({ ...this.signals(), marked: this.marked() }));

  /** Primera respuesta de `getInstalledRelatedApps` (o que no existe). */
  readonly checked: Promise<void>;

  /** El navegador ofrece su diálogo de instalación (Chromium). */
  readonly canPromptNatively = computed(() => this.deferred() !== null);

  /** Mostrar el control «Instalar». */
  readonly available = computed(() => {
    if (this.deferred() && !this.standalone()) return true;
    const state = this.state();
    if (state === 'app' || state === 'installed') return false;
    const { device, platform } = this.env;
    if (platform === 'mac-safari' || platform === 'desktop-firefox') return true;
    // En escritorio Chromium sin aviso = ya instalada o no instalable.
    return device !== 'desktop' && platform !== 'desktop-chromium' && platform !== 'unsupported';
  });

  constructor() {
    const win = this.window;
    if (!win) {
      this.checked = Promise.resolve();
      return;
    }

    // En Chromium la pestaña comparte almacenamiento con la app: así el
    // navegador sabe que se ha abierto como tal.
    if (this.standalone()) this.saveInstalledMark();

    win.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      // Si Chromium lo vuelve a ofrecer, la marca de «instalada» era vieja.
      this.clearInstalledMark();
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
    win.addEventListener('appinstalled', () => this.recordInstall());
    this.checked = this.standalone() ? Promise.resolve() : this.detectInstalled();
    // Instalada desde el menú del navegador, o desinstalada, mientras no se miraba.
    this.document.addEventListener('visibilitychange', () => {
      if (!this.document.hidden && !this.standalone()) void this.detectInstalled();
    });

    for (const mode of APP_DISPLAY_MODES) {
      win.matchMedia?.(`(display-mode: ${mode})`).addEventListener?.('change', () => {
        // Entrar en pantalla completa cambia el modo, no la ventana.
        if (!win.matchMedia('(display-mode: fullscreen)').matches) this.standalone.set(this.isStandalone());
      });
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
      if (outcome === 'accepted') {
        // Se instala en el idioma que se está viendo: que se abra en él.
        this.language.remember();
        this.recordInstall();
      } else {
        this.telemetry.event('instalare-refuzata');
      }
      return outcome;
    } catch {
      // Chromium rechaza `prompt()` si ya se usó o si la web dejó de ser
      // instalable: se cae a las instrucciones manuales.
      return 'guide';
    }
  }

  /**
   * «Ya la tengo»: en iOS (y en cualquier navegador que no lo anuncie) sólo lo
   * sabe la persona. Deja de ofrecerse durante el plazo de la marca. No es una
   * instalación contada: es otro evento.
   */
  confirmInstalled(): void {
    this.telemetry.event('app-declarata');
    this.saveInstalledMark();
  }

  /** Nombre del evento anónimo de esta carga (`InstallCensusService`). */
  census(): string {
    return censusEvent(this.signals(), this.env);
  }

  /** Chromium: ¿está instalada aunque se esté mirando en el navegador? */
  private async detectInstalled(): Promise<void> {
    const nav = this.window?.navigator as RelatedAppsNavigator | undefined;
    if (!nav?.getInstalledRelatedApps) return;
    try {
      // Sólo en memoria: se vuelve a preguntar en cada carga.
      this.related.set((await nav.getInstalledRelatedApps()).length > 0);
    } catch {
      /* fuera del ámbito o sin permiso: como si no se supiera */
    }
  }

  private isStandalone(): boolean {
    const win = this.window;
    if (!win) return false;
    const nav = win.navigator as Navigator & { standalone?: boolean };
    // El referente `android-app://` no vale: lo puede poner cualquier app de
    // Android que abre un enlace (es la pista de las TWA, que aquí no hay).
    return (
      nav.standalone === true ||
      APP_DISPLAY_MODES.some((mode) => win.matchMedia?.(`(display-mode: ${mode})`).matches)
    );
  }

  /** Instalada de verdad. Al aceptar el diálogo llega además `appinstalled`: se cuenta una vez. */
  private recordInstall(): void {
    if (!this.installedNow()) this.telemetry.event('app-instalata');
    this.installedNow.set(true);
    this.deferred.set(null);
    this.saveInstalledMark();
  }

  private saveInstalledMark(): void {
    this.marked.set(true);
    try {
      this.window?.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    } catch {
      /* almacenamiento bloqueado: basta con el estado en memoria */
    }
  }

  private clearInstalledMark(): void {
    this.marked.set(false);
    this.installedNow.set(false);
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
