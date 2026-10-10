import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { CHURCH_CONFIG, displayAddress } from '../../../../core/church.config';
import { SocialLink } from '../../../../core/social-link.model';
import { YouTubeService } from '../../../../core/youtube.service';
import { PresentationService } from '../../../../core/presentation.service';
import { SocialIconComponent } from '../../../../shared/social-icon/social-icon.component';
import { CopyButtonComponent } from '../../../../shared/copy-button/copy-button.component';

/**
 * Un QR por red sólo tiene sentido donde hay un móvil *aparte* de la pantalla:
 * escritorio con ratón y sitio para dibujarlo. En un teléfono el visitante ya
 * está en el dispositivo que lo escanearía.
 */
const QR_MEDIA = '(hover: hover) and (pointer: fine) and (min-width: 64rem)';

/** Tope de columnas en la fila ancha: más fichas por fila dejan el @handle sin sitio. */
const MAX_WIDE_COLUMNS = 4;

/**
 * Columnas de la fila ancha para `count` redes: todas en una fila si caben;
 * si no, el reparto con menos huecos en la última fila (6 → 3 + 3, no 4 + 2).
 */
function wideColumnsFor(count: number): number {
  if (count <= MAX_WIDE_COLUMNS) return Math.max(count, 1);
  let best = MAX_WIDE_COLUMNS;
  let bestGaps = Infinity;
  for (let cols = MAX_WIDE_COLUMNS; cols >= 3; cols--) {
    const gaps = (cols - (count % cols)) % cols;
    if (gaps < bestGaps) {
      best = cols;
      bestGaps = gaps;
    }
  }
  return best;
}

/**
 * Bloque «Redes sociales».
 *
 * Dos maquetaciones con marcado propio, porque resuelven tareas distintas:
 *  - **Web**: fichas en una fila (`.nets`), con el @handle como protagonista,
 *    botón de copiar y, en escritorio, un QR por red para seguirla desde el
 *    móvil. Estilos en la hoja del componente.
 *  - **Proyección**: tarjetas `.card` con el handle gigante y nada pulsable;
 *    la estilizan `stage.component.scss` y `styles/_projection.scss`. Cierra
 *    la lista una tarjeta con la web (`elimarganda.com`), sólo aquí: en la web
 *    ya se está en ella.
 *
 * Sin movimiento propio: ni resaltado rotatorio en la web ni animaciones en
 * proyección (el carrusel ya aporta el movimiento).
 *
 * Reutilizable: no depende del carrusel, sólo de `CHURCH_CONFIG`.
 */
@Component({
    selector: 'app-socials-block',
    imports: [TranslatePipe, SocialIconComponent, CopyButtonComponent, QRCodeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './socials-block.component.html',
    styleUrl: './socials-block.component.scss',
})
export class SocialsBlockComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly youtube = inject(YouTubeService);
  protected readonly presentation = inject(PresentationService);
  private readonly translate = inject(TranslateService);

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** Mismas tintas que el QR del escenario (`QrPanelComponent`). */
  protected readonly QR_INK = '#1a365d';
  protected readonly QR_PAPER = '#ffffff';

  protected readonly wideColumns = wideColumnsFor(this.config.socials.length);

  /** Proyección: la web como última tarjeta (`elimarganda.com`). */
  protected readonly siteAddress = displayAddress(this.config.publicUrl);

  /** ¿Se dibuja el QR de cada red? (escritorio con ratón, ver `QR_MEDIA`). */
  protected readonly showQr = signal(false);

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
    if (typeof matchMedia === 'function') {
      const mq = matchMedia(QR_MEDIA);
      const sync = () => this.showQr.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
      inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', sync));
    }
  }

  /** ¿Es la red de YouTube y hay emisión en directo? */
  protected isLive(link: SocialLink): boolean {
    return link.icon === 'youtube' && !!this.youtube.liveStream();
  }

  /** URL legible bajo el QR: sin protocolo, `www.` ni barra final. */
  protected displayUrl(link: SocialLink): string {
    return link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }

  /** Durante un directo, YouTube lleva a la emisión y no al canal. */
  protected href(link: SocialLink): string {
    return this.isLive(link) ? this.youtube.liveStream()!.url : link.url;
  }
}
