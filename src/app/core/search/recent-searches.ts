import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'iglesia-redes.search.recent';
const MAX = 5;

/**
 * Últimas búsquedas, **sólo en este dispositivo** (`localStorage`; se borran
 * desde el propio buscador). Se guarda lo que llevó a abrir un resultado, no
 * cada tecla. Declarado en `/legal` («Preferințe păstrate pe dispozitivul tău»).
 */
@Injectable({ providedIn: 'root' })
export class RecentSearches {
  private readonly _list = signal<readonly string[]>(read());
  readonly list = this._list.asReadonly();

  add(query: string): void {
    const text = query.trim();
    if (text.length < 2) return;
    const same = text.toLowerCase();
    this.save([text, ...this._list().filter((q) => q.toLowerCase() !== same)].slice(0, MAX));
  }

  clear(): void {
    this.save([]);
  }

  private save(list: readonly string[]): void {
    this._list.set(list);
    try {
      if (list.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* modo privado o sin almacenamiento: valen para esta visita */
    }
  }
}

function read(): readonly string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((q): q is string => typeof q === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}
