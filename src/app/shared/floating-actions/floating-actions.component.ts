import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ShareButtonComponent } from '../share-button/share-button.component';

/**
 * Dock flotante en la esquina inferior derecha que aparece cuando el
 * usuario hace scroll por debajo del fold inicial. Contiene:
 *
 *  - Acceso rápido al QR (smooth-scroll a la sección del aside QR).
 *  - Botón de compartir (reutiliza `ShareButtonComponent`).
 *
 * Se oculta automáticamente cuando el footer entra en el viewport,
 * para no taparlo (uso de IntersectionObserver sobre `app-footer`).
 *
 * Pensado para uso público en móvil: el visitante siempre tiene a mano
 * el QR (para enseñárselo a alguien al lado) y la opción de compartir
 * la página por WhatsApp / redes.
 */
@Component({
  selector: 'app-floating-actions',
  standalone: true,
  imports: [TranslateModule, ShareButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dock"
      [class.dock--visible]="isVisible()"
      [class.dock--hidden-by-footer]="footerVisible()"
      role="complementary"
      [attr.aria-hidden]="!isVisible() || footerVisible()"
    >
      <button
        type="button"
        class="dock__btn dock__btn--qr"
        (click)="scrollToQr()"
        [attr.aria-label]="'qr.aria' | translate"
        [title]="'qr.caption' | translate"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm2-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-4h2v2h-2v-2Zm0 4h2v2h-2v-2Z"
          />
        </svg>
      </button>

      <app-share-button class="dock__share" />
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .dock {
        position: fixed;
        bottom: clamp(0.85rem, 2.5vh, 1.5rem);
        right: clamp(0.85rem, 2.5vw, 1.5rem);
        z-index: 900;
        display: inline-flex;
        flex-direction: row-reverse;
        align-items: center;
        gap: 0.55rem;
        padding: 0.4rem;
        background: rgba(11, 16, 32, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        backdrop-filter: blur(14px) saturate(140%);
        -webkit-backdrop-filter: blur(14px) saturate(140%);
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
        opacity: 0;
        transform: translateY(16px) scale(0.95);
        pointer-events: none;
        transition:
          opacity 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
          transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);

        &--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        &--hidden-by-footer {
          opacity: 0 !important;
          transform: translateY(16px) scale(0.95) !important;
          pointer-events: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          transition: opacity 0.2s ease;
          transform: none;

          &--visible {
            transform: none;
          }
          &--hidden-by-footer {
            transform: none !important;
          }
        }
      }

      .dock__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #f4f1ea;
        cursor: pointer;
        padding: 0;
        transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;

        svg {
          width: 20px;
          height: 20px;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          transform: scale(1.06);
        }
        &:active {
          transform: scale(0.95);
        }
        &:focus-visible {
          outline: 2px solid #e6b35a;
          outline-offset: 3px;
        }
      }

      // El share button reutilizado dentro del dock se restila para
      // ser un botón redondo idéntico a los demás del dock.
      .dock__share ::ng-deep .share-btn {
        width: 42px;
        height: 42px;
        padding: 0;
        border-radius: 50%;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.14);
      }
      .dock__share ::ng-deep .share-btn__icon {
        width: 20px;
        height: 20px;
      }
      .dock__share ::ng-deep .share-btn__label {
        display: none;
      }
    `,
  ],
})
export class FloatingActionsComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly isVisible = signal(false);
  protected readonly footerVisible = signal(false);

  /** Umbral de scroll (px) a partir del cual aparece el dock. */
  private readonly scrollThreshold = 220;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    // Localiza el footer cuando esté en el DOM (puede no estar al instante
    // si está dentro de un @defer o lazy block).
    const tryAttach = () => {
      const footer =
        document.querySelector('app-footer') ?? document.querySelector('footer');
      if (!footer) return false;

      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            this.footerVisible.set(e.isIntersecting);
            this.cdr.markForCheck();
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
      );
      obs.observe(footer);
      this.destroyRef.onDestroy(() => obs.disconnect());
      return true;
    };

    if (!tryAttach()) {
      const id = window.setTimeout(() => tryAttach(), 800);
      this.destroyRef.onDestroy(() => window.clearTimeout(id));
    }

    // Estado inicial.
    this.updateScroll();
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.updateScroll();
  }

  private updateScroll(): void {
    const y = window.scrollY ?? window.pageYOffset ?? 0;
    const next = y > this.scrollThreshold;
    if (next !== this.isVisible()) {
      this.isVisible.set(next);
      this.cdr.markForCheck();
    }
  }

  protected scrollToQr(): void {
    const el =
      document.getElementById('qr-section') ?? document.querySelector('.qr');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
