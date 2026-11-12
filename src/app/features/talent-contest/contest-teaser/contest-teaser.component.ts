import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { LanguageService } from '../../../core/services/language.service';
import { TalentContestService } from '../../../core/services/talent-contest.service';
import { parseIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * Franja de la portada: que se sepa que el concurso existe y que tiene
 * página. Una sola línea en escritorio — qué es, cuánto falta para la fase
 * que toca y el acceso — en tarjeta blanca, como el resto de bloques de la
 * portada (12/11/2026; antes, la superficie navy del módulo).
 *
 * Usa sólo `TalentContestService` (fechas y cifras): los versículos viven en
 * `talent-contest.categories.ts` y no entran en el chunk de la portada.
 * Con la edición cerrada (sin fase por delante) no se pinta.
 */
@Component({
  selector: 'app-contest-teaser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  template: `
    @if (focus(); as phase) {
      <section class="tt" aria-labelledby="tt-title">
        <div class="tt__card">
          <div class="tt__id">
            <p class="tt__eyebrow">
              <span class="tt__dot" aria-hidden="true"></span>
              {{ 'talent_contest.eyebrow' | translate: { edition: config.edition } }}
            </p>
            <h2 class="tt__title" id="tt-title">{{ 'talent_contest.title' | translate }}</h2>
            <p class="tt__lead">{{ 'talent_contest.teaser.lead' | translate }}</p>
          </div>

          <p class="tt__count">
            @if (phase.status === 'live' || phase.daysLeft === 0) {
              <span class="tt__num">{{ 'talent_contest.countdown.today' | translate }}</span>
            } @else {
              <span class="tt__num">{{ phase.daysLeft }}</span>
              <span class="tt__unit">
                {{ (phase.daysLeft === 1 ? 'talent_contest.countdown.days_one' : 'talent_contest.countdown.days_other') | translate }}
              </span>
            }
            <span class="tt__phase">
              {{ (phase.status === 'live' ? 'talent_contest.countdown.live' : 'talent_contest.countdown.next') | translate }}:
              <b>{{ 'talent_contest.phases.' + phase.id | translate }}</b> · {{ date() }}
            </span>
          </p>

          <!-- Enlace «estirado»: toda la tarjeta es pulsable, pero el nombre
               accesible es sólo el del botón, no el bloque entero. -->
          <a class="tt__cta" [routerLink]="path">
            {{ 'talent_contest.teaser.cta' | translate }}
            <app-icon name="arrow-right" />
          </a>
        </div>
      </section>
    }
  `,
  styles: `
    @use 'ds' as *;

    :host {
      display: block;
    }

    .tt {
      padding: clamp(0.75rem, 2vh, 1.5rem) var(--page-gutter);
    }

    .tt__card {
      position: relative;
      isolation: isolate;
      display: grid;
      gap: var(--sp-4);
      max-width: var(--page-max);
      margin-inline: auto;
      padding: clamp(0.9rem, 1.2vw, 1.15rem) clamp(1.1rem, 2vw, 1.5rem);
      overflow: hidden;
      border: 1px solid rgb(26 54 93 / 0.1);
      border-radius: 18px;
      color: var(--c-text);
      background: var(--c-surface);
      transition: border-color var(--mo-base) var(--ea-standard);

      &:hover {
        border-color: var(--c-hairline-strong);
      }

      // El anillo, en la tarjeta (el enlace estirado la cubre). Escrito a
      // mano: el mixin focus-ring aquí dentro generaba
      // «…:has(…):focus-visible», que nunca casa, y la tarjeta se quedaba
      // sin anillo de foco (auditoría del 12/11/2026).
      &:has(.tt__cta:focus-visible) {
        outline: 2px solid var(--c-focus);
        outline-offset: 3px;
      }
    }

    @include from('lg') {
      .tt__card {
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: clamp(1.5rem, 3vw, 3rem);
      }
    }

    .tt__eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--c-gold-deep);
    }

    .tt__dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: var(--c-gold);
      box-shadow: 0 0 0 3px rgb(212 175 55 / 0.22);
    }

    .tt__title {
      margin: 0.3rem 0 0;
      font-family: var(--font-display);
      font-size: clamp(1.4rem, 1.1rem + 1vw, 1.85rem);
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.015em;
      padding-bottom: 0.1em;
      color: var(--c-primary);
    }

    // Sin tope de medida: es una frase, y en escritorio cabe en una línea.
    .tt__lead {
      margin: 0.2rem 0 0;
      max-width: none;
      font-size: 0.92rem;
      line-height: 1.5;
      color: var(--c-muted);
    }

    // Cuenta atrás: la cifra grande manda; la fase y la fecha, debajo.
    // \`auto 1fr\`: la fila de la fase ocupa las dos columnas y, con \`auto auto\`,
    // el ancho sobrante separaba la unidad de la cifra.
    .tt__count {
      display: grid;
      grid-template-columns: auto 1fr;
      justify-content: start;
      align-items: baseline;
      column-gap: 0.4rem;
      margin: 0;
    }

    @include from('lg') {
      .tt__count {
        padding-inline: clamp(1.25rem, 2.5vw, 2.25rem);
        border-inline: 1px solid var(--c-hairline);
      }
    }

    .tt__num {
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 1.8rem + 1.5vw, 2.9rem);
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--c-gold-deep);
    }

    .tt__unit {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--c-muted);
    }

    .tt__phase {
      grid-column: 1 / -1;
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--c-muted);
      white-space: nowrap;

      b {
        font-weight: 700;
        color: var(--c-primary);
      }
    }

    .tt__cta {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      min-height: 2.6rem;
      padding-inline: 1.1rem;
      border-radius: var(--r-pill);
      background: var(--c-primary);
      font-size: 0.9rem;
      font-weight: 700;
      white-space: nowrap;
      text-decoration: none;
      color: var(--c-on-primary);
      outline: none;
      transition: background-color var(--mo-base) var(--ea-standard);

      &:hover {
        background: var(--c-primary-deep);
      }

      // Enlace estirado: cubre toda la tarjeta.
      &::after {
        content: '';
        position: absolute;
        inset: 0;
      }
    }

    @include motion-reduce {
      .tt__card,
      .tt__cta {
        transition: none;
      }
    }
  `,
})
export class ContestTeaserComponent {
  private readonly contest = inject(TalentContestService);
  private readonly language = inject(LanguageService);

  protected readonly config = this.contest.config;
  protected readonly focus = this.contest.focusPhase;
  protected readonly path = `/${APP_PATHS.talentContest}`;

  /** «20 mar.» de la fase que toca, en el idioma activo. */
  protected readonly date = computed(() => {
    const phase = this.focus();
    return phase
      ? new Intl.DateTimeFormat(this.language.current(), { day: 'numeric', month: 'short' }).format(
          parseIsoDate(phase.start),
        )
      : '';
  });
}
