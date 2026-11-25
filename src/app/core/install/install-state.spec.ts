import { detectInstallEnvironment } from '../util/install-platform';
import { InstallSignals, censusEvent, resolveInstallState } from './install-state';

const NONE: InstallSignals = { standalone: false, justInstalled: false, prompt: false, related: null, marked: false };
const state = (signals: Partial<InstallSignals>) => resolveInstallState({ ...NONE, ...signals });

describe('resolveInstallState', () => {
  it('abierta desde el icono: dentro de la app, diga lo que diga el resto', () => {
    expect(state({ standalone: true, prompt: true, related: false })).toBe('app');
  });

  it('instalada y vista desde el navegador', () => {
    expect(state({ related: true })).toBe('installed');
    expect(state({ marked: true })).toBe('installed');
    expect(state({ justInstalled: true })).toBe('installed');
    // La marca (la ha abierto como app) pesa más que una API que no la ve.
    expect(state({ marked: true, related: false })).toBe('installed');
  });

  it('el aviso del navegador desmiente una marca vieja', () => {
    expect(state({ prompt: true, marked: true })).toBe('absent');
  });

  it('no instalada, o no se sabe', () => {
    expect(state({ related: false })).toBe('absent');
    expect(state({})).toBe('unknown');
  });
});

describe('censusEvent', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';
  const name = (ua: string, signals: Partial<InstallSignals> = {}, touch = 5) =>
    censusEvent({ ...NONE, ...signals }, detectInstallEnvironment(ua, touch));

  it('modo y sistema, nada más', () => {
    expect(name(IPHONE, { standalone: true })).toBe('mod-din-aplicatie-iphone');
    expect(name(IPHONE)).toBe('mod-browser-nu-se-stie-iphone');
    expect(name(ANDROID, { prompt: true })).toBe('mod-browser-nu-o-are-android');
    expect(name(ANDROID, { related: true })).toBe('mod-browser-o-are-android');
  });

  it('la estadística no usa la marca guardada en el dispositivo', () => {
    expect(name(IPHONE, { marked: true })).toBe('mod-browser-nu-se-stie-iphone');
  });

  it('un navegador integrado se cuenta aparte', () => {
    expect(name(`${ANDROID} Instagram 300.0`)).toBe('mod-browser-integrat-android');
  });
});
