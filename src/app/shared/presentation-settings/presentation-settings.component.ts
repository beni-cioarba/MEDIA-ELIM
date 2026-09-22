import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PresentationBlockId,
  PresentationBlocksService,
} from '../../core/services/presentation-blocks.service';
import {
  DURATION_MAX_S,
  DURATION_MIN_S,
  PresentationDisplayService,
  QR_SIZES,
} from '../../core/services/presentation-display.service';

/**
 * Control de **qué y cómo se presenta**.
 *
 * Se integra en la barra de controles del carrusel (junto a anterior /
 * pausa / siguiente) y permite al operador decidir, sobre la marcha:
 *
 * 1. **Bloques**: cada uno tiene tres estados —
 *    - *Auto* (por defecto): se proyecta sólo si tiene contenido. Es lo que
 *      hace que «Anunțuri» o «Próximos eventos» desaparezcan solos cuando no
 *      queda nada.
 *    - *Forzado ON*: se proyecta aunque esté vacío.
 *    - *Forzado OFF*: nunca se proyecta.
 *    Y una **duración** por diapositiva (−/+ en pasos de 5 s), con un valor
 *    por defecto distinto por bloque (los anuncios se leen: 30 s).
 * 2. **Anuncios**: bajo el bloque «Anunțuri», cada anuncio vigente con su
 *    interruptor, para dejar fuera el que hoy no toque sin retirarlo de la web.
 * 3. **QR**: mostrarlo u ocultarlo (también con la tecla `Q`) y su tamaño
 *    (S/M/L). Sin QR el contenido ocupa todo el lienzo.
 *
 * Todo se recuerda en `localStorage` (`PresentationBlocksService` y
 * `PresentationDisplayService`).
 */
