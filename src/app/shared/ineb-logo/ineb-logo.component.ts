import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Componente de marca de INEB. **Autocontenido a propósito**: no depende de nada de esta app
 * (ni tokens, ni i18n, ni servicios), así que la carpeta se copia tal cual a otro proyecto
 * Angular y funciona. Para otras tecnologías, el SVG plano y la especificación completa están
 * en el README que acompaña a este fichero.
 *
 * Esta carpeta es **la misma** que `shared/ui/ineb-logo/` de la app administrativa
 * (INEB_ELIM_Administrativ). Si la marca cambia, se corrige en una y se copia la carpeta
 * entera a la otra; no se hacen retoques locales.
 *
 * Geometría medida sobre el arte original a 6000×1875 (1 unidad del `viewBox` = 50 px de aquel
 * lienzo), así que cada número de los trazados es una medida, no un tanteo. Los `viewBox` van
 * **a ras de tinta**: el alto que pida el contexto es el alto real del logotipo, sin aire.
 *
 * Correcciones que el arte no traía y un ojo entrenado pide:
 *  - **desbordamiento óptico**: los cuencos de la B y la C de TECH sobresalen de la línea de las
 *    letras planas, porque una forma redonda a la misma altura se ve más pequeña;
 *  - **grosores coherentes** en TECH: un solo asta (1,76) y barras más finas (1,26–1,40);
 *  - **centrado y tracking** repartidos a partes iguales dentro de la placa.
 *
 * El rojo de marca no cambia con el fondo: es lo que le da vida, y su contraste (3,9 sobre el
 * navy) sobra para un logotipo de este tamaño y peso.
 */

/** Fondo sobre el que se pinta: decide la tinta del nombre. No hay dos ficheros, hay dos tintas. */
export type InebLogoTone = 'light' | 'dark';

/**
 * Formas de la marca. Cada una tiene su tamaño mínimo:
 *  - `lockup`  — la completa: placa TECH sobre «IN», y «EB» a toda altura. **Mínimo 32 px de alto**;
 *                por debajo «TECH» deja de leerse y estorba.
 *  - `compact` — la palabra en una línea, a un solo tamaño y con los dos colores. **Mínimo 16 px**:
 *                es la que vale para barras estrechas, firmas de correo o anchos justos.
 *  - `mark`    — el isotipo: el bloque izquierdo (placa + «IN») en un cuadrado. Para favicon, avatar,
 *                icono de app o cualquier hueco cuadrado. **Mínimo 16×16**.
 *  - `auto`    — la completa donde cabe y la compacta donde no, resuelto en CSS y sin JavaScript.
 */
export type InebLogoVariant = 'lockup' | 'compact' | 'mark' | 'auto';

