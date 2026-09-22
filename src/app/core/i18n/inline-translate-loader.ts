import { Injectable } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, from, of } from 'rxjs';

/**
 * Cargador de traducciones **empaquetado y por idioma**.
 *
 * Cada JSON de `assets/i18n/` se importa con `import()` dinámico, así que el
 * bundler lo convierte en un chunk propio: al arrancar sólo se descarga el
 * idioma activo (~40 kB menos en el bundle inicial que con los dos idiomas
 * embebidos) y el otro sólo si el usuario cambia de idioma. Al ser chunks del
 * build, el Service Worker los precachea igual que el resto del JS: no hay
 * petición de red al arrancar ni condición de carrera con el inicializador
 * (`LanguageService.init()` espera a que el idioma esté cargado).
 *
 * Los textos largos que sólo usa una página (confesión de fe, etc.) no van aquí:
 * viajan como paquetes aparte (`TranslationPackService`), que se fusionan una
 * sola vez por idioma.
 */
const LOADERS: Record<string, () => Promise<{ default: TranslationObject }>> = {
  es: () => import('../../../assets/i18n/es.json'),
  ro: () => import('../../../assets/i18n/ro.json'),
};

@Injectable({ providedIn: 'root' })
export class InlineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const load = LOADERS[lang] ?? LOADERS['ro'];
    if (!load) return of({});
    return from(load().then((m) => m.default));
  }
}
