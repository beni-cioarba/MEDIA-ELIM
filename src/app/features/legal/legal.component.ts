import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { LEGAL_INFO, THIRD_PARTY_SERVICES, ThirdPartyService } from '../../core/legal.config';
import { LanguageService } from '../../core/services/language.service';
import { MapConsentService } from '../../core/services/map-consent.service';
import { TELEMETRY_CONFIG } from '../../core/telemetry/telemetry.config';
import { telHref } from '../../core/util/contact-links';
import { parseIsoDate } from '../../core/util/iso-date';
import { IconComponent } from '../../shared/icon/icon.component';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';

/**
 * «Informații legale și confidențialitate» — página `/legal`.
 *
 * Dice quién responde de la web, qué datos llegan a la iglesia y qué
 * servicios de terceros intervienen. **Es una declaración de hechos**: cada
 * frase describe algo que el código hace. Por eso lo variable no está
 * escrito a mano sino derivado:
 *  · los servicios salen de `THIRD_PARTY_SERVICES` (`core/legal.config.ts`),
 *    y el formulario y los avisos sólo aparecen si están configurados;
 *  · los datos del titular salen de `LEGAL_INFO` y de `church.config.ts`.
 *
 * Los textos (unos 4 kB por idioma) viajan en su paquete: `legal.{ro,es}.json`.
 */
@Component({
  selector: 'app-legal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent, PageSectionComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
})
export class LegalComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly mapConsent = inject(MapConsentService);
  private readonly language = inject(LanguageService);

  protected readonly legal = LEGAL_INFO;
  protected readonly entity = LEGAL_INFO.entity ?? this.config.donations.holder;
  protected readonly phoneHref = telHref(this.config.contact.phone);
  protected readonly mailHref = `mailto:${this.config.contact.email}`;
  protected readonly privacyMailHref = `mailto:${LEGAL_INFO.privacyEmail}`;

  /** El formulario de contacto envía por Web3Forms sólo si tiene su clave. */
  protected readonly formConfigured = this.config.contact.form.accessKey !== null;
  /** Los avisos push existen sólo si OneSignal está configurado. */
  protected readonly pushConfigured = this.config.oneSignalAppId.length > 0;
  /** Lo que declara la web publicada, no lo que hace este navegador (en local no cuenta). */
  private readonly telemetry = inject(TELEMETRY_CONFIG);
  /** Se cuentan las visitas (sin cookies): cambia la frase «no seguimos las visitas». */
  protected readonly countsVisits = this.telemetry.goatCounterCode !== null;

  private readonly services: readonly ThirdPartyService[] = THIRD_PARTY_SERVICES.filter(
    (service) =>
      (service.id !== 'web3forms' || this.formConfigured) &&
      (service.id !== 'onesignal' || this.pushConfigured) &&
      (service.id !== 'goatcounter' || this.countsVisits) &&
      (service.id !== 'sentry' || this.telemetry.sentryDsn !== null),
  );

  /** Los que intervienen sin que el visitante haga nada. */
  protected readonly alwaysServices = this.services.filter((service) => service.when === 'always');
  /** Los que sólo intervienen si el visitante lo pide. */
  protected readonly onRequestServices = this.services.filter((service) => service.when === 'on_request');

  protected readonly updatedOn = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { day: 'numeric', month: 'long', year: 'numeric' }).format(
      parseIsoDate(LEGAL_INFO.updatedOn),
    ),
  );
}
