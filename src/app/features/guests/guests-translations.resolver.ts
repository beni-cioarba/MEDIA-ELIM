import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslationObject } from '@ngx-translate/core';
import {
  TranslationPackLoader,
  TranslationPackService,
} from '../../core/i18n/translation-pack.service';
import { LanguageService } from '../../core/services/language.service';
import { parseGuestLang } from './guests.view';

/**
 * Textos de «Invitați» (`/invitati` y su hoja de QR): ~8 kB por idioma que
 * sólo usa esta página oculta. Viajan en su propio chunk; en el diccionario
 * principal quedan sólo `seo.guests.*` y los rótulos de la consola.
 */
const loadGuests: TranslationPackLoader = async (lang) => {
  const pack =
    lang === 'es'
      ? await import('../../../assets/i18n/guests.es.json')
      : await import('../../../assets/i18n/guests.ro.json');

  return pack.default as unknown as TranslationObject;
};

/**
 * Antes de activar la ruta: aplica `?lang=es|ro` (el QR en español abre la
 * página en español; es una elección explícita, así que se guarda) y espera
 * al paquete del idioma ya definitivo. Así no se pinta ni una clave suelta ni
 * un parpadeo de rumano a español.
 */
export const guestsTranslationsResolver: ResolveFn<boolean> = async (route) => {
  const language = inject(LanguageService);
  const packs = inject(TranslationPackService);
  const lang = parseGuestLang(route.queryParamMap.get('lang'));
  if (lang && lang !== language.current()) await language.use(lang);
  await packs.load('guests', loadGuests);
  return true;
};
