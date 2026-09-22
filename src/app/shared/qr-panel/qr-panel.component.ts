import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Panel del QR. El SVG es vectorial: generamos un único QR de 1024px
 * de resolución interna y dejamos que CSS lo escale al espacio
 * disponible mediante `aspect-ratio` + `max-height`. Esto evita
 * cualquier bucle JS de redimensionado y aprovecha siempre el espacio
 * máximo del contenedor.
 *
 * ── Legibilidad a distancia ───────────────────────────────────────────
 * Lo que decide desde cuántos metros se escanea un QR no es su tamaño
 * total sino el tamaño de cada **módulo** (cuadradito). A igual tamaño en
 * pantalla, menos módulos = módulos más grandes = más alcance. Por eso la
 * corrección de errores es `M` (15 %) y no `H` (30 %): `H` existe para
 * códigos impresos que se ensucian o se rompen; en una pantalla limpia sólo
 * añade módulos (con esta URL, de 41×41 a 33×33: cada módulo un 24 % mayor).
 * El navy de marca sobre blanco da un contraste de ~12:1, de sobra para
 * cualquier cámara.
 *
 * ── Ganchos para el escenario ─────────────────────────────────────────
 * El componente está encapsulado, así que la proyección no puede alcanzar
 * sus clases. En su lugar lee estas variables CSS, que heredan del padre:
 *  - `--qr-frame-pad`       relleno del marco blanco (zona de silencio visual)
 *  - `--qr-frame-radius`    radio del marco
 *  - `--qr-caption-size`    cuerpo de la leyenda
 *  - `--qr-caption-color`   color de la leyenda
 *  - `--qr-gap`             separación marco ↔ leyenda
 * Sin ellas, los valores por defecto sirven para la web pública.
 *
 * Cargado vía `@defer` desde `StageComponent` para no inflar el bundle
 * inicial con `angularx-qrcode` (~30 kB CommonJS).
 */
@Component({
    selector: 'app-qr-panel',
    imports: [QRCodeComponent, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="qr-panel__frame">
      <qrcode
        [qrdata]="data"
        [width]="1024"
        [margin]="2"
        [errorCorrectionLevel]="'M'"
        [colorDark]="QR_INK"
        [colorLight]="QR_PAPER"
        [elementType]="'svg'"
      ></qrcode>
    </div>
    <p class="qr-panel__caption">{{ 'qr.caption' | translate }}</p>
  `,
    styles: [
        `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--qr-gap, clamp(0.6rem, 1.5vh, 1.2rem));
        width: 100%;
        height: 100%;
        min-height: 0;
        min-width: 0;
      }

      .qr-panel__frame {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 1 auto;
        aspect-ratio: 1 / 1;
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        padding: var(--qr-frame-pad, clamp(8px, 1.2vh, 18px));
        border-radius: var(--qr-frame-radius, var(--r-md));
        background: var(--c-surface);
        box-shadow: var(--e-3), 0 0 0 1px var(--c-hairline);
      }

      .qr-panel__frame ::ng-deep qrcode,
      .qr-panel__frame ::ng-deep qrcode > div {
        display: block;
        width: 100%;
        height: 100%;
        line-height: 0;
      }
      .qr-panel__frame ::ng-deep svg {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }

      .qr-panel__caption {
        flex: 0 0 auto;
        margin: 0;
        max-width: none;
        text-align: center;
        font-size: var(--qr-caption-size, clamp(0.9rem, 1.4vh, 1.3rem));
        font-weight: var(--qr-caption-weight, 500);
        line-height: 1.3;
        color: var(--qr-caption-color, var(--c-muted));
      }
    `,
    ]
})
export class QrPanelComponent {
  @Input({ required: true }) data!: string;

  /**
   * Colores del QR. La librería los necesita como literales (los pinta en el
   * SVG, no vía CSS), así que son la única excepción a «nada de hex en un
   * componente». Son `navy(700)` y `neutral(0)` de `_tokens.scss`.
   */
  protected readonly QR_INK = '#1a365d';
  protected readonly QR_PAPER = '#ffffff';
}
