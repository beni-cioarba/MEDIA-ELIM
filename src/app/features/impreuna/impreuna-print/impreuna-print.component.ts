import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { map } from 'rxjs';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { PLAN_DAYS } from '../../../core/impreuna/impreuna-edition';
import { isFastingDay, localDateOfDay, monthOfDay, monthRange } from '../../../core/impreuna/impreuna-plan';
import { formatReading } from '../../../core/bible/bible-refs';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { IconComponent } from '../../../shared/icon/icon.component';

const LOCALES = { ro: 'ro-RO', es: 'es-ES' } as const;

/**
 * Hoja imprimible de un mes del plan (`/impreuna/tipar?luna=11`), sin shell:
 * A4 vertical con los 28–31 días, una casilla por día y el QR a la página.
 * Para quien lee en papel (y para repartir en la iglesia). En pantalla lleva
 * una barra con «Imprimir» que desaparece al imprimir.
 */
@Component({
  selector: 'app-impreuna-print',
  imports: [RouterLink, TranslatePipe, IconComponent, QRCodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './impreuna-print.component.html',
  styleUrl: './impreuna-print.component.scss',
})
export class ImpreunaPrintComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly impreuna = inject(ImpreunaService);
  private readonly config = inject(CHURCH_CONFIG);

  protected readonly year = this.impreuna.edition.year;
  private readonly lang = this.impreuna.lang;
  private readonly monthParam = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('luna'))), {
    initialValue: null,
  });

  protected readonly month = computed(() => {
    const n = Number(this.monthParam());
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n - 1;
    const { status, day } = this.impreuna.today();
    return status === 'running' ? monthOfDay(this.year, day) : status === 'before' ? 0 : 11;
  });

  protected readonly monthName = computed(() => {
    const name = new Intl.DateTimeFormat(LOCALES[this.lang()], { month: 'long' }).format(new Date(this.year, this.month(), 1, 12));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  protected readonly rows = computed(() => {
    const { first, last } = monthRange(this.year, this.month());
    const fmt = new Intl.DateTimeFormat(LOCALES[this.lang()], { weekday: 'short', day: 'numeric' });
    return PLAN_DAYS.slice(first - 1, last).map((d) => ({
      day: d.day,
      date: fmt.format(localDateOfDay(this.year, d.day)).replace('.', ''),
      reading: formatReading(d.refs, this.lang()),
      wisdom: d.kind === 'wisdom',
      fasting: isFastingDay(this.year, d.day),
    }));
  });

  /** Destino del QR: la página pública del proyecto (en español si la hoja lo está). */
  protected readonly pageUrl = computed(
    () => `${this.config.publicUrl.replace(/\/$/, '')}/${APP_PATHS.impreuna}${this.lang() === 'es' ? '?lang=es' : ''}`,
  );

  protected readonly planLink = ['/', APP_PATHS.impreuna, APP_PATHS.impreunaPlan];

  protected print(): void {
    this.document.defaultView?.print();
  }
}
