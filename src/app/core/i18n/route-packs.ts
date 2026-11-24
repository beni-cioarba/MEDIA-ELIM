import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslationObject } from '@ngx-translate/core';
import { TranslationPackLoader, TranslationPackService } from './translation-pack.service';

/**
 * Paquetes de traducción **de una página** (o de unas pocas), fuera del
 * diccionario principal.
 *
 * El diccionario principal (`ro.json` / `es.json`) se descarga en el
 * arranque y **bloquea el primer pintado**: el inicializador de
 * `LanguageService` lo espera. Cada texto que sólo usa una página y está ahí
 * lo paga cada visita a cualquier otra. Medido el 16/11/2026: 66 kB, de los
 * que unos 25 eran de páginas sueltas (Quiénes somos, el concurso, el panel
 * de control, la conducere, donativos y botezuri).
 *
 * Cada paquete es `src/assets/i18n/<id>.{ro,es}.json` con **las mismas
 * raíces** que tenía en el principal (`about.story.…`): se fusiona en el
 * diccionario (`TranslationPackService`), así que las plantillas no cambian.
 * Lo que también usan otras páginas se queda en el principal (p. ej.
 * `about.stats` lo pinta la portada; `talent_contest.phases`, el bloque
 * proyectado).
 *
 * Una página nueva con mucho texto propio: paquete aquí + `resolve` en su
 * ruta. Regla en `docs/ai/20-content-i18n.md`.
 */

/** Los `import()` son literales: el bundler necesita ver cada fichero. */
const LOADERS = {
  about: (lang: string) =>
    lang === 'es' ? import('../../../assets/i18n/about.es.json') : import('../../../assets/i18n/about.ro.json'),
  'talent-contest': (lang: string) =>
    lang === 'es'
      ? import('../../../assets/i18n/talent-contest.es.json')
      : import('../../../assets/i18n/talent-contest.ro.json'),
  presenter: (lang: string) =>
    lang === 'es' ? import('../../../assets/i18n/presenter.es.json') : import('../../../assets/i18n/presenter.ro.json'),
  leadership: (lang: string) =>
    lang === 'es'
      ? import('../../../assets/i18n/leadership.es.json')
      : import('../../../assets/i18n/leadership.ro.json'),
  donate: (lang: string) =>
    lang === 'es' ? import('../../../assets/i18n/donate.es.json') : import('../../../assets/i18n/donate.ro.json'),
  baptisms: (lang: string) =>
    lang === 'es' ? import('../../../assets/i18n/baptisms.es.json') : import('../../../assets/i18n/baptisms.ro.json'),
  // No es de una página: los textos del buscador, que se piden al abrirlo.
  search: (lang: string) =>
    lang === 'es' ? import('../../../assets/i18n/search.es.json') : import('../../../assets/i18n/search.ro.json'),
} as const;

export type RoutePackId = keyof typeof LOADERS;

/** Descarga de un paquete por su id, para pedirlo fuera de una ruta (el buscador). */
export function routePackLoader(id: RoutePackId): TranslationPackLoader {
  return async (lang) => (await LOADERS[id](lang)).default as unknown as TranslationObject;
}

/**
 * `resolve` de ruta que carga los paquetes antes de activar la página, así
 * que nunca se pinta una clave sin traducir.
 *
 * ```ts
 * resolve: { i18n: routePacks('about') }
 * ```
 */
export function routePacks(...ids: readonly RoutePackId[]): ResolveFn<boolean> {
  return async () => {
    const packs = inject(TranslationPackService);
    await Promise.all(ids.map((id) => packs.load(id, routePackLoader(id))));
    return true;
  };
}
