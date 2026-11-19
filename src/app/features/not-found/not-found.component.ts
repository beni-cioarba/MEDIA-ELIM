import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { IconComponent } from '../../shared/icon/icon.component';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';

/**
 * Página «no encontrada»: destino de la ruta comodín.
 *
 * Antes, cualquier dirección desconocida redirigía en silencio a la portada:
 * quien abría un enlace mal copiado o caducado veía la portada sin saber que
 * el enlace estaba mal, y volvía a pedirlo. Aquí se le dice qué ha pasado y
 * se le dan las salidas.
 *
 * Las secciones salen de `MAIN_NAV` (primer nivel, sin la portada —que ya es
 * el botón principal— ni las llamadas a la acción): un módulo nuevo aparece
 * aquí solo.
 *
 * `noindex` en su ruta. El estado HTTP ya es 404: GitHub Pages sirve
 * `404.html` (copia de `index.html`) con ese estado para toda dirección sin
 * página estática.
 */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, PageSectionComponent],
  template: `
    <header class="page-hero">
      <div class="page-hero__inner">
        <p class="page-hero__eyebrow">{{ 'not_found.eyebrow' | translate }}</p>
        <h1 class="page-hero__title">{{ 'not_found.title' | translate }}</h1>
        <p class="page-hero__lead">{{ 'not_found.lead' | translate }}</p>
        <a class="btn btn--gold nf__home" [routerLink]="homePath">
          <app-icon name="home" />
          {{ 'not_found.home' | translate }}
        </a>
      </div>
    </header>

    <app-page-section titleKey="not_found.sections_title">
      <ul class="ui-list nf__list" role="list">
        @for (section of sections; track section.id) {
          <li>
            <a class="ui-row ui-row--interactive nf__row" [routerLink]="section.path">
              @if (section.icon; as icon) {
                <app-icon class="nf__icon" [name]="icon" />
              }
              <span class="nf__text">
                <span class="nf__label">{{ section.labelKey | translate }}</span>
                @if (section.descriptionKey; as description) {
                  <span class="nf__desc">{{ description | translate }}</span>
                }
              </span>
              <app-icon class="nf__go" name="chevron-right" />
            </a>
          </li>
        }
      </ul>
    </app-page-section>
  `,
  styles: `
    @use 'ds' as *;
    @use '../../shared/styles/page-hero' as *;
    @use '../../shared/styles/buttons' as *;

    :host {
      display: block;
    }

    .nf__home {
      margin-top: var(--sp-5);
    }

    /* Una sola columna de lectura: son cinco destinos, no un mosaico. */
    .nf__list {
      max-width: 40rem;
      border: 1px solid var(--c-hairline);
      border-radius: var(--r-card);
      background: var(--c-surface);
      overflow: hidden;
    }

    /* Fila de dos líneas (rótulo + entradilla): alto propio, no el de una
       bandeja de una línea, y de sobra por encima de los 44 px táctiles. */
    .nf__row {
      gap: var(--sp-3);
      padding-block: var(--sp-3);
    }

    .nf__icon {
      flex: 0 0 auto;
      font-size: 1.25rem;
      color: var(--c-gold-deep);
    }

    .nf__text {
      display: grid;
      gap: 0.15rem;
      flex: 1 1 auto;
      min-width: 0;
    }

    .nf__label {
      font-weight: 600;
      color: var(--c-text);
    }

    .nf__desc {
      font-size: var(--fs-sm);
      line-height: 1.4;
      color: var(--c-muted);
    }

    .nf__go {
      flex: 0 0 auto;
      color: var(--c-muted);
    }
  `,
})
export class NotFoundComponent {
  protected readonly homePath = `/${APP_PATHS.home}`;

  /** Primer nivel del menú: sin la portada ni las llamadas a la acción. */
  protected readonly sections = MAIN_NAV.filter((item) => !item.cta && item.id !== 'home');
}
