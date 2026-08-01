import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

/**
 * Función que descarga el paquete de traducciones de un idioma concreto.
 * Debe devolver el objeto ya anidado con su clave raíz, tal cual se fusionará
 * en el diccionario de ngx-translate.
 */
export type TranslationPackLoader = (lang: string) => Promise<Record<string, unknown>>;

/**
 * Carga perezosa de paquetes de traducción.
 *
 * Los textos largos que sólo usa una página (por ejemplo los 30 artículos de
 * la confesión de fe) no deben viajar en el bundle inicial: se descargan como
 * un chunk aparte y se fusionan en el diccionario activo.
 *
 * Uso: un `resolve` de ruta llama a `load()` antes de activar la página, de
 * modo que la plantilla nunca llegue a pintar claves sin traducir.
 */
@Injectable({ providedIn: 'root' })
export class TranslationPackService {
  private readonly translate = inject(TranslateService);

  /** Paquetes registrados, para poder reaplicarlos al cambiar de idioma. */
  private readonly loaders = new Map<string, TranslationPackLoader>();

  /** Marcas `id:idioma` ya fusionadas, para no descargar dos veces. */
  private readonly applied = new Set<string>();

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(({ lang }) => void this.applyAll(lang));
  }

  /** Registra el paquete y lo fusiona con el idioma activo. Idempotente. */
  async load(id: string, loader: TranslationPackLoader): Promise<void> {
    this.loaders.set(id, loader);
    await this.apply(id, loader, this.translate.currentLang || this.translate.defaultLang);
  }

  private async applyAll(lang: string): Promise<void> {
    await Promise.all([...this.loaders].map(([id, loader]) => this.apply(id, loader, lang)));
  }

  private async apply(
    id: string,
    loader: TranslationPackLoader,
    lang: string | undefined,
  ): Promise<void> {
    if (!lang) return;

    const token = `${id}:${lang}`;
    if (this.applied.has(token)) return;
    this.applied.add(token);

    const pack = await loader(lang);
    // El tercer argumento fusiona en profundidad en vez de reemplazar.
    this.translate.setTranslation(lang, pack, true);
  }
}
