import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { WindowHistoryService } from './window-history.service';

const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36';
const PIXEL = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1';

/** Navigation API de mentira: basta con lo que lee el servicio. */
class FakeNavigation extends EventTarget {
  canGoBack = false;
  canGoForward = false;

  move(canGoBack: boolean, canGoForward: boolean): void {
    Object.assign(this, { canGoBack, canGoForward });
    this.dispatchEvent(new Event('currententrychange'));
  }
}

describe('WindowHistoryService', () => {
  const originalMatchMedia = window.matchMedia;
  let navigation: FakeNavigation;
  let modes: string[];
  let onModeChange: (() => void)[];

  function setup({ mode = 'standalone', ua = WINDOWS, api = true } = {}): WindowHistoryService {
    modes = [mode];
    onModeChange = [];
    window.matchMedia = ((query: string) => ({
      matches: modes.some((item) => query === `(display-mode: ${item})`),
      media: query,
      addEventListener: (_: string, listener: () => void) => onModeChange.push(listener),
    })) as never;
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
    navigation = new FakeNavigation();
    Object.defineProperty(window, 'navigation', { value: api ? navigation : undefined, configurable: true });
    return TestBed.inject(WindowHistoryService);
  }

  function changeMode(...next: string[]): void {
    modes = next;
    for (const listener of onModeChange) listener();
  }

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete (window as { navigation?: unknown }).navigation;
    vi.restoreAllMocks();
  });

  it('recién abierta no hay flechas; salen al navegar y se quedan al volver', () => {
    const history = setup();
    expect(history.visible()).toBe(false);
    navigation.move(true, false);
    expect(history.visible()).toBe(true);
    navigation.move(false, true);
    expect(history.visible()).toBe(true);
    expect(history.canGoBack()).toBe(false);
  });

  it.each(['browser', 'minimal-ui', 'fullscreen'])('en modo «%s» no salen', (mode) => {
    const history = setup({ mode });
    navigation.move(true, true);
    expect(history.visible()).toBe(false);
  });

  it.each([PIXEL, IPAD])('en teléfono y tableta no salen', (ua) => {
    const history = setup({ ua });
    navigation.move(true, true);
    expect(history.visible()).toBe(false);
  });

  it('sin Navigation API no se ofrecen', () => {
    expect(setup({ api: false }).visible()).toBe(false);
  });

  it('instalar desde la pestaña las saca; la pantalla completa no las quita', () => {
    const history = setup({ mode: 'browser' });
    navigation.move(true, false);
    changeMode('standalone');
    expect(history.visible()).toBe(true);
    changeMode('fullscreen');
    expect(history.visible()).toBe(true);
    changeMode('standalone');
    expect(history.visible()).toBe(true);
    changeMode('browser');
    expect(history.visible()).toBe(false);
  });

  it('sin destino no se mueve', () => {
    const history = setup();
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
    history.back();
    expect(back).not.toHaveBeenCalled();
    navigation.move(true, false);
    history.back();
    expect(back).toHaveBeenCalledOnce();
  });
});
