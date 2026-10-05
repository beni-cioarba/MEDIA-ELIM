import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { IconName } from '../../../core/ui/icon-name';

/**
 * Formato que el navegador no sabe mostrar (presentaciones, comprimidos…):
 * aviso claro y las dos salidas útiles, descargar o abrir en otra pestaña.
 */
@Component({
  selector: 'app-unsupported-engine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="state">
      <app-icon class="state__icon" [name]="icon()" />
      <p class="title">{{ 'doc_viewer.unsupported_title' | translate }}</p>
      <p class="name">{{ name() }}</p>
      <p>{{ 'doc_viewer.unsupported_text' | translate }}</p>
      <div class="actions">
        <button type="button" class="action action--primary" (click)="download.emit()">
          <app-icon name="download" /> {{ 'doc_viewer.download' | translate }}
        </button>
        <button type="button" class="action" (click)="openTab.emit()">
          <app-icon name="external" /> {{ 'doc_viewer.open_tab' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: `
    @use 'engine' as *;
    @include engine-host;
    @include engine-state;

    .title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--dv-fg);
    }

    .name {
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 0.8125rem;
      word-break: break-all;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class UnsupportedEngineComponent {
  readonly name = input.required<string>();
  readonly icon = input<IconName>('file');
  readonly download = output<void>();
  readonly openTab = output<void>();
}
