import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { ViewerDocument } from '../core/viewer-document.model';

/**
 * Motor de vídeo y audio: el reproductor nativo del navegador. Si el formato
 * no se puede reproducir, se ofrece la descarga.
 */
@Component({
  selector: 'app-media-engine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (failed()) {
      <div class="state state--error" role="alert">
        <app-icon class="state__icon" [name]="video() ? 'film' : 'music'" />
        <p>{{ 'doc_viewer.error_media' | translate }}</p>
        <button type="button" class="action action--primary" (click)="download.emit()">
          <app-icon name="download" /> {{ 'doc_viewer.download' | translate }}
        </button>
      </div>
    } @else {
      <div class="media">
        @if (video()) {
          <video controls preload="metadata" [src]="document().src" (error)="failed.set(true)"></video>
        } @else {
          <audio controls preload="metadata" [src]="document().src" (error)="failed.set(true)"></audio>
        }
      </div>
    }
  `,
  styles: `
    @use 'engine' as *;
    @include engine-host;
    @include engine-state;

    .media {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 1.5rem;
    }

    video {
      max-width: 100%;
      max-height: 100%;
    }

    audio {
      width: min(90%, 30rem);
    }
  `,
})
export class MediaEngineComponent {
  readonly document = input.required<ViewerDocument>();
  readonly video = input(true);
  readonly download = output<void>();

  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      this.document();
      this.failed.set(false);
    });
  }
}
