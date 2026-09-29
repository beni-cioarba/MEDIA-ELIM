import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';
import { PresentationDisplayService } from '../../../../core/services/presentation-display.service';
import type { IconName } from '../../../../core/ui/icon-name';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { QrPanelComponent } from '../../../../shared/qr-panel/qr-panel.component';

/** Una sección de la web que se anuncia en la diapositiva. */
interface WebsiteSection {
  readonly icon: IconName;
  readonly labelKey: string;
}

/**
 * Lo que se encuentra en la web: la razón para escanear el código. Son las
 * secciones que se proyectan (y alguna que sólo vive en la web).
 */
const SECTIONS: readonly WebsiteSection[] = [
  { icon: 'megaphone', labelKey: 'nav.announcements' },
  { icon: 'calendar', labelKey: 'nav.weekly' },
  { icon: 'sparkles', labelKey: 'nav.upcoming' },
  { icon: 'family', labelKey: 'nav.family_prayer' },
  { icon: 'pray', labelKey: 'nav.prayer_causes' },
  { icon: 'book', labelKey: 'nav.bible' },
];

/**
 * Diapositiva «Toate informațiile, pe site»: **el QR como bloque propio**.
 *
 * Antes el QR ocupaba una columna fija en todas las diapositivas (28 % del
 * ancho, todo el tiempo) y el contenido se apretaba en lo que quedaba. Ahora
 * es una diapositiva más del carrusel, que el operador enciende o apaga como
 * cualquier bloque: cuando sale, el código es enorme y se escanea desde el
 * fondo; cuando no, cada diapositiva tiene el lienzo entero.
 *
 * Con el aviso de directo (panel de control) la diapositiva suma un segundo
 * código, al directo del canal, con la invitación a compartirlo.
 */
@Component({
  selector: 'app-website-block',
  imports: [TranslatePipe, IconComponent, QrPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './website-block.component.html',
  styleUrl: './website-block.component.scss',
})
export class WebsiteBlockComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly display = inject(PresentationDisplayService);

  protected readonly sections = SECTIONS;
  protected readonly siteUrl = this.config.publicUrl;
  protected readonly liveUrl = this.config.youtubeLiveUrl;

  /** «beni-cioarba.github.io/MEDIA-ELIM»: la dirección legible, sin protocolo. */
  protected readonly siteLabel = this.config.publicUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  protected readonly live = this.display.liveNotice;

  /** `@ElimArganda`, para quien prefiera buscar el canal a escanear. */
  protected readonly youtubeHandle = computed(() => this.config.youtubeChannelUrl.split('/').pop() ?? '');
}
