import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../church.config';
import { LanguageService } from '../services/language.service';
import { PUSH_PROVIDER } from './push-client';
import { PushService, pushOriginAllowed, pushSupport } from './push.service';
import {
  FakePushProvider,
  fakeBrowserPush,
  fakeNotification,
  flushPromises,
  stubPushBrowser,
  unstubPushBrowser,
} from './push.testing';

const STORAGE_KEY = 'elim.push.topics';

function setup(appId = 'app-test'): { service: PushService; provider: FakePushProvider } {
  const provider = new FakePushProvider();
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, oneSignalAppId: appId } },
      { provide: PUSH_PROVIDER, useValue: provider },
    ],
  });
  return { service: TestBed.inject(PushService), provider };
}

describe('PushService (avisos web push)', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    stubPushBrowser();
  });
  afterEach(() => {
    unstubPushBrowser();
    TestBed.resetTestingModule();
  });

  it('sin App ID la función no existe y no carga nada', async () => {
    const { service, provider } = setup('');
    expect(service.configured).toBe(false);
    expect(await service.enable('impreuna')).toBe('unsupported');
    expect(provider.connects.length).toBe(0);
    expect(fakeNotification.asked).toBe(0);
  });

  it('activa: pide el permiso ANTES de cargar el SDK, da de alta y etiqueta con el idioma', async () => {
    const { service, provider } = setup();
    expect(service.isOn('impreuna')).toBe(false);

    const welcome = { title: 'Proiectul Împreună', message: 'Gata!' };
    expect(await service.enable('impreuna', welcome)).toBe('on');

    expect(fakeNotification.asked).toBe(1);
    expect(provider.permissionAtConnect).toBe('granted'); // el SDK llega con el permiso ya dado
    expect(provider.connects).toEqual([
      { appId: 'app-test', safariWebId: DEFAULT_CHURCH_CONFIG.oneSignalSafariWebId, welcome },
    ]);
    expect(provider.client.opted).toBe(true);
    expect(provider.client.tags.get('impreuna')).toBe('ro');
    expect(provider.client.language).toBe('ro');
    expect(service.isOn('impreuna')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"impreuna":"ro"}');
  });

  it('si se cierra el diálogo sin responder o se deniega, no carga el SDK', async () => {
    const { service, provider } = setup();
    fakeNotification.answer = 'default';
    expect(await service.enable('impreuna')).toBe('dismissed');
    fakeNotification.answer = 'denied';
    expect(await service.enable('impreuna')).toBe('denied');
    expect(service.permission()).toBe('denied');
    // Ya denegado: no se vuelve a preguntar (el navegador no lo permitiría).
    expect(await service.enable('impreuna')).toBe('denied');
    expect(fakeNotification.asked).toBe(2);
    expect(provider.connects.length).toBe(0);
    expect(service.isOn('impreuna')).toBe(false);
  });

  it('si el SDK no carga al activar: error y sigue apagado', async () => {
    const { service, provider } = setup();
    provider.fail = true;
    expect(await service.enable('impreuna')).toBe('error');
    expect(service.isOn('impreuna')).toBe(false);
    expect(service.busy()).toBe(false);
  });

  it('desactiva: quita la etiqueta y da de baja la suscripción', async () => {
    const { service, provider } = setup();
    await service.enable('impreuna');
    expect(await service.disable('impreuna')).toBe('off');
    expect(provider.client.tags.has('impreuna')).toBe(false);
    expect(provider.client.opted).toBe(false);
    expect(service.isOn('impreuna')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('si el SDK no carga al desactivar, corta la suscripción del navegador', async () => {
    const { service, provider } = setup();
    await service.enable('impreuna');
    provider.fail = true;
    expect(await service.disable('impreuna')).toBe('off');
    expect(fakeBrowserPush.unsubscribed).toBe(1);
    expect(service.isOn('impreuna')).toBe(false);
  });

  it('al abrir la página rehace el alta si el navegador la perdió (con permiso)', async () => {
    localStorage.setItem(STORAGE_KEY, '{"impreuna":"ro"}');
    fakeNotification.permission = 'granted';
    const { service, provider } = setup();
    expect(service.isOn('impreuna')).toBe(true); // pinta al instante, sin red

    await service.reconcile();
    expect(provider.client.opted).toBe(true);
    expect(provider.client.tags.get('impreuna')).toBe('ro');
    // Una vez por sesión.
    await service.reconcile();
    expect(provider.connects.length).toBe(1);
  });

  it('con el permiso retirado en el navegador, el interruptor no miente', () => {
    localStorage.setItem(STORAGE_KEY, '{"impreuna":"ro"}');
    fakeNotification.permission = 'denied';
    const { service } = setup();
    expect(service.isOn('impreuna')).toBe(false);
    expect(service.permission()).toBe('denied');
  });

  it('cambiar el idioma de la web cambia el del aviso', async () => {
    const { service, provider } = setup();
    await service.enable('impreuna');
    TestBed.inject(LanguageService).current.set('es');
    TestBed.tick();
    await flushPromises();
    expect(provider.client.tags.get('impreuna')).toBe('es');
    expect(provider.client.language).toBe('es');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"impreuna":"es"}');
  });

  it('un almacenamiento corrupto no rompe nada', () => {
    localStorage.setItem(STORAGE_KEY, '{no es json');
    fakeNotification.permission = 'granted';
    expect(setup().service.isOn('impreuna')).toBe(false);
  });
});

describe('pushOriginAllowed (OneSignal sólo vale en su Site URL)', () => {
  const site = 'https://elimarganda.com/';

  it('la web pública y el entorno local, sí', () => {
    expect(pushOriginAllowed('https://elimarganda.com', site)).toBe(true);
    expect(pushOriginAllowed('http://localhost:4310', site)).toBe(true);
    expect(pushOriginAllowed('http://127.0.0.1:4200', site)).toBe(true);
  });

  it('cualquier otro origen, no (el interruptor fallaría)', () => {
    expect(pushOriginAllowed('https://www.elimarganda.com', site)).toBe(false);
    expect(pushOriginAllowed('https://elimarganda-com.translate.goog', site)).toBe(false);
    expect(pushOriginAllowed('https://beni-cioarba.github.io', site)).toBe(false);
    expect(pushOriginAllowed('http://elimarganda.com', site)).toBe(false);
    expect(pushOriginAllowed('https://elimarganda.com', 'no es url')).toBe(false);
  });
});

describe('pushSupport (qué decir según el navegador)', () => {
  const win = (extra: Record<string, unknown> = {}): Window =>
    ({
      isSecureContext: true,
      navigator: {},
      matchMedia: () => ({ matches: false }),
      ...extra,
    }) as unknown as Window;
  const capable = (): Window =>
    ({
      isSecureContext: true,
      navigator: { serviceWorker: {} },
      PushManager: class {},
      Notification: class {},
    }) as unknown as Window;

  it('con las APIs de push, vale en cualquier plataforma (también el iPhone instalado)', () => {
    expect(pushSupport('desktop-chromium', capable())).toBe('ok');
    expect(pushSupport('ios-safari', capable())).toBe('ok');
  });

  it('sin ellas explica qué hacer', () => {
    expect(pushSupport('ios-safari', win())).toBe('ios-install');
    expect(pushSupport('ios-inapp', win())).toBe('ios-install');
    expect(pushSupport('ios-safari', win({ navigator: { standalone: true } }))).toBe('unsupported');
    expect(pushSupport('android-inapp', win())).toBe('open-browser');
    expect(pushSupport('unsupported', win())).toBe('unsupported');
    expect(pushSupport('desktop-chromium', null)).toBe('unsupported');
  });
});
