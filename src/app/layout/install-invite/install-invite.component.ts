import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { routePackLoader } from '../../core/i18n/route-packs';
import { TranslationPackService } from '../../core/i18n/translation-pack.service';
import { InstallCensusService } from '../../core/install/install-census.service';
import { InstallInviteService } from '../../core/install/install-invite.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { IconName } from '../../core/ui/icon-name';
import { InstallLauncher } from '../../shared/install-app/install-launcher.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Lo que el dock flotante se aparta (contrato `--dock-offset`, ver `floating-actions`). */
const DOCK_VAR = '--dock-offset';

/** Lo que se gana, en la bienvenida: tres, y las tres ciertas en todos los sistemas. */
const GAINS: readonly { key: string; icon: IconName }[] = [
  { key: 'install.welcome.gain.tap', icon: 'device-phone' },
  { key: 'install.welcome.gain.full', icon: 'maximize' },
  { key: 'install.welcome.gain.reading', icon: 'bell-ring' },
];

/**
 * Aviso de instalación (teléfono y tableta): tarjeta baja, **no modal**, que no
 * roba el foco ni bloquea la página. Se cierra con la cruz o con `Esc` (con el
 * foco dentro) y se acuerda. Tres formas: bienvenida (con lo que se gana),
 * recordatorio (una frase sobre la página en la que se está) y «ya la tienes».
 * Cuándo sale cada una: `core/install/invite-policy.ts`.
 *
 * `MainLayoutComponent` la monta con `@defer (on idle)`, fuera de la
 * presentación y del arranque; con ella arranca el censo anónimo.
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
  private readonly pwa = inject(PwaInstallService);
  protected readonly invite = inject(InstallInviteService);
  protected readonly native = this.pwa.canPromptNatively;
  protected readonly gains = GAINS;

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  /** Los textos llegan con la tarjeta: hasta entonces no se pinta. */
  protected readonly ready = signal(false);

  private readonly inApp = this.pwa.env.platform.endsWith('-inapp');

  /** «Ya la tengo» sólo donde el navegador no lo sabe; si lo sabe, sobra. */
  protected readonly unknown = computed(() => this.pwa.state() === 'unknown' && !this.inApp);

  /** «telefon» o «tabletă». */
  protected readonly device = `install.device.${this.pwa.env.device}`;

  /** Raíz de los textos de la tarjeta que toca. */
  protected readonly copy = computed(() => {
    const card = this.invite.card();
    // En un navegador integrado no se instala: primero hay que salir de él.
    if (this.inApp) return 'install.inapp';
    return card?.kind === 'reminder' ? `install.reminder.${card.topic}` : `install.${card?.kind ?? 'welcome'}`;
  });

  constructor() {
    inject(InstallCensusService).start();

    effect(() => {
      if (!this.invite.card() || this.ready()) return;
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
    else if (outcome === 'guide') this.invite.guided();
  }
}
