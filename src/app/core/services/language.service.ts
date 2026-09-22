import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/** Idiomas soportados por la aplicación. */
export type AppLanguage = 'es' | 'ro';

const STORAGE_KEY = 'iglesia-redes.lang';
const DEFAULT_LANG: AppLanguage = 'ro';
const SUPPORTED: readonly AppLanguage[] = ['ro', 'es'];

/**
 * Servicio centralizado de idioma:
 *  - Inicializa ngx-translate.
 *  - Lee/persiste el idioma activo en localStorage.
 *  - Si no hay preferencia guardada, autodetecta del navegador y cae en
 *    rumano por defecto si no se reconoce.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  /** Señal reactiva con el idioma actualmente activo. */
  readonly current = signal<AppLanguage>(DEFAULT_LANG);

  readonly supported = SUPPORTED;

  /**
   * Arranque: elige el idioma (guardado → navegador → rumano) y **espera** a
   * que su JSON esté cargado antes de pintar nada. El idioma de reserva lo fija
   * `provideTranslateService` en `app.config.ts`.
   */
  init(): Promise<void> {
    this.translate.addLangs([...SUPPORTED]);
    const initial = this.readFromStorage() || this.detectFromBrowser() || DEFAULT_LANG;
    return this.use(initial);
  }

  /** Cambia de idioma; resuelve cuando sus traducciones están disponibles. */
  async use(lang: AppLanguage): Promise<void> {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    await firstValueFrom(this.translate.use(lang));
    this.current.set(lang);
    this.writeToStorage(lang);
    // Mantener el atributo `lang` del documento sincronizado: mejora la
    // accesibilidad y permite a los lectores de pantalla pronunciar bien.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  toggle(): Promise<void> {
    return this.use(this.current() === 'es' ? 'ro' : 'es');
  }

  private detectFromBrowser(): AppLanguage | null {
    if (typeof navigator === 'undefined') return null;
    const code = (navigator.language || '').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(code as AppLanguage) ? (code as AppLanguage) : null;
  }

  private readFromStorage(): AppLanguage | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'es' || v === 'ro') return v;
    } catch { /* ignore */ }
    return null;
  }

  private writeToStorage(lang: AppLanguage): void {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }
}
