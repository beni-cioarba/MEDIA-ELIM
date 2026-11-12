import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslationObject } from '@ngx-translate/core';
import { TranslationPackLoader, TranslationPackService } from '../../core/i18n/translation-pack.service';
import { AppLanguage, LanguageService } from '../../core/services/language.service';

/**
 * Textos de Proiectul Împreună (~9 kB por idioma) en su propio chunk: en el
 * diccionario principal sólo quedan `nav.impreuna*`, `seo.impreuna.*` y el
 * resumen del menú.
 */
const loadImpreuna: TranslationPackLoader = async (lang) => {
  const pack =
    lang === 'es'
      ? await import('../../../assets/i18n/impreuna.es.json')
      : await import('../../../assets/i18n/impreuna.ro.json');
  return pack.default as unknown as TranslationObject;
};

const parseLang = (value: string | null): AppLanguage | null => (value === 'es' || value === 'ro' ? value : null);

/**
 * Antes de activar la ruta: aplica `?lang=es|ro` (los enlaces del calendario
 * en español lo llevan) y espera al paquete del idioma definitivo, para no
 * pintar claves sueltas.
 */
export const impreunaTranslationsResolver: ResolveFn<boolean> = async (route) => {
  const language = inject(LanguageService);
  const packs = inject(TranslationPackService);
  const lang = parseLang(route.queryParamMap.get('lang'));
  if (lang && lang !== language.current()) await language.use(lang);
  await packs.load('impreuna', loadImpreuna);
  return true;
};
