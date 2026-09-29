import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PRAYER_CAUSES, PrayerCause } from '../prayer-causes.config';
import { parseIsoDate } from '../util/iso-date';

/** Causa con personas: se ora por ellas por su nombre. */
export type NamedPrayerCause = PrayerCause & { readonly people: readonly string[] };

/**
 * «Cauzele Bisericii Elim»: la lista vigente, separada en las dos formas en
 * que se lee —por nombre y por intención— para que la web y la proyección
 * pinten lo mismo con la misma jerarquía.
 *
 * No depende del reloj: la lista no caduca, se revisa a mano (`updatedOn`).
 */
@Injectable({ providedIn: 'root' })
export class PrayerCausesService {
  private readonly translate = inject(TranslateService);

  readonly list = PRAYER_CAUSES;

  /** Causas con nombres, en el orden de la lista. */
  readonly named: readonly NamedPrayerCause[] = PRAYER_CAUSES.causes.filter(
    (cause): cause is NamedPrayerCause => (cause.people?.length ?? 0) > 0,
  );

  /** Causas generales (título + intención), en el orden de la lista. */
  readonly general: readonly PrayerCause[] = PRAYER_CAUSES.causes.filter(
    (cause) => (cause.people?.length ?? 0) === 0,
  );

  readonly hasCauses = PRAYER_CAUSES.causes.length > 0;

  /** «28 septembrie 2026», localizado. */
  formatUpdated(): string {
    try {
      return new Intl.DateTimeFormat(this.lang(), { day: 'numeric', month: 'long', year: 'numeric' }).format(
        parseIsoDate(PRAYER_CAUSES.updatedOn),
      );
    } catch {
      return PRAYER_CAUSES.updatedOn;
    }
  }

  private lang(): string {
    return this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
  }
}
