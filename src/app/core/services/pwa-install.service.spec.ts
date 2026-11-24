import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';
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
});
