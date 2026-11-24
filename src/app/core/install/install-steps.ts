import { IconName } from '../ui/icon-name';
import { InstallEnvironment, iosBrowserOf } from '../util/install-platform';

/**
 * Instrucciones para instalar a mano, por navegador. Pura: el test la recorre
 * con los UA reales. Los textos (`install.step.*`) citan el rótulo de cada
 * menú (para iOS, los del manual de Apple en rumano y en español).
 */
export interface InstallStep {
  /** Clave del paquete `install` (puede llevar `<b>` del propio diccionario). */
  readonly key: string;
  /** El glifo que la persona tiene que buscar en su pantalla. */
  readonly icon?: IconName;
}

const step = (key: string, icon?: IconName): InstallStep => ({ key: `install.step.${key}`, ...(icon ? { icon } : {}) });

/** iOS 26 añade «Abrir como app web», que hay que dejar activado. */
const iosFinish = (version: number | null): readonly InstallStep[] => [
  step('add_home', 'add-box'),
  step((version ?? 0) >= 26 ? 'confirm_ios26' : 'confirm'),
];

export function installSteps(env: InstallEnvironment, ua: string): readonly InstallStep[] {
  const { platform, device, safariVersion } = env;
  switch (platform) {
    case 'ios-safari':
      // iOS 26 esconde «Compartir» tras «⋯» en el iPhone; en el iPad sigue en
      // la barra de arriba.
      if ((safariVersion ?? 0) >= 26 && device === 'phone') {
        return [step('ios26_more', 'more-horiz'), step('ios_share', 'share-ios'), ...iosFinish(safariVersion)];
      }
      return [
        step(device === 'tablet' ? 'ipad_share_bar' : 'ios_share_bar', 'share-ios'),
        ...iosFinish(safariVersion),
      ];
    case 'ios-browser': {
      const first = {
        chrome: step('ios_chrome_share', 'share-ios'),
        firefox: step('ios_firefox_share', 'menu'),
        edge: step('ios_edge_share', 'more-horiz'),
        other: step('ios_other_share', 'share-ios'),
      }[iosBrowserOf(ua)];
      return [first, ...iosFinish(safariVersion)];
    }
    case 'ios-inapp':
      return [step('inapp_open_ios', 'external'), step('inapp_then', 'install-app')];
    case 'android-inapp':
      return [step('inapp_open_android', 'external'), step('inapp_then', 'install-app')];
    case 'android-other':
      return [step('other_open_android', 'external'), step('inapp_then', 'install-app')];
    case 'android-samsung':
      return [step('samsung_menu', 'menu'), step('samsung_add', 'add-box'), step('confirm')];
    case 'android-firefox':
      return [step('android_menu', 'more-vert'), step('firefox_install', 'install-app'), step('confirm')];
    case 'android-chromium':
      return [step('android_menu', 'more-vert'), step('android_install', 'install-app'), step('confirm')];
    case 'mac-safari':
      return [step('mac_dock'), step('confirm')];
    case 'desktop-firefox':
      return [step('firefox_taskbar', 'install-app'), step('confirm')];
    default:
      return [step('desktop', 'install-app'), step('confirm')];
  }
}

/**
 * ¿Ofrecer «Abrir en Chrome»? En los integrados y los de fabricante es el único
 * camino; en Samsung y Firefox, la alternativa: Chrome instala la app completa.
 */
export function offersChrome({ platform }: InstallEnvironment): 'only' | 'also' | null {
  if (platform === 'android-inapp' || platform === 'android-other') return 'only';
  return platform === 'android-samsung' || platform === 'android-firefox' ? 'also' : null;
}

/** Enlace que abre la página en Chrome de Android (si no está, se queda en ella). */
export function chromeIntent(location: Pick<Location, 'href' | 'host' | 'pathname' | 'search'>): string {
  const fallback = encodeURIComponent(location.href);
  return `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
