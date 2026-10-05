import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';
import { ViewerDocument } from '../core/viewer-document.model';

/** Más que esto no se pinta como texto (se ofrece descargar). */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Motor de texto plano (txt, md, csv, json…): el contenido tal cual, en
 * monoespaciada, con ajuste de línea conmutable desde la barra. Ficheros
 * enormes no se cargan: congelarían la pestaña.
 */
@Component({
  selector: 'app-text-engine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="state" role="status">
          <span class="spinner"></span>
          <p>{{ 'doc_viewer.loading' | translate }}</p>
        </div>
      }
      @case ('error') {
        <div class="state state--error" role="alert">
          <app-icon class="state__icon" name="file-text" />
          <p>{{ 'doc_viewer.error' | translate }}</p>
        </div>
      }
      @case ('too-big') {
        <div class="state" role="alert">
          <app-icon class="state__icon" name="file-text" />
          <p>{{ 'doc_viewer.too_big' | translate }}</p>
        </div>
      }
      @default {
        <pre class="text" [class.text--wrap]="wrap()" tabindex="0">{{ content() }}</pre>
      }
    }
  `,
  styles: `
    @use 'engine' as *;
    @include engine-host;
    @include engine-state;

    .text {
      flex: 1 1 auto;
      min-height: 0;
      margin: 0;
      padding: 1rem 1.25rem;
      overflow: auto;
      background: var(--dv-paper);
      color: var(--dv-paper-fg);
      font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.55;
      tab-size: 2;
      white-space: pre;

      &--wrap {
        white-space: pre-wrap;
        word-break: break-word;
      }

      &:focus-visible {
        outline: 2px solid var(--dv-focus);
        outline-offset: -2px;
      }
    }
  `,
})
export class TextEngineComponent {
  private readonly document = inject(DOCUMENT);

  readonly source = input.required<ViewerDocument>({ alias: 'document' });
  readonly wrap = input(true);

  protected readonly status = signal<'loading' | 'ready' | 'error' | 'too-big'>('loading');
  protected readonly content = signal('');

  constructor() {
    let controller: AbortController | null = null;
    inject(DestroyRef).onDestroy(() => controller?.abort());

    effect(() => {
      const src = this.source().src;
      untracked(() => {
        controller?.abort();
        controller = new AbortController();
        void this.load(new URL(src, this.document.baseURI).href, controller.signal);
      });
    });
  }

  private async load(url: string, signal: AbortSignal): Promise<void> {
    this.status.set('loading');
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(String(response.status));
      if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) {
        this.status.set('too-big');
        return;
      }
      const text = await response.text();
      if (text.length > MAX_BYTES) {
        this.status.set('too-big');
        return;
      }
      this.content.set(text);
      this.status.set('ready');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') this.status.set('error');
    }
  }
}
