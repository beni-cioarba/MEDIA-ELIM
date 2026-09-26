import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

/**
 * Marca de la iglesia ELIM — el **wordmark** tipográfico: «ELIM» sobre
 * «ARGANDA DEL REY». Es la única representación de la iglesia dentro de la
 * interfaz (el emblema sólo vive en el icono de la app; ver el README).
 *
 * **Autocontenido a propósito**, como `app-ineb-logo`: paleta y tipografías
 * propias con valores de marca literales, sin tokens de la app ni mixins. La
 * carpeta se copia tal cual a otro proyecto Angular y funciona igual; sólo
 * hace falta cargar Playfair Display 600 e Inter 600 (Google Fonts). La
 * traducción del nombre accesible es opcional: si hay `TranslateService`, usa
 * `brand.name`; si no, `label` o el nombre por defecto.
 *
 * ── Por qué tipografía y no imagen ────────────────────────────────────
 * · Pesa 0 kB y no añade una petición de red al primer pintado.
 * · Escala sin perder nitidez: el mismo componente sirve para 24 px en una
 *   barra y para 90 px en el proyector del templo.
 * · Dos tintas (claro / oscuro) en un solo componente, sin dos ficheros.
 * · Es texto real: buscadores y lectores de pantalla lo leen.
 *
 * ── Cómo se autoajusta ────────────────────────────────────────────────
 * Todo deriva de un único tamaño, `--brand-size` (el cuerpo de «ELIM»):
 * la localidad mide 0,289 de él y el hueco entre líneas 0,14; así la
 * proporción es fija a cualquier medida. La localidad se justifica al ancho
 * **real** de «ELIM» en tres pasos, para que ambas líneas terminen a la vez:
 *
 *  1. La rejilla tiene una sola columna `max-content`: su ancho lo fija el
 *     nombre.
 *  2. `letter-spacing` añade espacio *después* de la última letra; el
 *     `margin-inline-end` negativo lo descuenta, de modo que la columna mide
 *     tinta y no la caja con el hueco fantasma.
 *  3. La localidad no aporta ancho (`width: 0; min-width: 100%`) y reparte la
 *     holgura con `text-align-last: justify`.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 * ```html
 * <app-brand-logo />                                  <!-- cabecera: md, claro -->
 * <app-brand-logo tone="dark" size="lg" />            <!-- pie -->
 * <app-brand-logo size="xl" [link]="null" />          <!-- proyección: imagen no navegable -->
 * <app-brand-logo size="sm" [showLocation]="false" /> <!-- compacta: sólo el nombre -->
 * <app-brand-logo [mono]="true" />                    <!-- una tinta (sello, grabado) -->
 * <app-brand-logo size="context" link="https://…" />  <!-- otra app: tamaño del contexto, enlace externo -->
 * ```
 */

/** Escalas. `context` deja el tamaño al `--brand-size` del consumidor (24 px si nadie lo fija). */
export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'context';

/** Fondo sobre el que se pinta: decide tinta y acento. No hay dos ficheros, hay dos tintas. */
export type BrandLogoTone = 'light' | 'dark';

/** Nombre accesible por defecto cuando no hay traducción ni `label`. */
const DEFAULT_LABEL = 'Biserica Elim';

