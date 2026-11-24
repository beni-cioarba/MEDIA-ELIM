import { EnvironmentInjector, Injectable, inject, runInInjectionContext, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService, TranslationObject } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { InlineTranslateLoader } from '../i18n/inline-translate-loader';
import { routePackLoader } from '../i18n/route-packs';
import { TranslationPackLoader, TranslationPackService } from '../i18n/translation-pack.service';
import { ClockService } from '../services/clock.service';
import { AppLanguage, LanguageService } from '../services/language.service';
import { LoggerService } from '../services/logger.service';
import { toIsoDate } from '../util/iso-date';
import { pageEntries } from './page-entries';
import { SearchIndex, SearchResult } from './search-engine';
import { SEARCH_SOURCES, SearchContext, SearchEntry } from './search.model';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Lo más que se ofrece antes de escribir. */
const SUGGESTIONS_MAX = 8;

/** Sin nada que buscar todavía. */
const EMPTY: SearchResult = { hits: [], terms: [], partial: false };

/**
 * Reúne lo que aporta cada módulo, construye el índice y busca.
 *
 * Todo ocurre **en el navegador**: lo que se escribe no sale del dispositivo
 * (ni a terceros ni a la analítica). El índice se construye al abrir el
 * buscador y se reutiliza mientras no cambie el idioma ni el día; como sale de
 * los servicios de contenido (reloj compartido), un anuncio caducado o un
 * evento pasado dejan de encontrarse solos.
 *
 * Viaja en el chunk del diálogo: nada de esto está en el arranque.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly sources = inject(SEARCH_SOURCES);
  private readonly routes = inject(Router).config;
  private readonly injector = inject(EnvironmentInjector);
  private readonly translate = inject(TranslateService);
  private readonly dictionaries = inject(InlineTranslateLoader);
  private readonly packs = inject(TranslationPackService);
  private readonly language = inject(LanguageService);
  private readonly clock = inject(ClockService);
  private readonly log = inject(LoggerService).prefix('search');

  private readonly _status = signal<SearchStatus>('idle');
  readonly status = this._status.asReadonly();

  private readonly _index = signal<SearchIndex | null>(null);

  /** Idioma y día del índice actual. */
  private builtFor: string | null = null;
  private building: Promise<void> | null = null;

  /** Deja el índice listo (idempotente). Nunca rechaza: el estado lo dice `status`. */
  prepare(): Promise<void> {
    const key = `${this.language.current()}|${toIsoDate(new Date(this.clock.now()))}`;
    if (this.builtFor === key) return Promise.resolve();
    this.building ??= this.build(key).finally(() => (this.building = null));
    return this.building;
  }

  search(query: string): SearchResult {
    return this._index()?.search(query) ?? EMPTY;
  }

  /** Lo que se ofrece antes de escribir: lo vigente primero, después lo de siempre. */
  suggestions(): readonly SearchEntry[] {
    return (this._index()?.entries ?? [])
      .filter((entry) => entry.suggest !== undefined)
      .sort((a, b) => a.suggest! - b.suggest!)
      .slice(0, SUGGESTIONS_MAX);
  }

  private async build(key: string): Promise<void> {
    // Un índice en otro idioma o de otro día no se enseña mientras se rehace.
    this._status.set('loading');
    try {
      const { entries, complete } = await this.collect();
      this._index.set(new SearchIndex(entries));
      // Si a algún módulo le ha fallado la descarga, se vuelve a intentar la
      // próxima vez que se abra; mientras, se busca en lo demás.
      this.builtFor = complete ? key : null;
      this._status.set('ready');
    } catch (error) {
      this.log.warn('no se pudo preparar el buscador', error);
      this._status.set('error');
    }
  }

  private async collect(): Promise<{ entries: readonly SearchEntry[]; complete: boolean }> {
    const ctx = await this.context(this.language.current());
    // Los textos del buscador (rótulos y sinónimos de las páginas) van primero:
    // las páginas son lo imprescindible. Sin ellos, error.
    await ctx.pack('search', routePackLoader('search'));
    const pages = pageEntries(this.routes, ctx).map((entry) => ({ ...entry, id: `page:${entry.id}` }));

    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        const provider = await source.load();
        const entries = await runInInjectionContext(this.injector, () => provider(ctx));
        return entries.map((entry) => ({ ...entry, id: `${source.id}:${entry.id}` }));
      }),
    );
    const entries: SearchEntry[] = [...pages];
    let complete = true;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        entries.push(...result.value);
      } else {
        complete = false;
        this.log.warn(`sin resultados de «${this.sources[i].id}»`, result.reason);
      }
    });
    return { entries, complete };
  }

  private async context(lang: AppLanguage): Promise<SearchContext> {
    const other: AppLanguage = lang === 'ro' ? 'es' : 'ro';
    // El otro idioma se lee aparte, sin registrarlo en ngx-translate: no es el
    // activo, sólo da sinónimos. Son los mismos chunks que ya precachea el SW.
    const others: TranslationObject[] = [await firstValueFrom(this.dictionaries.getTranslation(other))];
    return {
      lang,
      t: (key, params) => this.translate.instant(key, params) as string,
      maybe: (key) => {
        const text: unknown = this.translate.instant(key);
        return typeof text === 'string' && text !== key ? text : null;
      },
      alt: (key, params) => fill(others.map((dict) => lookup(dict, key)).find((text) => text !== null) ?? '', params),
      pack: async (id: string, loader: TranslationPackLoader) => {
        const [pack] = await Promise.all([loader(other), this.packs.load(id, loader)]);
        others.push(pack);
      },
    };
  }
}

/** `a.b.c` dentro de un diccionario anidado. */
function lookup(dict: TranslationObject, key: string): string | null {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : null;
}

/** Parámetros `{{x}}` de un texto leído a mano. */
function fill(text: string, params?: Readonly<Record<string, string | number>>): string {
  return params ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(params[name] ?? '')) : text;
}
