import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  TranslationPackLoader,
  TranslationPackService,
} from '../../core/i18n/translation-pack.service';

/**
 * Los 30 artículos del credo ocupan ~40 kB de texto entre los dos idiomas:
 * demasiado para el bundle inicial, que se descarga también en la pantalla de
 * proyección del templo. Se cargan como chunk aparte sólo en esta página.
 */
const loadCredoArticles: TranslationPackLoader = async (lang) => {
  const pack =
    lang === 'es'
      ? await import('../../../assets/i18n/credo-articles.es.json')
      : await import('../../../assets/i18n/credo-articles.ro.json');

  return pack.default as unknown as Record<string, unknown>;
};

/**
 * Espera al paquete de traducciones antes de activar la ruta, para que la
 * plantilla nunca pinte claves sin traducir.
 */
export const credoTranslationsResolver: ResolveFn<boolean> = async () => {
  await inject(TranslationPackService).load('credo-articles', loadCredoArticles);
  return true;
};