@Component({
    selector: 'app-brand-logo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet, RouterLink],
    host: { '[class]': 'hostClass()' },
    template: `
    <!-- En pantalla se lee «ELIM» + localidad; el lector anuncia el nombre completo. -->
    @if (external()) {
      <!-- Fuera de la app (p. ej. desde la app administrativa hacia la web): pestaña nueva. -->
      <a class="brand" [href]="link()" target="_blank" rel="noopener noreferrer" [attr.aria-label]="ariaLabel()">
        <ng-container *ngTemplateOutlet="mark" />
      </a>
    } @else if (link() !== null) {
      <a class="brand" [routerLink]="link()" [attr.aria-label]="ariaLabel()">
        <ng-container *ngTemplateOutlet="mark" />
      </a>
    } @else {
      <span class="brand" role="img" [attr.aria-label]="ariaLabel()">
        <ng-container *ngTemplateOutlet="mark" />
      </span>
    }

    <ng-template #mark>
      <span class="brand__name">{{ name() }}</span>
      @if (showLocation()) {
        <span class="brand__city">{{ location() }}</span>
      }
    </ng-template>
  `,
    styles: `
    :host {
      display: inline-block;
      line-height: 1;
      /* Paleta de marca (coincide con navy 700/800 y oro 500/700/300 de la app, pero se
         declara aquí a propósito: el wordmark es la marca, no el tema de una app). Se puede
         sobrescribir desde fuera, pero entonces ya no es la marca. */
      --brand-navy: #1a365d;
      --brand-navy-deep: #122844;
      --brand-gold: #d4af37;
      /* Oro accesible: con el anterior (#9c7a1e) la línea «ARGANDA DEL REY»
         daba 4,03:1 sobre el lienzo y no llegaba al 4,5 de la AA. */
      --brand-gold-deep: #856618;
      --brand-gold-soft: #e3c766;
      --brand-paper: #faf9f6;
      /* Playfair Display 600 para el nombre, Inter 600 para la localidad. Las carga la app
         (Google Fonts); sin ellas se usa el fallback y la marca pierde su forma. */
      --brand-font-name: 'Playfair Display', Georgia, 'Times New Roman', serif;
      --brand-font-location: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }

    /* ── Escala ─────────────────────────────────────────────────────────────
       Un único tamaño gobierna todo el bloque. Se declara en el host por preset;
       el preset "context" no declara nada y los hijos leen el del consumidor (24 px si falta). */
    :host(.is-sm) { --brand-size: 24px; }                        /* mínimo de la forma completa */
    :host(.is-md) { --brand-size: clamp(24px, 5vw, 1.8rem); }     /* cabecera: fluida, nunca bajo el mínimo */
    :host(.is-lg) { --brand-size: 2.25rem; }                      /* pie */
    :host(.is-xl) { --brand-size: clamp(2.5rem, 5vw, 4.5rem); }   /* proyector: manda el ancho de pantalla */
    /* Portátiles y proyectores apaisados con poca altura: si no se recorta, la marca
       se come la fila del contenido. */
    @media (orientation: landscape) and (max-height: 720px) {
      :host(.is-xl) { --brand-size: clamp(2rem, 3.5vw, 3rem); }
    }

    /* ── Tintas ─────────────────────────────────────────────────────────────
       Claro: navy + oro profundo (el oro claro no contrasta sobre alabastro).
       Oscuro: papel + oro (el oro profundo no contrasta sobre navy). */
    :host(.is-light) {
      --brand-ink: var(--brand-navy);
      --brand-ink-hover: var(--brand-navy-deep);
      --brand-accent: var(--brand-gold-deep);
    }
    :host(.is-dark) {
      --brand-ink: var(--brand-paper);
      --brand-ink-hover: var(--brand-gold-soft);
      --brand-accent: var(--brand-gold);
    }
    /* Una sola tinta (sello, grabado, bordado, fotocopia): la localidad toma la del nombre. */
    :host(.is-mono) {
      --brand-accent: var(--brand-ink);
      --brand-ink-hover: var(--brand-ink);
    }

    .brand {
      display: grid;
      grid-template-columns: max-content;
      /* El hueco entre líneas deriva del tamaño de marca, no del cuerpo del contexto. */
      row-gap: calc(var(--brand-size, 24px) * 0.14);
      line-height: 1;
      text-decoration: none;
      color: inherit;
      border-radius: 2px;
    }

    .brand__name {
      justify-self: start;
      font-family: var(--brand-font-name);
      font-size: var(--brand-size, 24px);
      font-weight: 600;
      /* El tracking es lo que da el aire de marca institucional; el margen negativo
         devuelve el hueco que deja tras la «M». */
      letter-spacing: 0.22em;
      margin-inline-end: -0.22em;
      text-transform: uppercase;
      color: var(--brand-ink);
      transition: color 200ms ease;
    }

    .brand__city {
      width: 0;            /* no aporta ancho a la columna… */
      min-width: 100%;     /* …pero la ocupa entera */
      font-family: var(--brand-font-location);
      font-size: calc(var(--brand-size, 24px) * 0.289);
      font-weight: 600;
      letter-spacing: 0.06em;
      margin-inline-end: -0.06em;
      text-transform: uppercase;
      /* Exige 2+ palabras y es incompatible con white-space: nowrap. */
      text-align-last: justify;
      color: var(--brand-accent);
      transition: color 200ms ease;
    }

    a.brand:hover .brand__name,
    a.brand:focus-visible .brand__name {
      color: var(--brand-ink-hover);
    }

    /* Anillo de foco: el de la app si define --c-focus; si no, oro 600 de la marca. */
    a.brand:focus-visible {
      outline: 2px solid var(--c-focus, #bf9a2b);
      outline-offset: 4px;
    }
    a.brand:focus:not(:focus-visible) {
      outline: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .brand__name,
      .brand__city {
        transition: none;
      }
    }
  `
})
export class BrandLogoComponent {
  /** Escala. `xl` es la del proyector y es fluida con el ancho de pantalla. */
  readonly size = input<BrandLogoSize>('md');

  /** Fondo sobre el que va: decide la tinta y el acento. */
  readonly tone = input<BrandLogoTone>('light');

  /**
   * A dónde lleva: una ruta interna (`'/'`), una dirección completa (`https://…`,
   * se abre en pestaña nueva) o `null` para pintarla como imagen no navegable.
   */
  readonly link = input<string | null>('/');

  /** La segunda línea se omite en espacios estrechos (forma compacta, mínimo 16 px). */
  readonly showLocation = input(true);

  /** Una sola tinta: reproducciones que no admiten el acento dorado. */
  readonly mono = input(false);

  /** Textos de la marca. Son constantes de identidad, no traducciones. */
  readonly name = input('Elim');
  readonly location = input('Arganda del Rey');

  /**
   * Nombre accesible. Vacío = el traducido (`brand.name`) si la app tiene
   * ngx-translate, o «Biserica Elim» si no.
   */
  readonly label = input('');

  private readonly translate = inject(TranslateService, { optional: true });

  /** `stream` emite el valor actual y cada cambio de idioma; sin traductor, nada. */
  private readonly translatedLabel = toSignal(
    this.translate ? this.translate.stream('brand.name') : of(''),
    { initialValue: '' },
  );

  protected readonly ariaLabel = computed<string>(() => {
    const explicit = this.label();
    if (explicit) return explicit;
    const translated = this.translatedLabel();
    // Sin traducción cargada, `stream` devuelve la propia clave.
    return translated && translated !== 'brand.name' ? translated : DEFAULT_LABEL;
  });

  protected readonly external = computed<boolean>(() => this.link()?.startsWith('http') ?? false);

  protected readonly hostClass = computed<string>(
    () => `is-${this.size()} is-${this.tone()}${this.mono() ? ' is-mono' : ''}`,
  );
}
