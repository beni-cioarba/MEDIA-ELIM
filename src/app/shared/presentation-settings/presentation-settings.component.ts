import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  PresentationBlockId,
  PresentationBlocksService,
} from '../../core/services/presentation-blocks.service';

/**
 * Control de **bloques a presentar**.
 *
 * Se integra en la barra de controles del carrusel (junto a anterior /
 * pausa / siguiente) y permite al operador decidir, sobre la marcha, qué
 * secciones entran en la rotación al pulsar Play.
 *
 * Cada bloque tiene tres estados posibles:
 *  - **Auto** (por defecto): se proyecta sólo si tiene contenido. Es lo que
 *    hace que "Próximos eventos" desaparezca solo cuando no queda ninguno.
 *  - **Forzado ON**: se proyecta aunque esté vacío.
 *  - **Forzado OFF**: nunca se proyecta.
 *
 * Las decisiones manuales se recuerdan en `localStorage`.
 */
@Component({
  selector: 'app-presentation-settings',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="blocks" (keydown)="onKeydown($event)">
      <button
        type="button"
        class="blocks__trigger"
        [class.is-open]="open()"
        [attr.aria-expanded]="open()"
        aria-haspopup="dialog"
        [attr.aria-label]="'blocks.tooltip' | translate"
        [title]="'blocks.tooltip' | translate"
        (click)="toggle($event)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M14.5 17.5l2 2 4-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="blocks__count">{{ blocks.activeCount() }}/{{ blocks.definitions.length }}</span>
      </button>

      @if (open()) {
        <div
          class="blocks__panel"
          role="dialog"
          [attr.aria-label]="'blocks.title' | translate"
          (click)="$event.stopPropagation()"
        >
          <header class="blocks__head">
            <h3 class="blocks__title">{{ 'blocks.title' | translate }}</h3>
            <p class="blocks__subtitle">{{ 'blocks.subtitle' | translate }}</p>
          </header>

          <ul class="blocks__list" role="list">
            @for (state of blocks.states(); track state.id) {
              <li class="blocks__item" [class.is-off]="!state.enabled">
                <label class="blocks__switch">
                  <input
                    type="checkbox"
                    [checked]="state.enabled"
                    [disabled]="state.enabled && blocks.activeCount() === 1"
                    (change)="setEnabled(state.id, $event)"
                  />
                  <span class="blocks__track" aria-hidden="true"><span class="blocks__thumb"></span></span>
                  <span class="blocks__label">
                    <span class="blocks__name">{{ state.titleKey | translate }}</span>
                    <span class="blocks__hint">
                      @if (state.isAuto) {
                        <span class="blocks__badge blocks__badge--auto">{{ 'blocks.auto' | translate }}</span>
                        {{ (state.autoAvailable ? 'blocks.auto_on' : 'blocks.auto_off') | translate }}
                      } @else {
                        <span class="blocks__badge blocks__badge--manual">{{ 'blocks.manual' | translate }}</span>
                        {{ (state.enabled ? 'blocks.forced_on' : 'blocks.forced_off') | translate }}
                      }
                    </span>
                  </span>
                </label>

                @if (!state.isAuto) {
                  <button
                    type="button"
                    class="blocks__reset-one"
                    (click)="blocks.resetToAuto(state.id)"
                    [attr.aria-label]="'blocks.reset_one' | translate"
                    [title]="'blocks.reset_one' | translate"
                  >
                    ↺
                  </button>
                }
              </li>
            }
          </ul>

          <footer class="blocks__foot">
            <p class="blocks__note">{{ 'blocks.min_one' | translate }}</p>
            @if (blocks.hasManualOverrides()) {
              <button type="button" class="blocks__reset" (click)="blocks.resetAll()">
                {{ 'blocks.reset' | translate }}
              </button>
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .blocks {
        position: relative;
        display: inline-flex;
      }

      .blocks__trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        height: 40px;
        padding: 0 0.6rem;
        border: 1px solid rgba(26, 54, 93, 0.16);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.9);
        color: #1a365d;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

        svg {
          width: 18px;
          height: 18px;
        }

        &:hover,
        &.is-open {
          background: #1a365d;
          border-color: #1a365d;
          color: #fff;
        }

        &:focus-visible {
          outline: 2px solid #c9a227;
          outline-offset: 2px;
        }
      }

      .blocks__count {
        font-size: 0.78rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .blocks__panel {
        position: absolute;
        bottom: calc(100% + 0.6rem);
        left: 50%;
        transform: translateX(-50%);
        z-index: 30;
        width: min(340px, 88vw);
        padding: 0.9rem;
        border-radius: 16px;
        border: 1px solid rgba(26, 54, 93, 0.14);
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 22px 48px rgba(26, 54, 93, 0.24);
        text-align: left;
        color: #2d3748;
      }

      .blocks__title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 800;
        color: #1a365d;
      }

      .blocks__subtitle {
        margin: 0.15rem 0 0.7rem;
        font-size: 0.78rem;
        line-height: 1.35;
        color: rgba(45, 55, 72, 0.72);
      }

      .blocks__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.3rem;
      }

      .blocks__item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.4rem;
        border-radius: 10px;
        transition: background 0.2s ease, opacity 0.2s ease;

        &:hover {
          background: rgba(26, 54, 93, 0.05);
        }

        &.is-off {
          opacity: 0.55;
        }
      }

      .blocks__switch {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        cursor: pointer;
        min-width: 0;

        input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        input:disabled ~ .blocks__track {
          cursor: not-allowed;
          opacity: 0.5;
        }

        input:focus-visible ~ .blocks__track {
          outline: 2px solid #c9a227;
          outline-offset: 2px;
        }

        input:checked ~ .blocks__track {
          background: #1a365d;

          .blocks__thumb {
            transform: translateX(16px);
          }
        }
      }

      .blocks__track {
        flex: 0 0 auto;
        position: relative;
        width: 36px;
        height: 20px;
        border-radius: 999px;
        background: rgba(26, 54, 93, 0.24);
        transition: background 0.2s ease;
      }

      .blocks__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease;
      }

      .blocks__label {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .blocks__name {
        font-size: 0.85rem;
        font-weight: 700;
        color: #1a365d;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .blocks__hint {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.7rem;
        color: rgba(45, 55, 72, 0.7);
      }

      .blocks__badge {
        display: inline-block;
        padding: 0.05rem 0.35rem;
        border-radius: 999px;
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;

        &--auto {
          background: rgba(201, 162, 39, 0.18);
          color: #8a6d10;
        }

        &--manual {
          background: rgba(26, 54, 93, 0.12);
          color: #1a365d;
        }
      }

      .blocks__reset-one,
      .blocks__reset {
        border: 1px solid rgba(26, 54, 93, 0.16);
        background: #fff;
        color: #1a365d;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 700;

        &:hover {
          background: rgba(26, 54, 93, 0.08);
        }
      }

      .blocks__reset-one {
        width: 26px;
        height: 26px;
        line-height: 1;
        font-size: 0.9rem;
      }

      .blocks__foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 0.7rem;
        padding-top: 0.6rem;
        border-top: 1px solid rgba(26, 54, 93, 0.1);
      }

      .blocks__note {
        margin: 0;
        font-size: 0.68rem;
        line-height: 1.3;
        color: rgba(45, 55, 72, 0.62);
      }

      .blocks__reset {
        flex: 0 0 auto;
        padding: 0.3rem 0.6rem;
        font-size: 0.72rem;
      }

      @media (prefers-reduced-motion: reduce) {
        .blocks__trigger,
        .blocks__track,
        .blocks__thumb,
        .blocks__item {
          transition: none;
        }
      }
    `,
  ],
})
export class PresentationSettingsComponent {
  protected readonly blocks = inject(PresentationBlocksService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly open = signal<boolean>(false);

  constructor() {
    const onDocClick = (event: Event) => {
      if (!this.open()) return;
      const target = event.target as Node | null;
      if (target && this.host.nativeElement.contains(target)) return;
      this.open.set(false);
    };
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((value) => !value);
  }

  protected setEnabled(id: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.blocks.setEnabled(id, input.checked);
  }

  /**
   * Evita que los atajos globales de la presentación (espacio = pausa,
   * flechas = navegar) se disparen mientras se usa este control.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      this.open.set(false);
      return;
    }
    if (this.open()) event.stopPropagation();
  }
}
