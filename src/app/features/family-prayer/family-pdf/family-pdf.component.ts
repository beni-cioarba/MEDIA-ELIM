import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FamilyPdf, FamilyPdfService } from '../../../core/services/family-pdf.service';
import { FamilyPrayerService, PrayerWeekView } from '../../../core/services/family-prayer.service';
import { LanguageService } from '../../../core/services/language.service';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * «Descarcă PDF»: descarga el PDF de **esa** semana y nada más.
 *
 * Decisión del usuario (03/10/2026): compartir y descargar son dos cosas
 * distintas. Compartir es siempre el **enlace** de la web (la semana o una
 * familia, con «Distribuie»); este control sólo baja el fichero, y luego
 * cada uno hace con él lo que quiera en su dispositivo. Por eso es un enlace
 * con `download` y no un botón con opciones: un toque, se descarga.
 *
 * No pinta nada si la semana no tiene PDF (ver `FamilyPdfService`).
 */
@Component({
  selector: 'app-family-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (pdf(); as doc) {
      <a
        class="fpdf"
        [href]="doc.url"
        [attr.download]="fileName()"
        [attr.aria-label]="('family_prayer.pdf.download' | translate) + ' · ' + meta(doc)"
        [title]="meta(doc)"
      >
        <app-icon name="download" />
        <span class="fpdf__label">{{ 'family_prayer.pdf.download' | translate }}</span>
        <span class="fpdf__meta">{{ meta(doc) }}</span>
      </a>
    }
  `,
  styleUrl: './family-pdf.component.scss',
})
export class FamilyPdfComponent {
  readonly week = input.required<PrayerWeekView>();

  private readonly pdfs = inject(FamilyPdfService);
  private readonly prayer = inject(FamilyPrayerService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  protected readonly pdf = computed<FamilyPdf | null>(() => this.pdfs.pdfFor(this.week().presentedOn));

  /** «Rugăciune pentru familii · 28 septembrie – 4 octombrie 2026.pdf». */
  protected readonly fileName = computed(() => {
    this.language.current();
    return `${this.translate.instant('family_prayer.title')} · ${this.prayer.formatRange(this.week())}.pdf`;
  });

  /** «6 pagini · 4,2 MB». */
  protected meta(doc: FamilyPdf): string {
    const size = new Intl.NumberFormat(this.language.current(), {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 1,
    }).format(doc.bytes / 1_000_000);
    return `${this.translate.instant('family_prayer.pdf.pages', { count: doc.pages })} · ${size}`;
  }
}
