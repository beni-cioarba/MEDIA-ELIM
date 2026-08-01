import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/** Tamaños canónicos. Se traducen a un único token (`--brand-size`). */
export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Fondo sobre el que se pinta la marca. */
export type BrandLogoTone = 'light' | 'dark';

/**
 * Marca de la iglesia — **única fuente de verdad visual**.
 *
 * Antes había tres marcas distintas conviviendo: el wordmark tipográfico de la
 * cabecera, un `logo-elim.webp` en el pie y otro en el escenario proyectable.
 * Tres cosas que cambiar cada vez que se retoca la identidad y tres formas
 * distintas de leerse. Ahora hay **una**, y todo lo demás la referencia.
 *
 * ── Por qué tipografía y no imagen ────────────────────────────────────
 * · Pesa 0 kB y no añade una petición de red al primer pintado.
 * · Escala sin perder nitidez: el mismo componente sirve para 1,3 rem en el
 *   pie y para 5 rem en el proyector de la iglesia.
 * · Hereda el color del tema, así que funciona sobre fondo claro y oscuro sin
 *   mantener dos ficheros.
 * · Es texto real: buscadores y lectores de pantalla lo leen.
 *
 * ── Cómo se autoajusta ────────────────────────────────────────────────
 * La línea de la localidad se justifica al ancho **real** de «ELIM» en tres
 * pasos, para que ambas líneas terminen a la vez y no quede un margen suelto
 * a la derecha:
 *
 *  1. La rejilla tiene una sola columna `max-content`, así que su ancho lo fija
 *     el nombre.
 *  2. `letter-spacing` añade espacio *después* de la última letra; el
 *     `margin-inline-end` negativo lo descuenta y, al ser una rejilla, además
 *     reduce lo que el nombre aporta a la columna.
 *  3. La localidad no aporta ancho (`width: 0; min-width: 100%`) y reparte la
 *     holgura con `text-align-last: justify`.
 *
 * El tamaño de la localidad **deriva** del nombre (`calc(… * 0.289)`), así que
 * la proporción se mantiene en cualquier medida y nunca puede partirse en dos
 * líneas por un ajuste manual olvidado.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 * ```html
 * <app-brand-logo />                                  <!-- cabecera -->
 * <app-brand-logo tone="dark" size="lg" />            <!-- pie -->
 * <app-brand-logo size="xl" [link]="null" />          <!-- proyección -->
 * ```
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, TranslateModule],
  template: `
    <!-- El nombre completo viaja en aria-label: en pantalla se lee «ELIM» +
         localidad, pero el lector debe anunciar «Biserica Elim». -->
    @if (link) {
      <a class="brand" [routerLink]="link" [attr.aria-label]="'brand.name' | translate">
        <ng-container *ngTemplateOutlet="mark" />
      </a>
    } @else {
      <span class="brand" role="img" [attr.aria-label]="'brand.name' | translate">
        <ng-container *ngTemplateOutlet="mark" />
      </span>
    }

    <ng-template #mark>
      <span class="brand__name">{{ 'brand.short' | translate }}</span>
      @if (showLocation) {
        <span class="brand__city">{{ 'brand.location' | translate }}</span>
      }
    </ng-template>
  `,
  styles: [
    `
      @use 'ds' as *;

      :host {
        display: inline-block;
        line-height: 1;
      }

      // Escala. Un único token gobierna todo el bloque: el nombre lo usa tal
      // cual y la localidad deriva de él, así la proporción es inmutable.
      :host(.is-sm) {
        --brand-size: 1.3rem;
      }
      // La medida de la cabecera es fluida: en móvil baja a 1.6rem sola, sin
      // que el consumidor tenga que reajustarla por breakpoint (y sin que la
      // localidad se parta en dos líneas, que es lo que pasaba antes).
      :host(.is-md) {
        --brand-size: clamp(1.6rem, 5vw, 1.8rem);
      }
      :host(.is-lg) {
        --brand-size: 2.25rem;
      }
      // El proyector está a varios metros del banco más lejano: aquí manda el
      // ancho de la pantalla, no la escala tipográfica de la web.
      :host(.is-xl) {
        --brand-size: clamp(2.5rem, 5vw, 4.5rem);

        // Portátiles y proyectores apaisados con poca altura: si no se
        // recorta, la marca se come la fila del contenido.
        @include short-landscape {
          --brand-size: clamp(2rem, 3.5vw, 3rem);
        }
      }

      :host(.is-light) {
        --brand-ink: var(--c-primary);
        --brand-ink-hover: var(--c-primary-deep);
        --brand-accent: var(--c-gold-deep);
      }
      :host(.is-dark) {
        --brand-ink: var(--c-on-primary);
        --brand-ink-hover: var(--c-gold-soft);
        --brand-accent: var(--c-gold);
      }

      .brand {
        display: grid;
        grid-template-columns: max-content;
        row-gap: 0.14em;
        line-height: 1;
        text-decoration: none;
        color: inherit;
      }

      .brand__name {
        justify-self: start;
        font-family: var(--font-serif);
        font-size: var(--brand-size);
        font-weight: 600;
        // El tracking es lo que da el aire de marca institucional; el margen
        // negativo devuelve el hueco que deja tras la «M».
        letter-spacing: 0.22em;
        margin-inline-end: -0.22em;
        text-transform: uppercase;
        color: var(--brand-ink);
        transition: color var(--mo-base) var(--ea-standard);
      }

      .brand__city {
        width: 0; // no aporta ancho a la columna…
        min-width: 100%; // …pero la ocupa entera
        font-size: calc(var(--brand-size) * 0.289);
        font-weight: 600;
        letter-spacing: 0.06em;
        margin-inline-end: -0.06em;
        text-transform: uppercase;
        // Requiere ≥2 palabras y es incompatible con white-space: nowrap.
        text-align-last: justify;
        color: var(--brand-accent);
        transition: color var(--mo-base) var(--ea-standard);
      }

      a.brand:hover .brand__name,
      a.brand:focus-visible .brand__name {
        color: var(--brand-ink-hover);
      }

      a.brand:focus-visible {
        @include focus-ring(4px);
      }

      @include motion-reduce {
        .brand__name,
        .brand__city {
          transition: none;
        }
      }
    `,
  ],
})
export class BrandLogoComponent {
  /** Escala. `xl` es la del proyector y es fluida con el ancho de pantalla. */
  @Input() size: BrandLogoSize = 'md';

  /** Fondo sobre el que va: decide la tinta y el acento, no hay dos ficheros. */
  @Input() tone: BrandLogoTone = 'light';

  /** Ruta interna del enlace. `null` la pinta como imagen no navegable. */
  @Input() link: string | null = '/';

  /** La segunda línea se puede omitir en espacios muy estrechos. */
  @Input() showLocation = true;

  @HostBinding('class')
  protected get hostClass(): string {
    return `is-${this.size} is-${this.tone}`;
  }
}
