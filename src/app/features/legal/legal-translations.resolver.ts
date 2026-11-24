import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslationObject } from '@ngx-translate/core';
import { TranslationPackLoader, TranslationPackService } from '../../core/i18n/translation-pack.service';

/**
 * Textos de la página legal (`/legal`): ~4 kB por idioma que sólo usa esa
 * página. Viajan en su propio chunk; en el diccionario principal quedan sólo
 * `seo.legal.*` y el rótulo del pie.
 */
export const loadLegal: TranslationPackLoader = async (lang) => {
  const pack =
    lang === 'es'
      ? await import('../../../assets/i18n/legal.es.json')
      : await import('../../../assets/i18n/legal.ro.json');

  return pack.default as unknown as TranslationObject;
};

export const legalTranslationsResolver: ResolveFn<boolean> = async () => {
  await inject(TranslationPackService).load('legal', loadLegal);
  return true;
};
