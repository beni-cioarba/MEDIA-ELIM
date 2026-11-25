import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { PwaInstallService } from './pwa-install.service';

/** Un `beforeinstallprompt` de mentira. */
function promptEvent(outcome: 'accepted' | 'dismissed'): Event {
  return Object.assign(new Event('beforeinstallprompt'), {
    prompt: () => Promise.resolve(),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
}

function setup(): PwaInstallService {
  TestBed.configureTestingModule({ providers: [provideTranslateService()] });
  return TestBed.inject(PwaInstallService);
}

describe('PwaInstallService', () => {
  beforeEach(() => {
    localStorage.clear();
    window.__elimInstallPrompt = null;
    // jsdom no tiene `matchMedia`.
    window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener: () => undefined })) as never;
  });

  afterEach(() => {
    delete (navigator as { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps;
  });

  it('sin aviso del navegador devuelve «guide»', async () => {
    expect(await setup().install()).toBe('guide');
  });

  it('al aceptar deja de ofrecerse y fija el idioma que se está viendo', async () => {
    const pwa = setup();
    const remember = vi.spyOn(TestBed.inject(LanguageService), 'remember');
    window.dispatchEvent(promptEvent('accepted'));
    expect(pwa.available()).toBe(true);
    expect(await pwa.install()).toBe('accepted');
    expect(remember).toHaveBeenCalledOnce();
    expect(pwa.available()).toBe(false);
  });

  it('al cancelar, el aviso se gasta y no se fija nada', async () => {
    const pwa = setup();
    const remember = vi.spyOn(TestBed.inject(LanguageService), 'remember');
    window.dispatchEvent(promptEvent('dismissed'));
    expect(await pwa.install()).toBe('dismissed');
    expect(remember).not.toHaveBeenCalled();
    expect(pwa.canPromptNatively()).toBe(false);
    expect(localStorage.getItem('elim.pwa.installedAt')).toBeNull();
  });

  it('«ya la tengo» se recuerda, pero el aviso del navegador manda', () => {
    const pwa = setup();
    pwa.confirmInstalled();
    expect(localStorage.getItem('elim.pwa.installedAt')).not.toBeNull();
    window.dispatchEvent(promptEvent('accepted'));
    expect(pwa.available()).toBe(true);
    expect(localStorage.getItem('elim.pwa.installedAt')).toBeNull();
  });

  it('pregunta a Chromium si ya está instalada, sin guardarlo', async () => {
    const ask = vi.fn().mockResolvedValue([{ platform: 'webapp' }]);
    Object.assign(navigator, { getInstalledRelatedApps: ask });
    const pwa = setup();
    await Promise.resolve();
    expect(ask).toHaveBeenCalledOnce();
    expect(pwa.available()).toBe(false);
    expect(localStorage.getItem('elim.pwa.installedAt')).toBeNull();
  });

  it('sin ninguna instalada, Chromium dice que no la tiene', async () => {
    Object.assign(navigator, { getInstalledRelatedApps: vi.fn().mockResolvedValue([]) });
    const pwa = setup();
    await pwa.checked;
    expect(pwa.state()).toBe('absent');
  });

  it('aceptar el diálogo y `appinstalled` cuentan una sola instalación', async () => {
    const pwa = setup();
    const event = vi.spyOn(TestBed.inject(TelemetryService), 'event');
    window.dispatchEvent(promptEvent('accepted'));
    await pwa.install();
    window.dispatchEvent(new Event('appinstalled'));
    expect(event.mock.calls.filter(([name]) => name === 'app-instalata')).toHaveLength(1);
    expect(pwa.justInstalled()).toBe(true);
  });

  it('«ya la tengo» no cuenta como instalación', () => {
    const pwa = setup();
    const event = vi.spyOn(TestBed.inject(TelemetryService), 'event');
    pwa.confirmInstalled();
    expect(event.mock.calls).toEqual([['app-declarata']]);
    expect(pwa.state()).toBe('installed');
  });

  describe('modo de visualización', () => {
    const original = window.matchMedia;
    const display = (...modes: string[]) => {
      window.matchMedia = ((query: string) => ({
        matches: modes.some((mode) => query === `(display-mode: ${mode})`),
        media: query,
        addEventListener: () => undefined,
      })) as never;
    };
    afterEach(() => (window.matchMedia = original));

    it('abierta como app: lo recuerda para cuando se entre por el navegador', () => {
      display('standalone');
      expect(setup().state()).toBe('app');
      expect(localStorage.getItem('elim.pwa.installedAt')).not.toBeNull();
    });

    it('una pestaña a pantalla completa no es la app', () => {
      display('fullscreen');
      expect(setup().state()).toBe('unknown');
      expect(localStorage.getItem('elim.pwa.installedAt')).toBeNull();
    });

    it('venir de otra app de Android (`android-app://`) tampoco', () => {
      display();
      const referrer = vi.spyOn(document, 'referrer', 'get').mockReturnValue('android-app://com.google.android.gm/');
      expect(setup().state()).toBe('unknown');
      referrer.mockRestore();
    });
  });
});