@Component({
  selector: 'app-ineb-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `
    @if (variant() === 'lockup' || variant() === 'auto') {
      <svg class="ineb ineb--lockup" viewBox="0 0 118.2 35.5" fill="none"
           [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null"
           [attr.aria-hidden]="label() ? null : true">
        <!-- Placa y «IN» comparten borde izquierdo y derecho (0 y 38,9), que es la intención del
             diseño original; en el arte bailaban una décima. -->
        <rect y="1.26" width="38.9" height="8.22" [attr.fill]="plate()"/>

        <!-- TECH: astas de 1,76, barras de 1,40 y altura 5,46, centrado en la placa y con los tres
             huecos a partes iguales. La C es un anillo con los remates cortados en horizontal y
             una abertura de 0,98 (el 17 % de la letra); más gruesa de lado que por arriba y abajo,
             igual que las astas frente a las barras. -->
        <g [attr.fill]="plateInk()">
          <path d="M1.63 2.64h5.32v1.4H5.17v4.06H3.41V4.04H1.63z"/>
          <path d="M11.98 2.64h4.78v1.32h-3.02v.74h2.6v1.26h-2.6v.82h3.02v1.32h-4.78z"/>
          <path d="M31.83 2.64h1.76v2.03h1.92V2.64h1.76v5.46h-1.76V6.07h-1.92v2.03h-1.76z"/>
          <path fill-rule="evenodd" clip-rule="evenodd"
                d="M26.81 4.88A2.53 2.81 0 1 0 26.81 5.86H25.01A.73 1.49 0 1 1 25.01 4.88z"/>
        </g>

        <!-- IN: mismo ancho que la placa y misma línea base que EB. -->
        <g [attr.fill]="ink()">
          <rect y="11.2" width="7.7" height="23.8"/>
          <path d="M15 11.2h7.1l9.8 12.5V11.2h7v23.8h-7l-9.8-11.6v11.6H15z"/>
        </g>

        <!-- EB. Las tres barras de la E y los dos contrapuntos de la B comparten alturas; la barra
             central es más corta y el cuenco de abajo, más ancho que el de arriba. La B desborda
             medio punto por arriba y por abajo la línea de la E. -->
        <path [attr.fill]="red()" d="M46.8 .5h29.8v8.3H57.8v4.8h16.1V21.5H57.8v5.3h19.1v8.2H46.8z"/>
        <path [attr.fill]="red()" fill-rule="evenodd" clip-rule="evenodd"
              d="M85 0h26.5a5.8 8.55 0 0 1 .2 17.1 6.95 9.2 0 0 1-.9 18.4H85zM96 8.8h7.7a2.4 2.4 0 0 1 0 4.8H96zM96 21.5h8.25a2.65 2.65 0 0 1 0 5.3H96z"/>
      </svg>
    }

    @if (variant() === 'compact' || variant() === 'auto') {
      <!-- Compacta: las mismas letras (la I y la N a escala 1,4375 para igualar la altura de E y B)
           con un tracking único de 8. Conserva los dos colores —son la marca—: lo que partía la
           palabra en la completa no era el color, sino la diferencia de altura y la placa encima.
           Si se cambia una letra, cambia en los tres bloques. -->
      <svg class="ineb ineb--compact" viewBox="0 0 132.7 35.5" fill="none"
           [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null"
           [attr.aria-hidden]="label() ? null : true">
        <g [attr.fill]="ink()">
          <rect y=".5" width="11.07" height="34.5"/>
          <g transform="translate(-2.49,-15.6) scale(1.4375)">
            <path d="M15 11.2h7.1l9.8 12.5V11.2h7v23.8h-7l-9.8-11.6v11.6H15z"/>
          </g>
        </g>
        <g [attr.fill]="red()">
          <path transform="translate(14.63,0)" d="M46.8 .5h29.8v8.3H57.8v4.8h16.1V21.5H57.8v5.3h19.1v8.2H46.8z"/>
          <path transform="translate(14.53,0)" fill-rule="evenodd" clip-rule="evenodd"
                d="M85 0h26.5a5.8 8.55 0 0 1 .2 17.1 6.95 9.2 0 0 1-.9 18.4H85zM96 8.8h7.7a2.4 2.4 0 0 1 0 4.8H96zM96 21.5h8.25a2.65 2.65 0 0 1 0 5.3H96z"/>
        </g>
      </svg>
    }

    @if (variant() === 'mark') {
      <!-- Isotipo: el bloque izquierdo de la marca (placa + «IN») centrado en un cuadrado. No es un
           dibujo nuevo, es un recorte del logotipo, así que se reconoce al lado de la versión larga.
           Con la entrada tile pinta además el cuadro navy, que es lo que pide un favicon. -->
      <svg class="ineb ineb--mark" viewBox="0 0 48 48" fill="none"
           [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null"
           [attr.aria-hidden]="label() ? null : true">
        @if (tile()) { <rect width="48" height="48" [attr.fill]="tileFill()"/> }
        <g transform="translate(4.3,5.62) scale(1.013)">
          <rect y="1.26" width="38.9" height="8.22" [attr.fill]="plate()"/>
          <g [attr.fill]="plateInk()">
            <path d="M1.63 2.64h5.32v1.4H5.17v4.06H3.41V4.04H1.63z"/>
            <path d="M11.98 2.64h4.78v1.32h-3.02v.74h2.6v1.26h-2.6v.82h3.02v1.32h-4.78z"/>
            <path d="M31.83 2.64h1.76v2.03h1.92V2.64h1.76v5.46h-1.76V6.07h-1.92v2.03h-1.76z"/>
            <path fill-rule="evenodd" clip-rule="evenodd"
                  d="M26.81 4.88A2.53 2.81 0 1 0 26.81 5.86H25.01A.73 1.49 0 1 1 25.01 4.88z"/>
          </g>
          <g [attr.fill]="markInk()">
            <rect y="11.2" width="7.7" height="23.8"/>
            <path d="M15 11.2h7.1l9.8 12.5V11.2h7v23.8h-7l-9.8-11.6v11.6H15z"/>
          </g>
        </g>
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
      /* Paleta de INEB, medida sobre el arte original. Se puede sobrescribir desde fuera, pero
         entonces ya no es la marca: hazlo solo para casos de una tinta. */
      --ineb-yellow: #ffd230;
      --ineb-red: #ff3131;
      --ineb-navy: #10144a;
      --ineb-paper: #ffffff;
    }
    .ineb { display: block; height: var(--ineb-size, 40px); width: auto; }
    /* El isotipo es cuadrado: manda el lado, no el alto de una línea de texto. */
    .ineb--mark { height: var(--ineb-size, 48px); width: var(--ineb-size, 48px); }

    /* En modo auto, la completa solo donde cabe con holgura. El corte va por ancho de ventana
       porque de él suele depender el alto disponible. */
    :host(.v-auto) .ineb--lockup { display: none; }
    @media (min-width: 600px) {
      :host(.v-auto) .ineb--lockup { display: block; }
      :host(.v-auto) .ineb--compact { display: none; }
    }
  `,
})
export class InebLogoComponent {
  /** Fondo sobre el que se pinta. `dark` = nombre en blanco; `light` = nombre en tinta de marca. */
  readonly tone = input<InebLogoTone>('dark');
  readonly variant = input<InebLogoVariant>('lockup');
  /**
   * Una sola tinta: para sello, grabado, bordado, fax o cualquier reproducción que no admita color.
   * La placa se llena de tinta y TECH se calca en el color del papel (`--ineb-paper`), así que el
   * fondo tiene que ser sólido y coincidir con esa variable.
   */
  readonly mono = input(false);
  /** Solo en `mark`: pinta el cuadro navy detrás (lo que pide un favicon o un icono de app). */
  readonly tile = input(false);
  /**
   * Nombre accesible. Vacío (lo normal aquí) = decorativo: el enlace o el texto de alrededor ya
   * dice qué es. Con valor, el SVG pasa a ser `role="img"` con ese nombre.
   */
  readonly label = input('');

  protected readonly hostClass = computed(() => `is-${this.tone()} v-${this.variant()}`);

  /** Tinta del nombre: blanca sobre oscuro, de marca sobre claro; en una tinta, siempre la misma. */
  protected readonly ink = computed(() =>
    this.mono() || this.tone() === 'dark' ? this.monoOr('#ffffff') : 'var(--ineb-navy)');
  protected readonly red = computed(() => this.mono() ? this.ink() : 'var(--ineb-red)');
  protected readonly plate = computed(() => this.mono() ? this.ink() : 'var(--ineb-yellow)');
  /** Las letras de la placa: sobre amarillo van en navy; en una tinta, caladas al color del papel. */
  protected readonly plateInk = computed(() => this.mono() ? 'var(--ineb-paper)' : 'var(--ineb-navy)');
  /** En el isotipo con cuadro, el nombre va siempre en blanco: el fondo es navy pase lo que pase. */
  protected readonly markInk = computed(() => this.tile() && !this.mono() ? '#ffffff' : this.ink());
  protected readonly tileFill = computed(() => this.mono() ? 'var(--ineb-paper)' : 'var(--ineb-navy)');

  private monoOr(claro: string): string {
    return this.mono() ? (this.tone() === 'dark' ? '#ffffff' : 'var(--ineb-navy)') : claro;
  }
}
