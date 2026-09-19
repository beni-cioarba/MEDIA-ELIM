import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';
import { YouTubeService } from '../../../../core/youtube.service';
import { PresentationService } from '../../../../core/presentation.service';
import { ClockService } from '../../../../core/services/clock.service';
import { SocialIconComponent } from '../../../../shared/social-icon/social-icon.component';

/** Cadencia del resaltado rotatorio entre tarjetas de redes (sólo web pública). */
const HIGHLIGHT_ROTATION_MS = 4_000;

/**
 * Bloque «Redes sociales»: tarjetas enlazadas a los perfiles oficiales.
 *
 * En la web pública un resaltado rota entre las tarjetas para dar vida a la
 * página. En proyección **no**: el carrusel ya aporta movimiento y cualquier
 * animación extra distrae durante el culto, así que el temporizador se salta
 * los ticks mientras la presentación está activa.
 *
 * Las tarjetas son neutras (superficie clara + icono en el navy de la marca):
 * el color corporativo de cada red vive sólo en el pie de la web pública.
 *
 * Reutilizable: no depende del carrusel, sólo de `CHURCH_CONFIG`.
 */
@Component({
  selector: 'app-socials-block',
  standalone: true,
  imports: [TranslateModule, SocialIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './socials-block.component.html',
  styles: [':host { display: contents; }'],
})
export class SocialsBlockComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly youtube = inject(YouTubeService);
  protected readonly presentation = inject(PresentationService);
  private readonly translate = inject(TranslateService);
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** Índice de la tarjeta resaltada actualmente. */
  protected readonly highlightedIndex = signal<number>(0);

  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  /** Aria-label pre-traducido por red (se recomputa al cambiar de idioma). */
  protected readonly socialAria = computed<Record<string, string>>(() => {
    this.langChange();
    const out: Record<string, string> = {};
    for (const social of this.config.socials) {
      const name = this.translate.instant(`socials.items.${social.i18nKey}.name`);
      out[social.id] = this.translate.instant('socials.open_aria', { name });
    }
    return out;
  });

  constructor() {
    const timer = setInterval(() => {
      if (!this.clock.pageVisible() || this.fullscreen()) return;
      const total = this.config.socials.length;
      if (total === 0) return;
      this.highlightedIndex.update((i) => (i + 1) % total);
    }, HIGHLIGHT_ROTATION_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
