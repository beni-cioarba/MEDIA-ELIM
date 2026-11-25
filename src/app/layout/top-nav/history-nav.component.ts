import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WindowHistoryService } from '../../core/navigation/window-history.service';
import { injectIsBrowser } from '../../core/util/platform';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Flechas atrás / adelante de la app instalada en escritorio. Cuándo salen lo
 * decide `WindowHistoryService`; dónde van, la cabecera (`top-nav`).
 *
 * `aria-disabled` y no `disabled`: al llegar al principio del historial el
 * botón pulsado perdería el foco y quien va con teclado volvería al inicio.
 */
@Component({
  selector: 'app-history-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    <button
      type="button"
      class="history-btn"
      [attr.aria-disabled]="history.canGoBack() ? null : 'true'"
      [attr.aria-label]="'nav.back' | translate"
      [title]="('nav.back' | translate) + ' (' + keys.back + ')'"
      (click)="history.back()"
    >
      <app-icon name="arrow-left" [strokeWidth]="2" />
    </button>
    <button
      type="button"
      class="history-btn history-btn--forward"
      [attr.aria-disabled]="history.canGoForward() ? null : 'true'"
      [attr.aria-label]="'nav.forward' | translate"
      [title]="('nav.forward' | translate) + ' (' + keys.forward + ')'"
      (click)="history.forward()"
    >
      <app-icon name="arrow-right" [strokeWidth]="2" />
    </button>
  `,
  styleUrl: './history-nav.component.scss',
  host: { role: 'group' },
})
export class HistoryNavComponent {
  protected readonly history = inject(WindowHistoryService);

  /** El atajo del sistema, que funciona igual sin barra de navegador. */
  protected readonly keys =
    injectIsBrowser() && /Macintosh/.test(navigator.userAgent)
      ? { back: '⌘ [', forward: '⌘ ]' }
      : { back: 'Alt + ←', forward: 'Alt + →' };
}
