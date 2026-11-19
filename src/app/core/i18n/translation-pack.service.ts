import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService, TranslationObject } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';

/**
 * Función que descarga el paquete de traducciones de un idioma concreto.
 * Debe devolver el objeto ya anidado con su clave raíz, tal cual se fusionará
 * en el diccionario de ngx-translate.
 */
export type TranslationPackLoader = (lang: string) => Promise<TranslationObject>;

/**
 * Carga perezosa de paquetes de traducción.
 *
 * Los textos largos que sólo usa una página (por ejemplo los 30 artículos de
 * la confesión de fe) no deben viajar en el bundle inicial: se descargan como
 * un chunk aparte y se fusionan en el diccionario activo.
 *
 * Uso: un `resolve` de ruta llama a `load()` antes de activar la página, de
 * modo que la plantilla nunca llegue a pintar claves sin traducir.
 *
 * **Orden de arranque.** La primera navegación corre a la vez que el
 * inicializador de idioma (`withEnabledBlockingInitialNavigation`, ver
 * `app.config.ts`). Si el paquete se fusionara antes de que el diccionario
 * principal haya llegado, esa carga lo reemplazaría entero: claves a la
 * vista. Y no basta con mirar si hay idioma activo: ngx-translate lo fija
 * nada más pedirlo, antes de tener el JSON (pasaba en una de cada tres
 * cargas de `/botezuri` y del panel). Por eso se espera a
 * `LanguageService.ready`, que se cumple con el diccionario ya cargado.
 */
@Injectable({ providedIn: 'root' })
export class TranslationPackService {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  /** Paquetes registrados, para poder reaplicarlos al cambiar de idioma. */
  private readonly loaders = new Map<string, TranslationPackLoader>();

  /**
   * Fusión de cada `id:idioma` (la promesa, no una marca): quien pide uno que
   * ya está en curso espera a que termine, en vez de seguir sin él.
   */
  private readonly applied = new Map<string, Promise<void>>();

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(({ lang }) => void this.applyAll(lang));
  }

  /** Registra el paquete y lo fusiona con el idioma activo. Idempotente. */
  async load(id: string, loader: TranslationPackLoader): Promise<void> {
    this.loaders.set(id, loader);
    await this.language.ready;
    await this.apply(id, loader, this.translate.getCurrentLang() ?? this.language.current());
  }

  private async applyAll(lang: string): Promise<void> {
    await Promise.all([...this.loaders].map(([id, loader]) => this.apply(id, loader, lang)));
  }

  private apply(id: string, loader: TranslationPackLoader, lang: string): Promise<void> {
    const token = `${id}:${lang}`;
    let done = this.applied.get(token);
    if (!done) {
      done = loader(lang).then((pack) => {
        // El tercer argumento fusiona en profundidad en vez de reemplazar.
        this.translate.setTranslation(lang, pack, true);
      });
      // Si falla la descarga, que el siguiente intento vuelva a probar.
      done.catch(() => this.applied.delete(token));
      this.applied.set(token, done);
    }
    return done;
  }
}
