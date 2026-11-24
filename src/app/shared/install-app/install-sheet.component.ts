import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PUBLIC_URL } from '../../core/site';
import { chromeIntent, installSteps, offersChrome } from '../../core/install/install-steps';
import { LanguageService } from '../../core/services/language.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Láminas que enseña la hoja: las mismas del manifiesto (`npm run pwa:install`),
 * en su versión pequeña. El test de `scripts/install-media.test.mjs` comprueba
 * que coinciden con las generadas.
 */
export const SHEET_PLATES = ['acasa', 'program', 'anunturi', 'citire', 'direct'] as const;

/**
 * Hoja de instalación para los navegadores **sin diálogo propio** (iPhone,
 * iPad, Safari de Mac, Firefox, Samsung sin aviso, navegadores integrados).
 *
 * Mismo orden que la hoja de Chrome —icono, nombre, dominio, frase y láminas—
 * con los pasos delante: quien la abre ya ha pulsado «Instalar», y lo que le
 * falta es saber dónde tocar.
 *
 * `<dialog>` nativo: capa superior, foco atrapado, `Esc`, el gesto «atrás» de
 * Android y el resto de la página inerte, sin CDK.
 */
@Component({
  selector: 'app-install-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './install-sheet.component.html',
  styleUrl: './install-sheet.component.scss',
})
export class InstallSheetComponent {
  private readonly pwa = inject(PwaInstallService);
  private readonly document = inject(DOCUMENT);
  private readonly lang = inject(LanguageService).current;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly closed = output<void>();

  protected readonly host = new URL(PUBLIC_URL).host;
  protected readonly copied = signal(false);

  private readonly ua = this.document.defaultView?.navigator.userAgent ?? '';
  protected readonly steps = installSteps(this.pwa.env, this.ua);
  protected readonly chrome = offersChrome(this.pwa.env);
  protected readonly chromeHref = chromeIntent(this.document.location);
  /** Navegador integrado: primero hay que salir al de verdad. */
  protected readonly inApp = this.pwa.env.platform.endsWith('-inapp') || this.chrome === 'only';
  protected readonly phone = this.pwa.env.device !== 'desktop';

  protected readonly plates = computed(() => SHEET_PLATES.map((id) => `assets/pwa/install/${this.lang()}/${id}-thumb.webp`));

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** «Ya la tengo»: deja de ofrecerse aquí (iOS no lo dice). */
  protected done(): void {
    this.pwa.confirmInstalled();
    this.close();
  }

  /** Tocar fuera: el clic en el `::backdrop` llega al propio `<dialog>`. */
  protected onClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  /** `clipboard` sólo existe en HTTPS y no en todos los integrados: con respaldo. */
  protected async copyLink(): Promise<void> {
    const url = this.document.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = this.document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;opacity:0';
      // Dentro del diálogo: fuera, el documento es inerte y no se puede enfocar.
      this.dialog().nativeElement.appendChild(input);
      input.select();
      this.document.execCommand('copy');
      input.remove();
    }
    this.copied.set(true);
  }
}
