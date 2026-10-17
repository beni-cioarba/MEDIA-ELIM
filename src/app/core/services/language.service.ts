import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/** Idiomas soportados por la aplicación. */
export type AppLanguage = 'es' | 'ro';

/**
 * Sólo guarda una elección **explícita** del usuario. Clave nueva a propósito:
 * con la anterior (`iglesia-redes.lang`) se guardaba también el idioma
 * detectado del navegador, así que quien entró con el navegador en español
 * quedó fijado en español sin haberlo elegido nunca.
 */
const STORAGE_KEY = 'iglesia-redes.lang.elegido';
const DEFAULT_LANG: AppLanguage = 'ro';
const SUPPORTED: readonly AppLanguage[] = ['ro', 'es'];

/**
 * Servicio centralizado de idioma:
 *  - Inicializa ngx-translate.
 *  - Rumano por defecto: la iglesia y su contenido son rumanos, aunque el
 *    navegador del visitante esté en español (lo normal en España).
 *  - Si el usuario cambia de idioma, la elección se guarda en localStorage y
 *    se respeta en las siguientes visitas.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  /** Señal reactiva con el idioma actualmente activo. */
  readonly current = signal<AppLanguage>(DEFAULT_LANG);

  readonly supported = SUPPORTED;

  /**
   * Arranque: elige el idioma (elegido por el usuario → rumano) y **espera** a
   * que su JSON esté cargado antes de pintar nada. El idioma de reserva lo fija
   * `provideTranslateService` en `app.config.ts`.
   */
  init(): Promise<void> {
    this.translate.addLangs([...SUPPORTED]);
    this.followOtherWindows();
    return this.apply(this.readFromStorage() ?? DEFAULT_LANG);
  }

  /**
   * Cambia de idioma por decisión del usuario (selector): lo guarda para las
   * siguientes visitas. Resuelve cuando sus traducciones están disponibles.
   */
  async use(lang: AppLanguage): Promise<void> {
    await this.apply(lang);
    this.writeToStorage(this.current());
  }

  toggle(): Promise<void> {
    return this.use(this.current() === 'es' ? 'ro' : 'es');
  }

  /** Activa el idioma sin guardarlo como elección del usuario. */
  private async apply(lang: AppLanguage): Promise<void> {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    await firstValueFrom(this.translate.use(lang));
    this.current.set(lang);
    // Mantener el atributo `lang` del documento sincronizado: mejora la
    // accesibilidad y permite a los lectores de pantalla pronunciar bien.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  /**
   * Un cambio de idioma en otra ventana del mismo origen (el selector del
   * panel de control) se aplica aquí al momento: así las ventanas de
   * proyección ya abiertas cambian con la consola, por el mismo canal
   * (`storage`) que el resto de ajustes de proyección. El evento no se
   * dispara en la ventana que escribe, así que no hay bucle.
   */
  private followOtherWindows(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      const lang = event.newValue;
      if ((lang === 'es' || lang === 'ro') && lang !== this.current()) void this.apply(lang);
    });
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
