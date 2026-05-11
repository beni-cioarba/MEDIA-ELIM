import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import esTranslations from '../../../assets/i18n/es.json';
import roTranslations from '../../../assets/i18n/ro.json';

/**
 * Loader de traducciones embebido en el bundle.
 *
 * Ventajas frente al `TranslateHttpLoader` clásico:
 *  - 0 peticiones HTTP en el primer paint (ahorra ~150 ms en redes lentas).
 *  - Sin race condition entre `APP_INITIALIZER` y la carga del JSON.
 *  - El bundler puede minificar y comprimir las cadenas junto al resto.
 *
 * Como solo tenemos 2 idiomas y los JSON ocupan ~3 KB cada uno (~1 KB tras
 * gzip), inlinearlos es objetivamente mejor que servirlos por HTTP.
 */
const TRANSLATIONS: Record<string, unknown> = {
  es: esTranslations,
  ro: roTranslations,
};

export class InlineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<unknown> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['ro']);
  }
}

export function inlineTranslateLoaderFactory(): TranslateLoader {
  return new InlineTranslateLoader();
}
