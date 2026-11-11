import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { AppLanguage, LanguageService } from '../../../core/services/language.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { guestsDisplayUrl, guestsPath, guestsUrl } from '../guests.view';

/** Formato de la hoja. */
type SheetFormat = 'poster' | 'cards';

/** Ancho de un A4 en píxeles CSS (210 mm a 96 ppp): la escala de la vista previa. */
const A4_WIDTH_PX = (210 / 25.4) * 96;

/**
 * Zona de silencio: el estándar pide 4 módulos blancos alrededor. El SVG
 * lleva 2 (`[margin]="2"`) y el relleno blanco del marco otros ~2 (6 mm en
 * el afiche con módulos de ~2,9 mm; 3,5 mm en la tarjeta con ~1,6 mm).
 *
 * Tinta y papel del código: navy de marca sobre blanco (~12:1).
 */
const QR_INK = '#1a365d';
const QR_PAPER = '#ffffff';

/**
 * Hoja imprimible del QR de «Invitați» (`/invitati/qr`, sin shell).
 *
 * Dos formatos sobre A4: **afiche** (entrada, tablón) y **cuatro tarjetas A6**
 * con línea de corte (bancos, mesa de bienvenida). Todo se mide en
 * milímetros, así que lo impreso es exacto; la vista previa en pantalla es
 * la misma hoja escalada (`--k`) al ancho disponible.
 *
 * El código lleva la URL con barra final (respuesta 200 directa, ver
 * `guestsUrl`) y el idioma activo (en español, `/invitati/es/`). Bajo el código va
 * la dirección escrita, para quien no escanea.
 */
@Component({
  selector: 'app-guests-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Hoja global con prefijo propio (`.qrp`): el SVG que pinta `qrcode` y las
  // reglas de `@media print` / `@page` tienen que alcanzar todo el documento.
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, TranslatePipe, QRCodeComponent, BrandLogoComponent, IconComponent],
  templateUrl: './guests-qr.component.html',
  styleUrl: './guests-qr.component.scss',
})
export class GuestsQrComponent {
  private readonly config = inject(CHURCH_CONFIG);
  protected readonly language = inject(LanguageService);
  private readonly schedule = inject(ScheduleService);
  private readonly document = inject(DOCUMENT);

  protected readonly qrInk = QR_INK;
  protected readonly qrPaper = QR_PAPER;
  protected readonly address = this.config.location.address;

  protected readonly languages: readonly { readonly code: AppLanguage; readonly label: string }[] = [
    { code: 'ro', label: 'Română' },
    { code: 'es', label: 'Español' },
  ];

  protected readonly format = signal<SheetFormat>('poster');

  /** El culto del domingo (horas del programa semanal), impreso bajo el código. */
  protected readonly sunday = computed(
    () => this.schedule.weeklyProgram().find((program) => program.day === 0) ?? null,
  );

  /** Lo que codifica el QR (idioma activo). */
  protected readonly qrData = computed(() => guestsUrl(this.config.publicUrl, this.language.current()));

  /** Dirección escrita bajo el código (`elimarganda.com/invitati/es` en español). */
  protected readonly displayUrl = computed(() =>
    guestsDisplayUrl(this.config.publicUrl, this.language.current()),
  );

  /** La página en el idioma de la hoja. */
  protected readonly pagePath = computed(() => guestsPath(this.language.current()));

  /** Cuatro tarjetas por hoja. */
  protected readonly cards = [0, 1, 2, 3];

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');

  constructor() {
    // Vista previa: la hoja mide 210 mm; se escala al ancho disponible.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stage = this.stage().nativeElement;
      const sheet = this.sheet().nativeElement;
      const fit = () => {
        const k = Math.min(1, stage.clientWidth / A4_WIDTH_PX);
        stage.style.setProperty('--k', String(k));
        stage.style.height = `${sheet.offsetHeight * k}px`;
      };
      const observer = new ResizeObserver(fit);
      observer.observe(stage);
      fit();
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected setFormat(format: SheetFormat): void {
    this.format.set(format);
  }

  protected setLanguage(code: AppLanguage): void {
    if (code !== this.language.current()) void this.language.use(code);
  }

  protected print(): void {
    this.document.defaultView?.print();
  }

  /** Descarga el código como SVG vectorial (para imprenta o para otros diseños). */
  protected downloadSvg(): void {
    const svg = this.sheet().nativeElement.querySelector<SVGSVGElement>('.qrp-qr svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `qr-invitati-${this.language.current()}.svg`;
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
