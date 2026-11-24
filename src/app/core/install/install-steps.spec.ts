import es from '../../../assets/i18n/install.es.json';
import ro from '../../../assets/i18n/install.ro.json';
import { DeviceClass, InstallPlatform, detectInstallEnvironment } from '../util/install-platform';
import { chromeIntent, installSteps, offersChrome } from './install-steps';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';

/** [nombre, UA, puntos táctiles, plataforma, dispositivo, primer paso, ¿Chrome?] */
const CASES: readonly [string, string, number, InstallPlatform, DeviceClass, string, string | null][] = [
  ['Safari iOS 18', `${IOS} Version/18.6 Mobile/15E148 Safari/604.1`, 5, 'ios-safari', 'phone', 'ios_share_bar', null],
  ['Safari iOS 26', `${IOS} Version/26.1 Mobile/15E148 Safari/604.1`, 5, 'ios-safari', 'phone', 'ios26_more', null],
  ['iPad iPadOS 26', `${MAC} Version/26.1 Safari/605.1.15`, 5, 'ios-safari', 'tablet', 'ipad_share_bar', null],
  ['Chrome iOS', `${IOS} CriOS/148.0.0.0 Mobile/15E148 Safari/604.1`, 5, 'ios-browser', 'phone', 'ios_chrome_share', null],
  ['Firefox iOS', `${IOS} FxiOS/148.0 Mobile/15E148 Safari/605.1.15`, 5, 'ios-browser', 'phone', 'ios_firefox_share', null],
  ['Edge iOS', `${IOS} Version/18.0 EdgiOS/148.0 Mobile/15E148 Safari/604.1`, 5, 'ios-browser', 'phone', 'ios_edge_share', null],
  ['Opera iOS', `${IOS} Version/18.0 Mobile/15E148 Safari/604.1 OPT/5.0`, 5, 'ios-browser', 'phone', 'ios_other_share', null],
  ['Instagram iOS', `${IOS} Mobile/15E148 Instagram 400.0`, 5, 'ios-inapp', 'phone', 'inapp_open_ios', null],
  ['vista web iOS sin firma', `${IOS} Mobile/15E148`, 5, 'ios-inapp', 'phone', 'inapp_open_ios', null],
  ['Chrome Android', `${ANDROID} Chrome/148.0.0.0 Mobile Safari/537.36`, 5, 'android-chromium', 'phone', 'android_menu', null],
  ['tableta Android', `${ANDROID} Chrome/148.0.0.0 Safari/537.36`, 5, 'android-chromium', 'tablet', 'android_menu', null],
  ['Edge Android', `${ANDROID} Chrome/148.0.0.0 Mobile Safari/537.36 EdgA/148.0`, 5, 'android-chromium', 'phone', 'android_menu', null],
  ['Opera Android', `${ANDROID} Chrome/148.0.0.0 Mobile Safari/537.36 OPR/90.0`, 5, 'android-chromium', 'phone', 'android_menu', null],
  ['Samsung Internet', `${ANDROID} SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36`, 5, 'android-samsung', 'phone', 'samsung_menu', 'also'],
  ['Firefox Android', 'Mozilla/5.0 (Android 15; Mobile; rv:148.0) Gecko/148.0 Firefox/148.0', 5, 'android-firefox', 'phone', 'android_menu', 'also'],
  ['Facebook Android', `${ANDROID} Version/4.0 Chrome/148.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/500]`, 5, 'android-inapp', 'phone', 'inapp_open_android', 'only'],
  ['WebView Android', 'Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 Version/4.0 Chrome/148.0 Mobile Safari/537.36', 5, 'android-inapp', 'phone', 'inapp_open_android', 'only'],
  ['navegador de Xiaomi', `${ANDROID} Version/4.0 Chrome/112.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.0`, 5, 'android-other', 'phone', 'other_open_android', 'only'],
  ['navegador de Huawei', `${ANDROID} Chrome/114.0 HuaweiBrowser/15.0 Mobile Safari/537.36`, 5, 'android-other', 'phone', 'other_open_android', 'only'],
  ['Safari macOS', `${MAC} Version/26.0 Safari/605.1.15`, 0, 'mac-safari', 'desktop', 'mac_dock', null],
  ['Chrome Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', 0, 'desktop-chromium', 'desktop', 'desktop', null],
  ['Edge Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', 0, 'desktop-chromium', 'desktop', 'desktop', null],
  ['Firefox Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0', 0, 'desktop-firefox', 'desktop', 'firefox_taskbar', null],
  ['Firefox Windows antiguo', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 0, 'unsupported', 'desktop', 'desktop', null],
  ['Firefox Linux', 'Mozilla/5.0 (X11; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0', 0, 'unsupported', 'desktop', 'desktop', null],
];

describe('instalar, navegador por navegador', () => {
  for (const [name, ua, touch, platform, device, first, chrome] of CASES) {
    it(name, () => {
      const env = detectInstallEnvironment(ua, touch);
      expect(env.platform).toBe(platform);
      expect(env.device).toBe(device);
      expect(offersChrome(env)).toBe(chrome);
      const steps = installSteps(env, ua);
      expect(steps[0].key).toBe(`install.step.${first}`);
      // Sin claves a la vista: todo paso tiene texto en los dos idiomas.
      for (const { key } of steps) {
        const id = key.replace('install.step.', '');
        expect(Object.keys(ro.install.step)).toContain(id);
        expect(Object.keys(es.install.step)).toContain(id);
      }
    });
  }

  it('iOS 26 pide dejar activado «Abrir como app web»', () => {
    const last = (version: string): string | undefined => {
      const ua = `${IOS} Version/${version} Mobile/15E148 Safari/604.1`;
      return installSteps(detectInstallEnvironment(ua, 5), ua).at(-1)?.key;
    };
    expect(last('26.0')).toBe('install.step.confirm_ios26');
    expect(last('18.6')).toBe('install.step.confirm');
  });

  it('ningún texto de paso sobra', () => {
    const used = new Set(
      CASES.flatMap(([, ua, touch]) => installSteps(detectInstallEnvironment(ua, touch), ua).map((s) => s.key)),
    );
    expect(Object.keys(ro.install.step).filter((id) => !used.has(`install.step.${id}`))).toEqual([]);
  });
});

describe('chromeIntent', () => {
  it('abre la misma página en Chrome, con vuelta a ella', () => {
    expect(
      chromeIntent({ href: 'https://elimarganda.com/anunturi?lang=es', host: 'elimarganda.com', pathname: '/anunturi', search: '?lang=es' }),
    ).toBe(
      'intent://elimarganda.com/anunturi?lang=es#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Felimarganda.com%2Fanunturi%3Flang%3Des;end',
    );
  });
});
