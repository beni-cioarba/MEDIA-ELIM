import { Injectable, Signal, computed, inject } from '@angular/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { GUEST_HOSTS } from '../../../core/guests.config';
import { PEOPLE_INDEX } from '../../../core/leadership.config';
import { AppLanguage, LanguageService } from '../../../core/services/language.service';

/** Lo que las respuestas toman de los datos de la iglesia (`{{sunday}}`, `{{name}}`…). */
export type FaqParams = Readonly<Record<'name' | 'address' | 'sunday' | 'week' | 'friday', string>>;

const AND: Record<AppLanguage, string> = { ro: 'și', es: 'y' };

/**
 * Datos vivos de las respuestas: horas, dirección y pastor salen de donde ya
 * se publican. Si cambia el horario, cambia la respuesta sola.
 */
@Injectable({ providedIn: 'root' })
export class FaqParamsService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly language = inject(LanguageService);

  readonly params: Signal<FaqParams> = computed(() => {
    const time = (day: number): string =>
      (this.config.weeklyProgram.find((p) => p.day === day)?.time ?? '').replace(
        '&',
        AND[this.language.current()],
      );
    return {
      name: PEOPLE_INDEX.get(GUEST_HOSTS[0].person)?.name ?? '',
      address: this.config.location.address,
      sunday: time(0),
      // De lunes a viernes, la misma hora (lo comprueba `faq.config.spec.ts`).
      week: time(1),
      friday: time(5),
    };
  });
}
