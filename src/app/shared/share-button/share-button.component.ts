import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  Input,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';

/**
 * Botón de "compartir" universal para visitantes de la web.
 *
 *  - En móviles modernos (iOS Safari, Android Chrome, Edge) usa la **Web Share
 *    API nativa** (`navigator.share`), que abre el sheet del sistema operativo
 *    con TODAS las apps instaladas (WhatsApp, Telegram, AirDrop, Mail, etc.).
 *  - En navegadores de escritorio o que no la soporten, abre un modal
 *    propio con accesos directos a WhatsApp, Telegram, Facebook, X (Twitter),
 *    Email y "copiar enlace al portapapeles".
 *
 * No requiere librerías externas — los enlaces de share de cada red
 * son URLs `https://...` con parámetros estándar.
 */
@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="share-btn"
      (click)="open()"
      [attr.aria-label]="'share.button_aria' | translate"
      [title]="'share.button_title' | translate"
    >
      <svg class="share-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .17 1.5L8.83 9.5A3 3 0 1 0 8.83 14.5l6.34 4A3 3 0 1 0 16 17l-6.34-4a3 3 0 0 0 0-3l6.34-4A3 3 0 0 0 18 8Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="share-btn__label">{{ 'share.button_label' | translate }}</span>
    </button>

    @if (isModalOpen()) {
    <div
      class="share-modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'share.modal_title' | translate"
      (click)="onBackdropClick($event)"
    >
      <div class="share-modal__panel" role="document">
        <header class="share-modal__header">
          <h2 class="share-modal__title">{{ 'share.modal_title' | translate }}</h2>
          <button
            type="button"
            class="share-modal__close"
            (click)="close()"
            [attr.aria-label]="'share.close' | translate"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <p class="share-modal__url">{{ shareUrl }}</p>

        <ul class="share-modal__grid">
          <li>
            <a
              class="share-modal__option share-modal__option--whatsapp"
              [href]="whatsappUrl()"
              target="_blank"
              rel="noopener noreferrer"
              (click)="close()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <path
                    fill="currentColor"
                    d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L.3 31.6l7.9-2.1c2.3 1.3 5 1.9 7.7 1.9 8.6 0 15.6-7 15.6-15.6S24.6.4 16 .4Zm0 28.4c-2.5 0-4.9-.7-7-1.9l-.5-.3-4.7 1.2 1.2-4.6-.3-.5C3.4 21 2.6 18.6 2.6 16 2.6 8.6 8.6 2.6 16 2.6S29.4 8.6 29.4 16 23.4 28.8 16 28.8Zm7.4-9.6c-.4-.2-2.4-1.2-2.7-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.2 1.5c-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1-2-2.3-2.2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.6.2-.2.2-.4.3-.6.1-.2.1-.5 0-.7s-.9-2.1-1.2-2.9c-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.9 5.2 2 .8 2.5.9 3.4.9.5 0 1.6-.2 1.8-1 .2-.7.2-1.3.2-1.4-.1-.2-.4-.3-.7-.4Z"
                  />
                </svg>
              </span>
              <span>WhatsApp</span>
            </a>
          </li>
          <li>
            <a
              class="share-modal__option share-modal__option--telegram"
              [href]="telegramUrl()"
              target="_blank"
              rel="noopener noreferrer"
              (click)="close()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <path
                    fill="currentColor"
                    d="M16 0C7.2 0 0 7.2 0 16s7.2 16 16 16 16-7.2 16-16S24.8 0 16 0Zm7.4 11l-2.6 12.4c-.2.9-.7 1.1-1.4.7l-3.9-2.9-1.9 1.8c-.2.2-.4.4-.8.4l.3-4 7.3-6.6c.3-.3-.1-.4-.5-.2L9.8 17l-3.9-1.2c-.8-.3-.9-.8.2-1.2L23 8.5c.7-.3 1.3.2 1.4 1.1Z"
                  />
                </svg>
              </span>
              <span>Telegram</span>
            </a>
          </li>
          <li>
            <a
              class="share-modal__option share-modal__option--facebook"
              [href]="facebookUrl()"
              target="_blank"
              rel="noopener noreferrer"
              (click)="close()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <path
                    fill="currentColor"
                    d="M32 16c0-8.8-7.2-16-16-16S0 7.2 0 16c0 8 5.8 14.6 13.5 15.8V20.6H9.4V16h4.1v-3.5c0-4 2.4-6.3 6.1-6.3 1.8 0 3.6.3 3.6.3v4h-2c-2 0-2.6 1.2-2.6 2.5V16h4.5l-.7 4.6h-3.8v11.2C26.2 30.6 32 24 32 16Z"
                  />
                </svg>
              </span>
              <span>Facebook</span>
            </a>
          </li>
          <li>
            <a
              class="share-modal__option share-modal__option--x"
              [href]="twitterUrl()"
              target="_blank"
              rel="noopener noreferrer"
              (click)="close()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <path
                    fill="currentColor"
                    d="M18.9 13.5L29.5 1.3h-2.5l-9.2 10.6L10.4 1.3H1.9L13 17.3 1.9 30.7h2.5l9.7-11.2 7.8 11.2h8.5l-11.5-17.2Zm-3.4 4l-1.1-1.6L5.3 3.2h3.9l7.3 10.4 1.1 1.6 9.4 13.4h-3.9l-7.6-10.9Z"
                  />
                </svg>
              </span>
              <span>X (Twitter)</span>
            </a>
          </li>
          <li>
            <a
              class="share-modal__option share-modal__option--email"
              [href]="emailUrl()"
              (click)="close()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 6.5h18v11H3zM3 6.5l9 7 9-7"
                  />
                </svg>
              </span>
              <span>{{ 'share.email' | translate }}</span>
            </a>
          </li>
          <li>
            <button
              type="button"
              class="share-modal__option share-modal__option--copy"
              (click)="copyLink()"
            >
              <span class="share-modal__icon" aria-hidden="true">
                @if (copied()) {
                <svg viewBox="0 0 24 24">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 12.5l4.5 4.5L19 7"
                  />
                </svg>
                } @else {
                <svg viewBox="0 0 24 24">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 9h10v12H9zM5 15V3h10"
                  />
                </svg>
                }
              </span>
              <span>{{ (copied() ? 'share.copied' : 'share.copy') | translate }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .share-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.85rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.92);
        cursor: pointer;
        font: inherit;
        font-size: 0.92rem;
        font-weight: 500;
        line-height: 1;
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }
        &:active {
          transform: translateY(0);
        }
        &:focus-visible {
          outline: 2px solid #e6b35a;
          outline-offset: 3px;
        }

        &__icon {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
        }

        &__label {
          @media (max-width: 640px) {
            display: none;
          }
        }
      }

      .share-modal {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: clamp(1rem, 3vw, 2rem);
        background: rgba(4, 8, 18, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: fade-in 0.2s ease both;

        &__panel {
          width: 100%;
          max-width: 480px;
          background: linear-gradient(160deg, #141a2c 0%, #0b1020 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: clamp(1.25rem, 2.5vw, 1.75rem);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          color: #f4f1ea;
          animation: pop-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        &__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        &__title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        &__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: #f4f1ea;
          cursor: pointer;
          transition: background 0.2s ease;

          svg {
            width: 16px;
            height: 16px;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.14);
          }
          &:focus-visible {
            outline: 2px solid #e6b35a;
            outline-offset: 2px;
          }
        }

        &__url {
          margin: 0 0 1rem;
          padding: 0.6rem 0.85rem;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.78);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        &__grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.7rem;

          @media (max-width: 420px) {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        &__option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.9rem 0.5rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f4f1ea;
          text-decoration: none;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          width: 100%;

          &:hover {
            background: rgba(255, 255, 255, 0.09);
            border-color: rgba(255, 255, 255, 0.18);
            transform: translateY(-2px);
          }

          &:focus-visible {
            outline: 2px solid #e6b35a;
            outline-offset: 2px;
          }

          &--whatsapp:hover {
            color: #25d366;
          }
          &--telegram:hover {
            color: #29b6f6;
          }
          &--facebook:hover {
            color: #1877f2;
          }
          &--x:hover {
            color: #ffffff;
          }
          &--email:hover {
            color: #f4b942;
          }
          &--copy:hover {
            color: #e6b35a;
          }
        }

        &__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;

          svg {
            width: 100%;
            height: 100%;
          }
        }
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes pop-in {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class ShareButtonComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);

  /** URL a compartir. Por defecto usa la URL pública canónica de la iglesia. */
  @Input() url?: string;
  /** Título a compartir (si la API nativa lo soporta). */
  @Input() title?: string;

  protected readonly isModalOpen = signal(false);
  protected readonly copied = signal(false);

  protected get shareUrl(): string {
    if (this.url) return this.url;
    if (typeof window !== 'undefined') return window.location.href;
    return this.config.publicUrl;
  }

  protected get shareTitle(): string {
    return this.title ?? this.translate.instant('app.title');
  }

  protected get shareText(): string {
    return this.translate.instant('share.message');
  }

  /**
   * Intenta usar la Web Share API nativa (móviles). Si no está disponible
   * o el usuario cancela, abre el modal con las opciones manuales.
   */
  protected async open(): Promise<void> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: this.shareTitle,
          text: this.shareText,
          url: this.shareUrl,
        });
        return;
      } catch (err) {
        // AbortError = el usuario canceló; no abrimos el modal en ese caso.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    this.isModalOpen.set(true);
  }

  protected close(): void {
    this.isModalOpen.set(false);
    this.copied.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEsc(): void {
    if (this.isModalOpen()) this.close();
  }

  // -------- URLs de cada red social --------
  // Todos siguen el patrón estándar de "share intent" — no requieren API key.

  protected whatsappUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.shareText} ${this.shareUrl}`)}`;
  }

  protected telegramUrl(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(
      this.shareUrl,
    )}&text=${encodeURIComponent(this.shareText)}`;
  }

  protected facebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
  }

  protected twitterUrl(): string {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      this.shareUrl,
    )}&text=${encodeURIComponent(this.shareText)}`;
  }

  protected emailUrl(): string {
    return `mailto:?subject=${encodeURIComponent(this.shareTitle)}&body=${encodeURIComponent(
      `${this.shareText}\n\n${this.shareUrl}`,
    )}`;
  }

  protected async copyLink(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.shareUrl);
      } else {
        // Fallback para navegadores antiguos (sin clipboard API).
        const ta = document.createElement('textarea');
        ta.value = this.shareUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* no-op */
    }
  }
}
