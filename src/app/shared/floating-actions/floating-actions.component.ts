import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ShareButtonComponent } from '../share-button/share-button.component';
import { PresentationService } from '../../core/presentation.service';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { APP_PATHS } from '../../core/navigation/app-paths';

/**
 * Dock flotante fijo en la esquina inferior derecha con los controles de
 * acción rápida, siempre accesibles:
 *
 *  - Botón de modo presentación, **sólo en el panel completo** (`/media`).
 *  - Botón de compartir (reutiliza `ShareButtonComponent`).
 *  - Botón de volver arriba, que aparece tras un scroll considerable.
 *
 * Pensado tanto para el portátil que controla la proyección en la iglesia
 * (acceso inmediato a "Presentar" / "Salir") como para el visitante en la
 * web pública (compartir la página por WhatsApp / redes).
 *
 * En modo presentación el dock se atenúa y se revela al pasar el ratón,
 * para no distraer en la proyección pero seguir estando a mano. Fuera de
 * presentación se oculta si el footer institucional entra en el viewport,
 * para no taparlo (IntersectionObserver sobre `app-footer`).
 */
@Component({
  selector: 'app-floating-actions',
  standalone: true,
  imports: [TranslateModule, ShareButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dock"
      [class.dock--visible]="isVisible() && (!footerVisible() || showTop())"
      [class.dock--present]="presentation.isFullscreen()"
      role="complementary"
      [attr.aria-hidden]="footerVisible() && !showTop()"
    >
      @if (canPresent()) {
        <button
          type="button"
          class="dock__btn dock__btn--present"
          (click)="togglePresentation()"
          [attr.aria-pressed]="presentation.isFullscreen()"
          [attr.aria-label]="
            (presentation.isFullscreen()
              ? 'presentation.tooltip_exit'
              : 'presentation.tooltip_enter'
            ) | translate
          "
          [title]="
            (presentation.isFullscreen()
              ? 'presentation.tooltip_exit'
              : 'presentation.tooltip_enter'
            ) | translate
          "
        >
          @if (!presentation.isFullscreen()) {
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          }
        </button>
      }

      <app-share-button class="dock__share" />

      @if (showTop()) {
        <button
          type="button"
          class="dock__btn dock__btn--top"
          (click)="backToTop()"
          [attr.aria-label]="'common.back_to_top' | translate"
          [title]="'common.back_to_top' | translate"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 19V5M5 12l7-7 7 7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      }
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
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(26, 54, 93, 0.14);
        border-radius: 999px;
        backdrop-filter: blur(14px) saturate(140%);
        -webkit-backdrop-filter: blur(14px) saturate(140%);
        box-shadow: 0 14px 36px rgba(26, 54, 93, 0.18);
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

        // En presentación el dock se mantiene a mano pero discreto: atenuado
        // mientras no se usa y totalmente visible al pasar el ratón o enfocar,
        // para poder salir de la presentación con facilidad sin distraer.
        &--present.dock--visible {
          opacity: 0.4;

          &:hover,
          &:focus-within {
            opacity: 1;
          }
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
        background: rgba(212, 175, 55, 0.12);
        border: 1px solid rgba(26, 54, 93, 0.14);
        color: var(--c-text);
        cursor: pointer;
        padding: 0;
        transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;

        svg {
          width: 20px;
          height: 20px;
        }

        &:hover {
          background: rgba(212, 175, 55, 0.2);
          color: var(--c-gold-deep);
          transform: scale(1.06);
        }
        &:active {
          transform: scale(0.95);
        }
        &:focus-visible {
          outline: 2px solid var(--c-gold-deep);
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
        background: rgba(212, 175, 55, 0.12);
        border-color: rgba(26, 54, 93, 0.14);
        color: var(--c-text);
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
  private readonly navActive = inject(NavActiveService);
  protected readonly presentation = inject(PresentationService);

  /**
   * Proyectar sólo tiene sentido en el panel completo: es la única página
   * pensada para la pantalla del templo (carrusel de bloques a pantalla
   * completa). En el resto sería un control sin destino. Se mantiene visible
   * mientras la presentación esté activa para poder salir siempre.
   */
  protected readonly canPresent = computed(
    () => this.navActive.url() === `/${APP_PATHS.media}` || this.presentation.isFullscreen(),
  );

  /** El dock está siempre disponible; solo se oculta si tapa el footer. */
  protected readonly isVisible = signal(true);
  protected readonly footerVisible = signal(false);

  /**
   * «Volver arriba» sólo aparece cuando el usuario ya se ha alejado del
   * principio: antes de eso es ruido. El umbral es una pantalla y media, no
   * un número de píxeles fijo, para que se comporte igual en el móvil y en
   * la pantalla del templo. En presentación no aplica (no hay scroll).
   */
  protected readonly showTop = computed(
    () => this.scrolledFar() && !this.presentation.isFullscreen(),
  );

  private readonly scrolledFar = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    // El listener vive fuera de la zona de Angular: el scroll dispara cientos
    // de eventos y ninguno debe provocar detección de cambios. Sólo se vuelve
    // a entrar cuando el umbral se cruza de verdad, es decir, dos veces por
    // recorrido de página.
    const zone = inject(NgZone);
    const onScroll = () => {
      const far = window.scrollY > window.innerHeight * 1.5;
      if (far === this.scrolledFar()) return;
      zone.run(() => this.scrolledFar.set(far));
    };

    zone.runOutsideAngular(() => window.addEventListener('scroll', onScroll, { passive: true }));
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

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
  }

  protected togglePresentation(): void {
    void this.presentation.toggle();
  }

  /** Sube al principio sin recargar ni ensuciar el historial con un `#`. */
  protected backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
