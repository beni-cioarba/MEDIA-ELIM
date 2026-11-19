import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { LanguageService } from '../../core/services/language.service';
import { MapConsentService } from '../../core/services/map-consent.service';
import { IconComponent } from '../icon/icon.component';

/** Nivel de zoom del mapa incrustado: la manzana de la iglesia y sus calles. */
const MAP_ZOOM = 16;

/**
 * Mapa de la iglesia, **sólo si se pide**.
 *
 * Sustituye a los tres `<iframe>` de Google Maps que había (Contact, el bloque
 * de ubicación y Invitați): cada uno construía su URL y dos de ellos cargaban
 * el mapa nada más llegar a la página, con lo que Google recibía la visita
 * —y podía dejar cookies— sin que nadie lo hubiera pedido, además de ~1 MB de
 * su JavaScript.
 *
 * Ahora la caja enseña la dirección y un botón; el `<iframe>` se crea al
 * pulsarlo. La elección la guarda `MapConsentService`, así que vale para todas
 * las páginas y para las siguientes visitas.
 *
 * El tamaño lo pone quien lo usa: el anfitrión llena su caja (alto 100 %).
 *
 * `bypassSecurityTrustResourceUrl`: la URL se compone con la consulta
 * constante de `church.config.ts` y el idioma activo (`ro` | `es`); no entra
 * ningún dato del visitante.
 */
@Component({
  selector: 'app-map-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (consent.allowed()) {
      <iframe
        class="frame"
        [src]="url()"
        [title]="title()"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    } @else {
      <div class="gate">
        <span class="pin" aria-hidden="true"><app-icon name="map-pin" /></span>
        <p class="place">{{ config.location.address }}</p>
        <button type="button" class="show" (click)="consent.allow()">
          <app-icon name="globe" />
          {{ 'map.show' | translate }}
        </button>
        <p class="note">{{ 'map.note' | translate }}</p>
      </div>
    }
  `,
  styles: `
    @use 'ds' as *;

    /* La caja siempre es clara, como el propio mapa: va igual sobre una
       pagina clara que dentro de la tarjeta navy de Contact. Por eso fija
       su tinta (el texto de esa tarjeta es blanco) en vez de heredarla. */
    :host {
      display: block;
      height: 100%;
      min-height: 11rem;
      container-type: inline-size;
      color: var(--c-primary);
    }

    .frame {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }

    /* Papel cuadriculado con un claro en el centro: se lee como un mapa por
       cargar, no como un hueco roto. */
    .gate {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--sp-2);
      height: 100%;
      padding: var(--sp-4);
      text-align: center;
      background:
        radial-gradient(circle at 50% 45%, var(--c-bg-2) 0 22%, transparent 62%),
        repeating-linear-gradient(0deg, transparent 0 2.4rem, var(--c-hairline) 2.4rem 2.5rem),
        repeating-linear-gradient(90deg, transparent 0 2.4rem, var(--c-hairline) 2.4rem 2.5rem),
        var(--c-surface-2);
    }

    .pin {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: var(--c-primary);

      app-icon {
        transform: rotate(45deg);
        font-size: 1.2rem;
        color: var(--c-gold-soft);
      }
    }

    .place {
      margin: var(--sp-1) 0 0;
      max-width: 24rem;
      font-size: var(--fs-sm);
      font-weight: 700;
      line-height: 1.35;
    }

    .show {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 2.75rem;
      padding: 0.35rem 1.1rem;
      border: 1px solid var(--c-hairline-strong);
      border-radius: var(--r-pill);
      background: var(--c-bg-2);
      font: 600 var(--fs-sm) / 1.2 var(--font-sans);
      color: inherit;
      cursor: pointer;
      transition:
        background var(--mo-fast) var(--ea-standard),
        border-color var(--mo-fast) var(--ea-standard);

      &:hover {
        border-color: var(--c-primary);
        background: var(--c-veil);
      }

      --c-focus: var(--c-focus-on-light);
      @include focus-ring(2px);
    }

    .note {
      margin: 0;
      max-width: 22rem;
      font-size: var(--fs-xs);
      line-height: 1.4;
      color: var(--c-muted);
    }

    /* Caja baja y estrecha (la tarjeta de Contact en movil): fuera el pin,
       que es lo unico prescindible. */
    @container (max-width: 17rem) {
      .pin {
        display: none;
      }
    }

    @include motion-reduce {
      .show {
        transition: none;
      }
    }
  `,
})
export class MapEmbedComponent {
  /** Nombre accesible del mapa (ya traducido). */
  readonly title = input.required<string>();

  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly consent = inject(MapConsentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly language = inject(LanguageService);

  protected readonly url = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(this.config.location.mapsQuery)}` +
        `&hl=${this.language.current()}&z=${MAP_ZOOM}&output=embed`,
    ),
  );
}
