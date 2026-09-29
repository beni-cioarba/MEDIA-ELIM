import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { FamilyPrayerService } from '../../../core/services/family-prayer.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { FamilyPhotoComponent } from '../family-photo/family-photo.component';

/**
 * Acceso a la oración por las familias desde `/anunturi`.
 *
 * Es el aviso semanal que la congregación busca junto a los anuncios, pero no
 * es un anuncio (no caduca por fecha propia ni se redacta): es una vista de
 * la semana en curso. Por eso no se mete en `announcements` del config, sino
 * que se monta aquí y se alimenta del mismo `FamilyPrayerService`.
 *
 * Sin semana vigente no pinta nada.
 */
@Component({
  selector: 'app-family-prayer-teaser',
  imports: [RouterLink, TranslatePipe, IconComponent, FamilyPhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (prayer.current(); as week) {
      <a class="teaser" [routerLink]="link">
        <span class="teaser__photos" aria-hidden="true">
          @for (family of week.families; track family.id) {
            <app-family-photo class="teaser__photo" [family]="family" sizes="3rem" />
          }
        </span>
        <span class="teaser__text">
          <span class="teaser__eyebrow">
            <app-icon name="family" />
            {{ 'family_prayer.title' | translate }} · {{ prayer.formatRange(week) }}
          </span>
          <span class="teaser__title">{{ 'family_prayer.teaser_title' | translate: { names: surnames() } }}</span>
          <span class="teaser__cta">
            {{ 'family_prayer.teaser_cta' | translate }}
            <app-icon name="arrow-right" />
          </span>
        </span>
      </a>
    }
  `,
  styles: `
    @use 'ds' as *;

    :host {
      display: block;
    }

    .teaser {
      display: flex;
      align-items: center;
      gap: var(--sp-5);
      padding: var(--sp-4) var(--sp-5);
      border: 1px solid var(--c-hairline);
      border-left: 3px solid var(--c-gold);
      border-radius: var(--r-lg);
      background: var(--c-surface);
      color: inherit;
      text-decoration: none;
      transition: border-color var(--mo-fast) var(--ea-standard),
        box-shadow var(--mo-fast) var(--ea-standard);

      &:hover {
        border-color: var(--c-gold);
        box-shadow: var(--e-1);
      }

      &:focus-visible {
        @include focus-ring;
      }

      @include motion-reduce {
        transition: none;
      }
    }

    /* Fotos superpuestas, como un grupo: se lee «varias familias» de un
       vistazo sin pedir que se reconozca a nadie a este tamaño. */
    .teaser__photos {
      display: flex;
      flex: 0 0 auto;
    }

    .teaser__photo {
      width: 3rem;
      height: 3rem;
      border-radius: var(--r-md);
      box-shadow: 0 0 0 2px var(--c-surface);

      & + & {
        margin-left: -0.9rem;
      }
    }

    .teaser__text {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }

    .teaser__eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      font-size: var(--fs-xs);
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--c-gold-deep);
    }

    .teaser__title {
      font-family: var(--font-display);
      font-size: var(--fs-body-lg);
      font-weight: 700;
      line-height: 1.3;
      color: var(--c-primary);
    }

    .teaser__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--c-primary);
    }

    .teaser:hover .teaser__cta {
      color: var(--c-gold-deep);
    }

    /* Móvil: las fotos encima del texto; en fila se comían el ancho del título. */
    @include until('sm') {
      .teaser {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sp-3);
      }
    }
  `,
})
export class FamilyPrayerTeaserComponent {
  protected readonly prayer = inject(FamilyPrayerService);

  protected readonly link = `/${APP_PATHS.familyPrayer}`;

  /** «Bena, Bindea, Biriș și Bîrle»: apellidos de la semana, sin repetir. */
  protected readonly surnames = computed<string>(() => {
    const week = this.prayer.current();
    return week ? this.prayer.formatList([...new Set(week.families.map((f) => f.surname))]) : '';
  });
}
