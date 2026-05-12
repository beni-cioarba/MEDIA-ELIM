import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CalendarService } from '../../core/services/calendar.service';
import { UpcomingEvent } from '../../core/church.config';

/**
 * `CalendarSyncButtonComponent` — botón con menú emergente usando Angular CDK.
 */
@Component({
  selector: 'app-calendar-sync-button',
  standalone: true,
  imports: [CommonModule, TranslateModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-sync" [class.cal-sync--icon-only]="iconOnly">
      <button
        type="button"
        class="cal-sync__btn"
        (click)="toggle($event)"
        cdkOverlayOrigin
        #trigger="cdkOverlayOrigin"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'menu'"
        [attr.aria-label]="'calendar.add_to_calendar' | translate"
        [title]="'calendar.add_to_calendar' | translate"
      >
        <svg class="cal-sync__icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" ry="2"
            fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M3 9h18M8 3v4M16 3v4"
            fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="M12 13v5M9.5 15.5h5"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        @if (!iconOnly) {
          <span class="cal-sync__label">{{ 'calendar.add_to_calendar_short' | translate }}</span>
        }
      </button>

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="trigger"
        [cdkConnectedOverlayOpen]="open()"
        [cdkConnectedOverlayHasBackdrop]="true"
        [cdkConnectedOverlayBackdropClass]="'cdk-overlay-transparent-backdrop'"
        (backdropClick)="close()"
        (detach)="close()"
      >
        <div class="cal-sync__panel" role="menu" (click)="$event.stopPropagation()">
          <header class="cal-sync__panel-header">
            <span class="cal-sync__panel-title">{{ 'calendar.sync_title' | translate }}</span>
            <button
              type="button"
              class="cal-sync__close"
              (click)="close()"
              [attr.aria-label]="'calendar.close' | translate"
            >×</button>
          </header>

          <p class="cal-sync__intro">{{ 'calendar.sync_intro' | translate }}</p>

          <!-- Resumen / Preview de los eventos a sincronizar -->
          <section class="cal-sync__preview" aria-labelledby="cal-sync-preview-title">
            <header class="cal-sync__preview-header">
              <span id="cal-sync-preview-title" class="cal-sync__preview-title">
                {{ 'calendar.preview_title' | translate }}
              </span>
              <span class="cal-sync__preview-count">{{ targetEvents().length }}</span>
            </header>

            @if (targetEvents().length === 0) {
              <p class="cal-sync__preview-empty">{{ 'calendar.preview_empty' | translate }}</p>
            } @else {
              <ul class="cal-sync__preview-list" role="list">
                @for (ev of targetEvents().slice(0, previewLimit); track ev.id) {
                  <li class="cal-sync__preview-item">
                    <span class="cal-sync__preview-date">{{ formatShortDate(ev.date) }}</span>
                    <span class="cal-sync__preview-info">
                      <span class="cal-sync__preview-name">{{ ev.title }}</span>
                      <span class="cal-sync__preview-time">
                        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
                          <path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        {{ ev.time }}
                      </span>
                    </span>
                  </li>
                }
              </ul>
              @if (targetEvents().length > previewLimit) {
                <p class="cal-sync__preview-more">
                  {{ 'calendar.preview_more' | translate: { n: targetEvents().length - previewLimit } }}
                </p>
              }
            }
          </section>

          <!-- Acciones -->
          <div class="cal-sync__actions">
            @if (event) {
              <a
                class="cal-sync__action cal-sync__action--google"
                [href]="googleUrl()"
                target="_blank"
                rel="noopener noreferrer"
                (click)="close()"
              >
                <span class="cal-sync__action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <rect x="3" y="5" width="18" height="16" rx="2" fill="#1a73e8"/>
                    <text x="12" y="17" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="Arial">G</text>
                    <path d="M3 9h18" stroke="white" stroke-width="1.5"/>
                  </svg>
                </span>
                <div class="cal-sync__action-text">
                  <span class="cal-sync__action-title">{{ 'calendar.option_google_title' | translate }}</span>
                  <span class="cal-sync__action-desc">{{ 'calendar.option_google_desc' | translate }}</span>
                </div>
              </a>
            }

            <button
              type="button"
              class="cal-sync__action"
              (click)="downloadAction()"
              [disabled]="targetEvents().length === 0"
            >
              <span class="cal-sync__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"
                    fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="cal-sync__action-text">
                <span class="cal-sync__action-title">{{ 'calendar.option_download_title' | translate }}</span>
                <span class="cal-sync__action-desc">{{ 'calendar.option_download_desc' | translate }}</span>
              </div>
            </button>

            <button
              type="button"
              class="cal-sync__action"
              (click)="subscribeAction()"
            >
              <span class="cal-sync__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M21 12a9 9 0 1 1-3.5-7.1M21 4v5h-5"
                    fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="cal-sync__action-text">
                <span class="cal-sync__action-title">{{ 'calendar.option_subscribe_title' | translate }}</span>
                <span class="cal-sync__action-desc">{{ 'calendar.option_subscribe_desc' | translate }}</span>
                @if (lastWebcalUrl(); as url) {
                  <span class="cal-sync__action-url" [title]="url">{{ url }}</span>
                }
              </div>
            </button>
          </div>

          @if (toast(); as msg) {
            <p class="cal-sync__toast" role="status" aria-live="polite">{{ msg }}</p>
          }

          <p class="cal-sync__footer">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>{{ 'calendar.webcal_note' | translate }}</span>
          </p>
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './calendar-sync-button.component.scss',
})
export class CalendarSyncButtonComponent {
  /** Evento individual para sincronizar. Mutuamente excluyente con `events`. */
  @Input() event: UpcomingEvent | null = null;
  /** Lote de eventos (vista global "añadir todos"). */
  @Input() events: readonly UpcomingEvent[] | null = null;
  /** Modo compacto: solo muestra el icono, sin etiqueta de texto. */
  @Input() iconOnly = false;

  protected readonly previewLimit = 5;
  protected readonly open = signal<boolean>(false);
  protected readonly toast = signal<string | null>(null);
  protected readonly lastWebcalUrl = signal<string | null>(null);

  private readonly cal = inject(CalendarService);
  private readonly translate = inject(TranslateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Eventos efectivos a procesar. */
  protected readonly targetEvents = computed<readonly UpcomingEvent[]>(() => {
    if (this.event) return [this.event];
    return this.events ?? [];
  });

  protected googleUrl(): string {
    return this.event ? this.cal.googleAddUrlForEvent(this.event) : '';
  }

  toggle(e: MouseEvent): void {
    this.open.update((v) => !v);
    this.toast.set(null);
  }

  close(): void {
    if (this.open()) {
      this.toast.set(null);
      this.open.set(false);
    }
  }

  protected downloadAction(): void {
    const list = this.targetEvents();
    if (list.length === 0) return;
    if (list.length === 1) {
      this.cal.downloadEvent(list[0]);
    } else {
      this.cal.downloadAll(list);
    }
    this.flashToast(this.translate.instant('calendar.toast_downloaded'));
    setTimeout(() => this.close(), 900);
  }

  protected async subscribeAction(): Promise<void> {
    const url = this.cal.webcalUrlForAll();
    this.lastWebcalUrl.set(url);
    const ok = await this.cal.copyToClipboard(url);
    this.flashToast(
      this.translate.instant(ok ? 'calendar.toast_copied' : 'calendar.toast_copy_failed')
    );
    // En iOS/macOS y Outlook desktop, abrir webcal:// dispara el flujo nativo.
    try {
      if (typeof window !== 'undefined') window.location.href = url;
    } catch {
      /* noop */
    }
  }

  protected formatShortDate(iso: string): string {
    const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
    const date = new Date(y, (m || 1) - 1, d || 1);
    const lang = this.translate.currentLang || this.translate.defaultLang || 'ro';
    try {
      return new Intl.DateTimeFormat(lang, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
        .format(date)
        .replace('.', '');
    } catch {
      return iso;
    }
  }

  private flashToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => {
      if (this.toast() === msg) this.toast.set(null);
    }, 2400);
  }
}
