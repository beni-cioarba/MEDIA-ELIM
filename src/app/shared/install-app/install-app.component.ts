import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { IconName } from '../../core/ui/icon-name';
import { iosBrowserOf } from '../../core/util/install-platform';
import { IconComponent } from '../icon/icon.component';

/** Un paso de las instrucciones: texto (con `<b>` del propio diccionario) y el glifo a buscar. */
interface InstallStep {
  readonly key: string;
  readonly icon?: IconName;
}

/**
 * «Instalar la app» — control del pie + hoja de instrucciones.
 *
 * ── Comportamiento ────────────────────────────────────────────────────
 * Sólo se pinta si `PwaInstallService.available()` (no instalada y la
 * plataforma permite instalar). Al pulsar:
 *  · **Chromium** (Android, Windows, macOS, ChromeOS): diálogo nativo del
 *    navegador, un toque y listo.
 *  · **Resto**: hoja con los pasos exactos de *ese* navegador y los mismos
 *    glifos que la persona tiene que buscar en su pantalla (Compartir de
 *    Apple, ⋮, ☰…). En los navegadores integrados (Instagram, WhatsApp…)
 *    explica cómo salir al navegador real y ofrece copiar el enlace; en
 *    Android, además, abrir directamente en Chrome.
 *
 * ── Por qué `<dialog>` nativo y no MatDialog/CDK ──────────────────────
 * `showModal()` ya da capa superior, foco atrapado, `Esc`, `inert` del resto
 * de la página y fondo propio (`::backdrop`), sin arrastrar el CDK al chunk
 * diferido del pie. Funciona en todos los navegadores objetivo (Safari ≥ 15.4).
 */
@Component({
  selector: 'app-install-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './install-app.component.html',
  styleUrl: './install-app.component.scss',
})
export class InstallAppComponent {
  protected readonly pwa = inject(PwaInstallService);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('sheet');

  protected readonly busy = signal(false);
  protected readonly copied = signal(false);

  private readonly ua = this.document.defaultView?.navigator.userAgent ?? '';

  /** Navegador integrado: primero hay que salir al navegador real. */
  protected readonly inApp = computed(() => this.pwa.env.platform.endsWith('-inapp'));

  /** Abrir en Chrome desde un WebView de Android (intent con vuelta a la URL si no está Chrome). */
  protected readonly chromeIntent = computed(() => {
    const loc = this.document.location;
    const fallback = encodeURIComponent(loc.href);
    return `intent://${loc.host}${loc.pathname}${loc.search}${loc.hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  });

  /** Pasos según plataforma (y versión de Safari: iOS 26 esconde «Compartir» tras «⋯»). */
  protected readonly steps = computed<readonly InstallStep[]>(() => {
    const { platform, safariVersion } = this.pwa.env;
    const addHome: InstallStep = { key: 'install.step.add_home', icon: 'add-box' };
    const confirm: InstallStep = { key: 'install.step.confirm' };
    switch (platform) {
      case 'ios-safari':
        return (safariVersion ?? 0) >= 26
          ? [
              { key: 'install.step.ios26_more', icon: 'more-horiz' },
              { key: 'install.step.ios_share', icon: 'share-ios' },
              addHome,
              confirm,
            ]
          : [{ key: 'install.step.ios_share_bar', icon: 'share-ios' }, addHome, confirm];
      case 'ios-browser': {
        const browser = iosBrowserOf(this.ua);
        const first: InstallStep =
          browser === 'chrome'
            ? { key: 'install.step.ios_chrome_share', icon: 'share-ios' }
            : browser === 'firefox'
              ? { key: 'install.step.ios_firefox_share', icon: 'menu' }
              : { key: 'install.step.ios_edge_share', icon: 'more-horiz' };
        return [first, addHome, confirm];
      }
      case 'ios-inapp':
        return [
          { key: 'install.step.inapp_open_ios', icon: 'external' },
          { key: 'install.step.inapp_then', icon: 'install-app' },
        ];
      case 'android-inapp':
        return [
          { key: 'install.step.inapp_open_android', icon: 'external' },
          { key: 'install.step.inapp_then', icon: 'install-app' },
        ];
      case 'android-samsung':
        return [
          { key: 'install.step.samsung_menu', icon: 'menu' },
          { key: 'install.step.samsung_add', icon: 'add-box' },
          confirm,
        ];
      case 'android-firefox':
        return [
          { key: 'install.step.android_menu', icon: 'more-vert' },
          { key: 'install.step.firefox_install', icon: 'install-app' },
          confirm,
        ];
      case 'android-chromium':
        return [
          { key: 'install.step.android_menu', icon: 'more-vert' },
          { key: 'install.step.android_install', icon: 'install-app' },
          confirm,
        ];
      case 'mac-safari':
        return [{ key: 'install.step.mac_dock', icon: 'share-ios' }, confirm];
      default:
        return [{ key: 'install.step.desktop', icon: 'install-app' }, confirm];
    }
  });

  protected async install(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const outcome = await this.pwa.install();
      if (outcome === 'guide') this.open();
    } finally {
      this.busy.set(false);
    }
  }

  protected open(): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || dialog.open) return;
    this.copied.set(false);
    dialog.showModal();
  }

  protected close(): void {
    this.dialog()?.nativeElement.close();
  }

  /**
   * Cierre al tocar fuera: con `showModal()` el clic en el `::backdrop` llega
   * al propio `<dialog>`; el contenido va en un hijo, así que basta comparar.
   */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  /** Copiar el enlace (navegadores integrados): `clipboard` sólo en HTTPS, con respaldo. */
  protected async copyLink(): Promise<void> {
    const url = this.document.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = this.document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      this.document.body.appendChild(input);
      input.select();
      this.document.execCommand('copy');
      input.remove();
    }
    this.copied.set(true);
  }
}
