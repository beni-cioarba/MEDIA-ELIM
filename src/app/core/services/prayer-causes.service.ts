import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PRAYER_CAUSES, PrayerCause } from '../prayer-causes.config';
import { parseIsoDate } from '../util/iso-date';

/** Causa con personas, tal como viene de la lista. */
type CauseWithPeople = PrayerCause & { readonly people: readonly string[] };

/**
 * Causa con personas: se ora por ellas por su nombre. Lleva ya calculado lo
 * que necesita su rejilla, para que el marcado no decida medidas a mano.
 */
export type NamedPrayerCause = CauseWithPeople & {
  /**
   * Letras del nombre más largo. La web deriva de aquí el ancho mínimo de
   * columna (`--name-ch`): caben tantas columnas como nombres enteros quepan.
   */
  readonly longest: number;
  /**
   * Columnas en la proyección (`--cols`): 2 para nombres sueltos a partir de
   * 4; 1 para parejas («Zăgrean Mihael și Emanuela»), que a dos columnas
   * ensancharían tanto la columna de nombres que ahogarían la lateral.
   */
  readonly columns: 1 | 2;
};

/** Hasta aquí, un nombre es «corto» (una persona, no una pareja). */
const SHORT_NAME_MAX = 18;

function namedCause(cause: CauseWithPeople): NamedPrayerCause {
  const longest = Math.max(...cause.people.map((person) => person.length));
  const columns = cause.people.length > 3 && longest <= SHORT_NAME_MAX ? 2 : 1;
  return { ...cause, longest, columns };
}

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
  readonly named: readonly NamedPrayerCause[] = PRAYER_CAUSES.causes
    .filter((cause): cause is CauseWithPeople => (cause.people?.length ?? 0) > 0)
    .map(namedCause);

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
