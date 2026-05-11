import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Footer global con los logos institucionales (ELIM + INEB) y un texto
 * de copyright. Sigue la temática oscura+dorada del resto de la app:
 * fondo `#060914 → #0b1226` con borde superior dorado fino y un sutil
 * resplandor radial. Inspirado en el footer del proyecto
 * `INEB_ELIM_Administrativ` pero adaptado al lenguaje visual de esta web.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <footer class="site-footer">
      <div class="site-footer__inner">
        <a
          class="site-footer__brand"
          href="https://elimarganda.es"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Iglesia ELIM Arganda"
        >
          <img
            src="assets/logo-elim.png"
            alt=""
            class="site-footer__logo"
            width="44"
            height="44"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
        </a>

        <div class="site-footer__text">
          <p class="site-footer__line">
            <span class="site-footer__church">{{ 'footer.church' | translate }}</span>
            <span class="site-footer__sep" aria-hidden="true">·</span>
            <span class="site-footer__year">© {{ year }}</span>
          </p>
          <p class="site-footer__sub">
            {{ 'footer.department' | translate }} ·
            <span class="site-footer__rights">{{ 'footer.rights' | translate }}</span>
          </p>
        </div>

        <a
          class="site-footer__brand"
          href="https://ineb.es"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="INEB"
        >
          <img
            src="assets/logo-ineb.png"
            alt=""
            class="site-footer__logo"
            width="44"
            height="44"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
        </a>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .site-footer {
        position: relative;
        padding: clamp(0.5rem, 1.2vh, 0.8rem) clamp(1rem, 4vw, 3rem);
        background:
          radial-gradient(
            ellipse at top,
            rgba(230, 179, 90, 0.05) 0%,
            transparent 60%
          ),
          linear-gradient(180deg, #0b1226 0%, #060914 100%);
        border-top: 1px solid rgba(230, 179, 90, 0.12);
        color: rgba(244, 241, 234, 0.78);
        overflow: hidden;
      }

      .site-footer::before {
        /* Línea dorada decorativa fina sobre el borde superior. */
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: clamp(120px, 30%, 360px);
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          #e6b35a 50%,
          transparent
        );
        opacity: 0.5;
      }

      .site-footer__inner {
        max-width: 1180px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(1rem, 2vw, 1.5rem);
        flex-wrap: wrap;
      }

      .site-footer__brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s ease, filter 0.25s ease;

        &:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        &:focus-visible {
          outline: 2px solid #e6b35a;
          outline-offset: 3px;
          border-radius: 4px;
        }
      }

      .site-footer__logo {
        height: clamp(28px, 4vh, 36px);
        width: auto;
        display: block;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
      }

      .site-footer__text {
        text-align: center;
        line-height: 1.45;
        min-width: 0;
      }

      .site-footer__line {
        margin: 0;
        font-family: 'Cormorant Garamond', 'Georgia', serif;
        font-size: clamp(0.85rem, 1vw, 1rem);
        color: rgba(244, 241, 234, 0.92);
        letter-spacing: 0.01em;
      }

      .site-footer__church {
        font-weight: 600;
      }

      .site-footer__sep {
        margin: 0 0.4rem;
        color: rgba(230, 179, 90, 0.5);
      }

      .site-footer__year {
        color: #f6d28a;
        font-weight: 500;
      }

      .site-footer__sub {
        margin: 2px 0 0;
        font-size: clamp(0.65rem, 0.8vw, 0.75rem);
        font-weight: 400;
        color: rgba(244, 241, 234, 0.55);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .site-footer__rights {
        text-transform: none;
        letter-spacing: 0;
      }

      @media (max-width: 600px) {
        .site-footer {
          padding: 1.1rem 0.85rem 1.25rem;
        }
        .site-footer__inner {
          gap: 14px 18px;
        }
        .site-footer__text {
          flex: 0 0 100%;
          order: 2;
        }
        .site-footer__brand {
          order: 1;
          padding: 4px 8px;
        }
        .site-footer__logo {
          height: 36px;
        }
        .site-footer__sub {
          font-size: 0.68rem;
        }
      }
    `,
  ],
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
