import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Panel del QR. El SVG es vectorial: generamos un único QR de 1024px
 * de resolución interna y dejamos que CSS lo escale al espacio
 * disponible mediante `aspect-ratio` + `max-height`. Esto evita
 * cualquier bucle JS de redimensionado y aprovecha siempre el espacio
 * máximo del contenedor.
 *
 * Cargado vía `@defer` desde `HomeComponent` para no inflar el bundle
 * inicial con `angularx-qrcode` (~30 kB CommonJS).
 */
@Component({
  selector: 'app-qr-panel',
  standalone: true,
  imports: [QRCodeModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-panel__frame">
      <qrcode
        [qrdata]="data"
        [width]="1024"
        [margin]="2"
        [errorCorrectionLevel]="'H'"
        [colorDark]="'#1a365d'"
        [colorLight]="'#ffffff'"
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
        gap: clamp(0.6rem, 1.5vh, 1.2rem);
        width: 100%;
        height: 100%;
        min-height: 0;
        min-width: 0;
        justify-content: center;
      }

      .qr-panel__frame {
        background: #fff;
        padding: clamp(8px, 1.2vh, 18px);
        border-radius: 16px;
        box-shadow: 0 14px 36px rgba(26, 54, 93, 0.22),
                    0 0 0 1px rgba(26, 54, 93, 0.08);
        aspect-ratio: 1 / 1;
        width: auto;
        max-width: 100%;
        max-height: 100%;
        height: auto;
        flex: 0 1 auto;
        display: flex;
        align-items: center;
        justify-content: center;
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
        text-align: center;
        font-size: clamp(0.9rem, 1.4vh, 1.3rem);
        color: rgba(45, 55, 72, 0.78);
        margin: 0;
        flex: 0 0 auto;
      }
    `,
  ],
})
export class QrPanelComponent {
  @Input({ required: true }) data!: string;
}
