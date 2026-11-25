import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InstallInviteService } from '../../core/install/install-invite.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { InstallLauncher } from '../../shared/install-app/install-launcher.service';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Icono «Instalar» de la cabecera (teléfono y tableta): el acceso permanente
 * mientras no la tenga. El aviso lo da a conocer una vez; esto se queda.
 * Desaparece al instalarla o al decir «ya la tengo».
 *
 * Al cerrar el aviso sin instalar late una vez: dice dónde se queda.
 */
@Component({
  selector: 'app-install-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (visible()) {
      <button
        #button
        type="button"
        class="install-btn"
        [class.is-hinting]="invite.hint() > 0"
        aria-haspopup="dialog"
        [disabled]="launcher.busy()"
        [attr.aria-label]="'install.cta_long' | translate"
        [title]="'install.cta_long' | translate"
        (click)="install()"
      >
        <app-icon name="install-app" [strokeWidth]="2" />
        <span class="install-btn__label" aria-hidden="true">{{ 'install.cta' | translate }}</span>
      </button>
    }
  `,
  styleUrl: './install-button.component.scss',
  host: { '[class.is-on]': 'visible()' },
})
export class InstallButtonComponent {
  private readonly pwa = inject(PwaInstallService);
  protected readonly launcher = inject(InstallLauncher);
  protected readonly invite = inject(InstallInviteService);
  private readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');

  protected readonly visible = computed(() => this.pwa.env.device !== 'desktop' && this.pwa.available());

  protected async install(): Promise<void> {
    const outcome = await this.launcher.start(this.button()?.nativeElement);
    if (outcome === 'dismissed') this.invite.declined();
    else if (outcome === 'guide') this.invite.guided();
  }
}
