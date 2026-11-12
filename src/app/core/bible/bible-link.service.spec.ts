import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { InstallPlatform } from '../util/install-platform';
import { BibleLinkService } from './bible-link.service';
import { parseRef } from './bible-refs';

const APP_KEY = 'elim.bible.app';
const VERSION_KEY = 'elim.bible.version';
const JAS_2 = parseRef('JAS.2');
const FALLBACK = 'https://elimarganda.com/impreuna/ziua/316?biblia=lipsa&text=JAS.2';

function setup(platform: InstallPlatform): BibleLinkService {
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: PwaInstallService, useValue: { env: { platform, device: 'phone', safariVersion: null } } },
    ],
  });
  return TestBed.inject(BibleLinkService);
}

describe('BibleLinkService (abrir la Biblia en la app o en el navegador)', () => {
  beforeEach(() => {
    localStorage.removeItem(APP_KEY);
    localStorage.removeItem(VERSION_KEY);
  });
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>)['visibilityState'];
    TestBed.resetTestingModule();
  });

  it('Android (Chrome): intent a la app; si no está, Chrome vuelve a la página', () => {
    const links = setup('android-chromium');
    const open = links.open(JAS_2, FALLBACK);
    expect(open.viaIntent).toBe(true);
    expect(open.newTab).toBe(false); // la app, o la vuelta aquí, en la misma pestaña
    expect(open.href).toContain('intent://www.bible.com/bible/191/JAS.2.VDC#Intent;scheme=https;');
    expect(open.href).toContain('package=com.sirma.mobile.bible.android;');
    expect(open.href).toContain(`S.browser_fallback_url=${encodeURIComponent(FALLBACK)};end`);
    expect(links.store?.kind).toBe('play');
  });

  it('sabida la falta de la app: bible.com en el navegador, recordado; «Am instalat-o» lo deshace', () => {
    const links = setup('android-chromium');
    links.markMissing();
    expect(links.open(JAS_2, FALLBACK)).toEqual({
      href: 'https://www.bible.com/bible/191/JAS.2.VDC',
      newTab: true,
      viaIntent: false,
    });
    expect(localStorage.getItem(APP_KEY)).toBe('missing');

    links.reset();
    expect(links.app()).toBe('unknown');
    expect(localStorage.getItem(APP_KEY)).toBeNull();
    expect(links.open(JAS_2, FALLBACK).viaIntent).toBe(true);
  });

  it('si al tocar la página se oculta enseguida, la app se abrió: se recuerda', () => {
    const links = setup('android-chromium');
    links.watchLaunch();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(links.app()).toBe('installed');
    expect(localStorage.getItem(APP_KEY)).toBe('installed');
  });

  it('iPhone: bible.com (el sistema abre la app si está), y la App Store a mano', () => {
    const links = setup('ios-safari');
    expect(links.open(JAS_2, FALLBACK)).toEqual({
      href: 'https://www.bible.com/bible/191/JAS.2.VDC',
      newTab: true,
      viaIntent: false,
    });
    expect(links.store).toEqual({ url: 'https://apps.apple.com/app/id282935706', kind: 'appstore' });
  });

  it('Firefox de Android y las vistas integradas no entienden intent: bible.com', () => {
    expect(setup('android-firefox').open(JAS_2, FALLBACK).viaIntent).toBe(false);
    TestBed.resetTestingModule();
    expect(setup('android-inapp').open(JAS_2, FALLBACK).viaIntent).toBe(false);
  });

  it('en el ordenador no hay tienda', () => {
    expect(setup('desktop-chromium').store).toBeNull();
  });

  it('la versión sigue al idioma de la web hasta que se elige otra, y se recuerda', () => {
    const links = setup('desktop-chromium');
    const language = TestBed.inject(LanguageService);
    expect(links.web(JAS_2)).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
    language.current.set('es');
    expect(links.audio(JAS_2)).toBe('https://www.bible.com/audio-bible/149/JAS.2.RVR1960');

    links.setVersion('ro');
    language.current.set('es');
    expect(links.version().abbr).toBe('VDC');
    expect(localStorage.getItem(VERSION_KEY)).toBe('ro');

    TestBed.resetTestingModule();
    expect(setup('desktop-chromium').lang()).toBe('ro');
  });
});