@Component({
    selector: 'app-presentation-settings',
    imports: [TranslatePipe],
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
        <span class="blocks__count">{{ blocks.activeCount() }}/{{ blocks.definitions().length }}</span>
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
                <div class="blocks__row">
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

                  <!-- Duración por diapositiva de este bloque. -->
                  <div
                    class="duration"
                    [class.is-custom]="!display.isDefaultDuration(state.id)"
                    role="group"
                    [attr.aria-label]="'blocks.duration' | translate"
                  >
                    <button
                      type="button"
                      class="duration__btn"
                      [disabled]="display.durationFor(state.id) <= durationMin"
                      (click)="display.stepDuration(state.id, -1)"
                      [attr.aria-label]="'blocks.duration_less' | translate"
                      [title]="'blocks.duration_less' | translate"
                    >−</button>
                    <input
                      class="duration__input"
                      type="number"
                      inputmode="numeric"
                      [min]="durationMin"
                      [max]="durationMax"
                      step="1"
                      [value]="display.durationFor(state.id)"
                      (change)="setDuration(state.id, $event)"
                      (keydown.enter)="commitDuration($event)"
                      [attr.aria-label]="'blocks.duration' | translate"
                    />
                    <span class="duration__unit" aria-hidden="true">s</span>
                    <button
                      type="button"
                      class="duration__btn"
                      [disabled]="display.durationFor(state.id) >= durationMax"
                      (click)="display.stepDuration(state.id, 1)"
                      [attr.aria-label]="'blocks.duration_more' | translate"
                      [title]="'blocks.duration_more' | translate"
                    >+</button>
                    @if (!display.isDefaultDuration(state.id)) {
                      <button
                        type="button"
                        class="duration__btn duration__reset"
                        (click)="display.resetDuration(state.id)"
                        [attr.aria-label]="'blocks.duration_reset' | translate"
                        [title]="'blocks.duration_reset' | translate"
                      >↺</button>
                    }
                  </div>

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
                </div>

                <!-- Anuncios vigentes, uno a uno, bajo el bloque «Anunțuri». -->
                @if (state.id === 'announcements' && blocks.announcementStates().length > 0) {
                  <ul class="items" role="list" [attr.aria-label]="'announcements.title' | translate">
                    @for (item of blocks.announcementStates(); track item.announcement.id) {
                      <li class="items__row" [class.is-off]="!item.visible">
                        <label class="items__switch">
                          <input
                            type="checkbox"
                            [checked]="item.visible"
                            [disabled]="!state.enabled"
                            (change)="setAnnouncementVisible(item.announcement.id, $event)"
                          />
                          <span class="items__box" aria-hidden="true"></span>
                          <span class="items__name">{{ item.announcement.title }}</span>
                        </label>
                      </li>
                    }
                    <li class="items__summary">
                      {{ 'blocks.announcements_summary' | translate: { shown: blocks.visibleAnnouncements().length, total: blocks.announcementStates().length } }}
                    </li>
                  </ul>
                }
              </li>
            }
          </ul>

          <footer class="blocks__foot">
            <p class="blocks__note">{{ 'blocks.min_one' | translate }}</p>
            @if (blocks.hasManualOverrides() || display.hasCustomDurations()) {
              <button type="button" class="blocks__reset" (click)="resetAll()">
                {{ 'blocks.reset' | translate }}
              </button>
            }
          </footer>

          <!-- Cómo se reparte el lienzo: QR sí/no y a qué tamaño. Sin QR el
               contenido ocupa toda la anchura; el tamaño sigue la regla 1:10
               (lado del QR ≈ distancia de escaneo / 10). -->
          <section class="qr" aria-labelledby="qr-settings-title">
            <h3 id="qr-settings-title" class="blocks__title">{{ 'blocks.qr_title' | translate }}</h3>

            <label class="blocks__switch qr__switch">
              <input
                type="checkbox"
                [checked]="display.qrVisible()"
                (change)="setQrVisible($event)"
              />
              <span class="blocks__track" aria-hidden="true"><span class="blocks__thumb"></span></span>
              <span class="blocks__label">
                <span class="blocks__name">{{ 'blocks.qr_show' | translate }}</span>
                <span class="blocks__hint">{{ 'blocks.qr_shortcut' | translate }}</span>
              </span>
            </label>

            <div class="qr__size" role="radiogroup" [attr.aria-label]="'blocks.qr_size' | translate">
              <span class="qr__size-label">{{ 'blocks.qr_size' | translate }}</span>
              <div class="qr__segments">
                @for (size of qrSizes; track size) {
                  <button
                    type="button"
                    role="radio"
                    class="qr__segment"
                    [class.is-active]="display.qrSize() === size"
                    [attr.aria-checked]="display.qrSize() === size"
                    [disabled]="!display.qrVisible()"
                    (click)="display.setQrSize(size)"
                  >
                    {{ 'blocks.qr_size_' + size | translate }}
                  </button>
                }
              </div>
            </div>
          </section>
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
        /* En proyección la raíz mide hasta 20px: el ancho va en rem para que
           crezca con el texto y las filas nunca desborden a los lados. */
        width: min(27rem, 92vw);
        max-height: min(80vh, 46rem);
        overflow-y: auto;
        overflow-x: hidden;
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
        padding: 0.35rem 0.4rem;
        border-radius: 10px;
        transition: background 0.2s ease, opacity 0.2s ease;

        &:hover {
          background: rgba(26, 54, 93, 0.05);
        }

        &.is-off .blocks__row {
          opacity: 0.55;
        }
      }

      .blocks__row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
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
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        font-size: 0.7rem;
        color: rgba(45, 55, 72, 0.7);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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

      /* --- Duración por bloque (−  12s  +) ------------------------------ */

      .duration {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: stretch;
        border: 1px solid rgba(26, 54, 93, 0.16);
        border-radius: 999px;
        background: #fff;
        overflow: hidden;

        &.is-custom {
          border-color: rgba(201, 162, 39, 0.7);
          background: rgba(201, 162, 39, 0.08);
        }
      }

      .duration__btn {
        border: 0;
        background: transparent;
        color: #1a365d;
        font-weight: 700;
        cursor: pointer;
        line-height: 1;

        &:disabled {
          cursor: default;
          opacity: 0.35;
        }

        &:not(:disabled):hover {
          background: rgba(26, 54, 93, 0.08);
        }

        &:focus-visible {
          outline: 2px solid #c9a227;
          outline-offset: -2px;
        }
      }

      .duration__btn {
        width: 24px;
        font-size: 0.95rem;
      }

      /* Segundos a mano: campo numérico sin flechas del navegador (ya están −/+). */
      .duration__input {
        width: 2.4rem;
        padding: 0.3rem 0;
        border: 0;
        background: transparent;
        color: #1a365d;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: center;
        -moz-appearance: textfield;
        appearance: textfield;

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          appearance: none;
          margin: 0;
        }

        &:focus-visible {
          outline: 2px solid #c9a227;
          outline-offset: -2px;
          border-radius: 6px;
        }
      }

      .duration__unit {
        align-self: center;
        margin-right: 2px;
        font-size: 0.65rem;
        font-weight: 600;
        color: rgba(45, 55, 72, 0.6);
      }

      .duration__reset {
        color: #8a6d10;
        border-left: 1px solid rgba(26, 54, 93, 0.12);
      }

      /* --- Anuncios individuales ---------------------------------------- */

      .items {
        list-style: none;
        margin: 0.35rem 0 0 0;
        padding: 0.3rem 0 0.1rem 2.9rem;
        display: grid;
        gap: 0.15rem;
        border-top: 1px dashed rgba(26, 54, 93, 0.12);
      }

      .items__row.is-off .items__name {
        color: rgba(45, 55, 72, 0.5);
        text-decoration: line-through;
      }

      .items__switch {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.2rem 0.3rem;
        border-radius: 8px;
        cursor: pointer;

        &:hover {
          background: rgba(26, 54, 93, 0.05);
        }

        input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        input:checked ~ .items__box {
          background: #1a365d;
          border-color: #1a365d;

          &::after {
            opacity: 1;
          }
        }

        input:disabled ~ .items__box,
        input:disabled ~ .items__name {
          opacity: 0.5;
          cursor: not-allowed;
        }

        input:focus-visible ~ .items__box {
          outline: 2px solid #c9a227;
          outline-offset: 2px;
        }
      }

      .items__box {
        flex: 0 0 auto;
        position: relative;
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1.5px solid rgba(26, 54, 93, 0.35);
        background: #fff;
        transition: background 0.15s ease, border-color 0.15s ease;

        &::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          opacity: 0;
        }
      }

      .items__name {
        font-size: 0.78rem;
        font-weight: 600;
        color: #2d3748;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .items__summary {
        padding: 0.15rem 0.3rem 0;
        font-size: 0.68rem;
        color: rgba(45, 55, 72, 0.62);
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

      /* --- Ajustes del QR ---------------------------------------------- */

      .qr {
        display: grid;
        gap: 0.55rem;
        margin-top: 0.8rem;
        padding-top: 0.7rem;
        border-top: 1px solid rgba(26, 54, 93, 0.1);
      }

      .qr__switch {
        padding: 0.35rem 0.4rem;
        border-radius: 10px;

        &:hover {
          background: rgba(26, 54, 93, 0.05);
        }
      }

      .qr__size {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
        padding: 0 0.4rem;
      }

      .qr__size-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #1a365d;
      }

      .qr__segments {
        display: inline-flex;
        padding: 2px;
        border-radius: 999px;
        border: 1px solid rgba(26, 54, 93, 0.16);
        background: rgba(26, 54, 93, 0.05);
      }

      .qr__segment {
        padding: 0.25rem 0.65rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #1a365d;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;

        &.is-active {
          background: #1a365d;
          color: #fff;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        &:focus-visible {
          outline: 2px solid #c9a227;
          outline-offset: 2px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .blocks__trigger,
        .blocks__track,
        .blocks__thumb,
        .blocks__item,
        .items__box,
        .qr__segment {
          transition: none;
        }
      }
    `,
    ]
})
export class PresentationSettingsComponent {
  protected readonly blocks = inject(PresentationBlocksService);
  protected readonly display = inject(PresentationDisplayService);
  protected readonly qrSizes = QR_SIZES;
  protected readonly durationMin = DURATION_MIN_S;
  protected readonly durationMax = DURATION_MAX_S;
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

  /** Segundos escritos a mano: se acotan a los límites y se reflejan en el campo. */
  protected setDuration(id: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const seconds = Number(input.value);
    if (Number.isFinite(seconds) && input.value.trim() !== '') {
      this.display.setDuration(id, seconds);
    }
    input.value = String(this.display.durationFor(id));
  }

  /** Intro en el campo de segundos: confirmar y soltar el foco. */
  protected commitDuration(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  protected setQrVisible(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.display.setQrVisible(input.checked);
  }

  protected setEnabled(id: PresentationBlockId, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.blocks.setEnabled(id, input.checked);
  }

  protected setAnnouncementVisible(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.blocks.setAnnouncementVisible(id, input.checked);
  }

  /** Bloques a automático, anuncios visibles y duraciones por defecto. */
  protected resetAll(): void {
    this.blocks.resetAll();
    this.display.resetDurations();
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
