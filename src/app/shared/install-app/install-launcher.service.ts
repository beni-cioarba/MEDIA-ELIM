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
import { InstallOutcome, PwaInstallService } from '../../core/services/pwa-install.service';
import { UiStore } from '../../core/state/ui.store';
import { TelemetryService } from '../../core/telemetry/telemetry.service';
import type { InstallSheetComponent } from './install-sheet.component';

/**
 * **El único camino para instalar**, se pulse donde se pulse (pie, menú del
 * teléfono, invitación, Împreună, tarjeta del aviso):
 *
 *  · Con diálogo nativo (Chromium) → se lanza: es la hoja del navegador, con
 *    la descripción y las láminas del manifiesto.
 *  · Sin él → nuestra hoja, con los pasos de *ese* navegador y las mismas
 *    láminas. Se descarga al abrirla (componente y textos).
 */
@Injectable({ providedIn: 'root' })
export class InstallLauncher {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly packs = inject(TranslationPackService);
  private readonly pwa = inject(PwaInstallService);
  private readonly telemetry = inject(TelemetryService);
  private readonly ui = inject(UiStore);

  private current: ComponentRef<InstallSheetComponent> | null = null;
  private loading: Promise<Type<InstallSheetComponent>> | null = null;

  private readonly _busy = signal(false);
  /** Diálogo nativo abierto o nuestra hoja descargándose. */
  readonly busy = this._busy.asReadonly();

  async start(opener?: HTMLElement | null): Promise<InstallOutcome> {
    if (this._busy()) return 'dismissed';
    const back = opener ?? (this.document.activeElement as HTMLElement | null);
    this._busy.set(true);
    try {
      // Primero el nativo y sin nada por medio: exige el gesto de la persona.
      const outcome = await this.pwa.install();
      if (outcome === 'guide') await this.openSheet(back);
      return outcome;
    } finally {
      this._busy.set(false);
    }
  }

  private async openSheet(back: HTMLElement | null): Promise<void> {
    if (this.current) return;
    const component = await this.load();
    this.ui.closeAll();
    this.telemetry.event('instalare-pasi');
    const ref = createComponent(component, { environmentInjector: this.injector });
    this.current = ref;
    ref.instance.closed.subscribe(() => {
      if (this.current !== ref) return;
      this.current = null;
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      // Quien abrió puede haber desaparecido (la invitación, o «ya la tengo»).
      const target = back?.isConnected ? back : this.document.getElementById('main-content');
      target?.focus({ preventScroll: true });
    });
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);
    ref.changeDetectorRef.detectChanges();
  }

  private load(): Promise<Type<InstallSheetComponent>> {
    this.loading ??= Promise.all([
      import('./install-sheet.component'),
      // Los textos, con la hoja: nunca se pinta una clave.
      this.packs.load('install', routePackLoader('install')),
    ]).then(
      ([module]) => module.InstallSheetComponent,
      (error: unknown) => {
        this.loading = null;
        throw error;
      },
    );
    return this.loading;
  }
}
