import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { routePackLoader } from '../../core/i18n/route-packs';
import { TranslationPackService } from '../../core/i18n/translation-pack.service';
import { InstallInviteService } from '../../core/install/install-invite.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { InstallLauncher } from '../../shared/install-app/install-launcher.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Lo que el dock flotante se aparta (contrato `--dock-offset`, ver `floating-actions`). */
const DOCK_VAR = '--dock-offset';

/**
 * Invitación a instalar (teléfono y tableta): tarjeta baja, **no modal**, que
 * no roba el foco ni bloquea la página. Se cierra con la cruz o con `Esc` (con
 * el foco dentro) y se acuerda. Cuándo sale: `core/install/invite-policy.ts`.
 *
 * `MainLayoutComponent` la monta con `@defer (on idle)`, fuera de la
 * presentación y del arranque.
 */
@Component({
  selector: 'app-install-invite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './install-invite.component.html',
  styleUrl: './install-invite.component.scss',
})
export class InstallInviteComponent {
  private readonly document = inject(DOCUMENT);
  private readonly packs = inject(TranslationPackService);
  private readonly launcher = inject(InstallLauncher);
  protected readonly invite = inject(InstallInviteService);
  protected readonly native = inject(PwaInstallService).canPromptNatively;

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  /** Los textos llegan con la tarjeta: hasta entonces no se pinta. */
  protected readonly ready = signal(false);

  constructor() {
    effect(() => {
      if (!this.invite.visible() || this.ready()) return;
      this.packs.load('install', routePackLoader('install')).then(
        () => this.ready.set(true),
        () => undefined,
      );
    });

    // El dock flotante se sube lo que ocupa la tarjeta, y vuelve al cerrarse.
    effect((onCleanup) => {
      const card = this.card()?.nativeElement;
      const body = this.document.body;
      if (!card) return;
      const observer = new ResizeObserver(() => {
        const height = Math.ceil(card.getBoundingClientRect().height);
        // Escondida (índice de documento abierto): manda el hueco de la página.
        if (height) body.style.setProperty(DOCK_VAR, `${height}px`);
        else body.style.removeProperty(DOCK_VAR);
      });
      observer.observe(card);
      onCleanup(() => {
        observer.disconnect();
        body.style.removeProperty(DOCK_VAR);
      });
    });
  }

  protected async install(): Promise<void> {
    this.invite.accept();
    // La tarjeta se va: el foco vuelve al contenido al cerrar la hoja.
    const outcome = await this.launcher.start(this.document.getElementById('main-content'));
    if (outcome === 'dismissed') this.invite.declined();
  }
}
