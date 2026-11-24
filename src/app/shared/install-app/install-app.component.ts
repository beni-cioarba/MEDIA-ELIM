import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { IconComponent } from '../icon/icon.component';
import { InstallLauncher } from './install-launcher.service';

/**
 * Botón «Instalează» del pie. Sólo se pinta si instalar tiene sentido
 * (`PwaInstallService.available()`); qué pasa al pulsarlo —diálogo del
 * navegador o nuestra hoja— lo decide `InstallLauncher`.
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
  protected readonly launcher = inject(InstallLauncher);
}
