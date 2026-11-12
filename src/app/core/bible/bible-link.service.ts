import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { BIBLE_APP } from './bible-app';
import {
  BIBLE_VERSIONS,
  BibleLang,
  PassageRef,
  androidIntentUrl,
  bibleAudioUrl,
  bibleUrl,
} from './bible-refs';

/** Lo que se sabe de la app Biblia en este dispositivo. */
export type BibleAppState = 'unknown' | 'installed' | 'missing';

/** Cómo abrir un pasaje desde un enlace. */
export interface BibleOpen {
  readonly href: string;
  /** Pestaña nueva (bible.com); un `intent:` va en la misma (la app o la vuelta aquí). */
  readonly newTab: boolean;
  /** Es un `intent:` de Android: si no está la app, vuelve a `fallback`. */
  readonly viaIntent: boolean;
}

const APP_KEY = 'elim.bible.app';
const VERSION_KEY = 'elim.bible.version';
/** Si tras tocar «Citește» la página se oculta antes de esto, es que se abrió la app. */
const LAUNCH_WINDOW_MS = 2500;

/**
 * Enlaces a la Biblia (YouVersion / bible.com) según el dispositivo.
 *
 * Ninguna web puede preguntar qué apps tiene instaladas el teléfono (es
 * privado). Lo que sí se puede es pedirle al sistema que la abra y saber qué
 * pasó:
 *  · **Android** (Chrome, Edge, Samsung Internet): enlace `intent:` con el
 *    paquete de la app. Si está, la abre en el pasaje (y la página se oculta:
 *    queda `installed`); si no, Chrome vuelve a la página del día con
 *    `?biblia=lipsa` → queda `missing`, se ofrece Google Play y los enlaces
 *    pasan a bible.com en el navegador. Si después la instala, bible.com la
 *    abre igual (App Links verificados).
 *  · **iPhone**: bible.com con enlace universal: el sistema abre la app si está
 *    y, si no, la web (que ofrece la App Store). No hay forma de saberlo.
 *  · **Ordenador**: bible.com en una pestaña nueva.
 * La versión (Cornilescu / Reina-Valera 1960) sigue al idioma de la web hasta
 * que alguien elige otra; las dos cosas se recuerdan en el dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class BibleLinkService {
  private readonly document = inject(DOCUMENT);
  private readonly language = inject(LanguageService);
  private readonly platform = inject(PwaInstallService).env.platform;

  private readonly _app = signal<BibleAppState>(this.read(APP_KEY, ['installed', 'missing']) ?? 'unknown');
  readonly app = this._app.asReadonly();

  private readonly chosen = signal<BibleLang | null>(this.read(VERSION_KEY, ['ro', 'es']));
  /** Idioma de la versión de los enlaces: la elegida aquí o la de la web. */
  readonly lang = computed<BibleLang>(() => this.chosen() ?? this.language.current());
  readonly version = computed(() => BIBLE_VERSIONS[this.lang()]);

  /** Navegadores de Android que entienden `intent:` (Firefox y las vistas integradas, no). */
  readonly intents = this.platform === 'android-chromium' || this.platform === 'android-samsung';

  /** Tienda de la app para este sistema; `null` en el ordenador. */
  readonly store: { readonly url: string; readonly kind: 'play' | 'appstore' } | null = this.platform.startsWith(
    'android',
  )
    ? { url: BIBLE_APP.play, kind: 'play' }
    : this.platform.startsWith('ios')
      ? { url: BIBLE_APP.appStore, kind: 'appstore' }
      : null;

  setVersion(lang: BibleLang): void {
    this.chosen.set(lang);
    this.write(VERSION_KEY, lang);
  }

  /** Cómo abrir un pasaje (ver la clase). `fallback`: adónde volver si en Android no está la app. */
  open(ref: PassageRef, fallback: string): BibleOpen {
    const web = bibleUrl(ref, this.lang());
    if (this.intents && this._app() !== 'missing') {
      return { href: androidIntentUrl(web, BIBLE_APP.androidPackage, fallback), newTab: false, viaIntent: true };
    }
    return { href: web, newTab: true, viaIntent: false };
  }

  /** El pasaje en bible.com, siempre en el navegador. */
  web(ref: PassageRef): string {
    return bibleUrl(ref, this.lang());
  }

  audio(ref: PassageRef): string {
    return bibleAudioUrl(ref, this.lang());
  }

  /** Chrome volvió por el `fallback` del `intent:`: la app no está. */
  markMissing(): void {
    this.setApp('missing');
  }

  /** «Ya la he instalado»: los enlaces vuelven a intentar abrir la app. */
  reset(): void {
    this.setApp('unknown');
  }

  /**
   * Justo después de tocar un `intent:`: si la página se oculta enseguida, la
   * app se abrió (se recuerda). Si no, Chrome está yendo al `fallback` y la
   * página de vuelta marcará `missing` (gana, porque llega después).
   */
  watchLaunch(): void {
    const doc = this.document;
    const started = Date.now();
    const done = (): void => doc.removeEventListener('visibilitychange', onChange);
    const onChange = (): void => {
      if (doc.visibilityState === 'hidden' && Date.now() - started < LAUNCH_WINDOW_MS) this.setApp('installed');
      done();
    };
    doc.addEventListener('visibilitychange', onChange);
    doc.defaultView?.setTimeout(done, LAUNCH_WINDOW_MS);
  }

  private setApp(state: BibleAppState): void {
    this._app.set(state);
    this.write(APP_KEY, state === 'unknown' ? null : state);
  }

  private read<T extends string>(key: string, allowed: readonly T[]): T | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(key);
      return allowed.includes(value as T) ? (value as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (value === null) storage?.removeItem(key);
      else storage?.setItem(key, value);
    } catch {
      // Sin almacenamiento (privado): vale para esta visita.
    }
  }
}
