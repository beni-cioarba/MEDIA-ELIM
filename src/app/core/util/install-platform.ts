/**
 * Detección de la plataforma para **instalar la web como aplicación** (PWA).
 *
 * ── Por qué hace falta ────────────────────────────────────────────────
 * Sólo los navegadores Chromium (Chrome, Edge, Samsung Internet, Opera…)
 * ofrecen un aviso de instalación programable (`beforeinstallprompt`). En el
 * resto la instalación existe pero es **manual** y cada uno la esconde en un
 * sitio distinto: Safari en «Compartir», Firefox en su menú, iOS 26 detrás de
 * «⋯»… y los navegadores integrados de Instagram, Facebook o WhatsApp no la
 * ofrecen en absoluto (hay que abrir antes la página en el navegador real).
 *
 * Esta función decide **qué instrucciones** necesita quien está mirando. Es
 * pura (recibe el UA y el nº de puntos táctiles) para poder probarla con los
 * UA reales de cada navegador sin un dispositivo delante.
 *
 * ── Trampas conocidas ─────────────────────────────────────────────────
 *  · **iPadOS ≥ 13 se hace pasar por Mac** («Macintosh» en el UA). Lo delata
 *    la pantalla táctil: un Mac no tiene `maxTouchPoints > 1`.
 *  · **En iOS todos los navegadores son WebKit**: Chrome (`CriOS`), Firefox
 *    (`FxiOS`) y Edge (`EdgiOS`) instalan igual que Safari (iOS ≥ 16.4), sólo
 *    cambia dónde está el botón «Compartir».
 *  · **Safari 26 congela la versión del sistema** del UA en 18_6: la versión
 *    real se lee de `Version/26`, no de `OS 18_6`.
 *  · Los navegadores integrados se identifican por su firma en el UA
 *    (`Instagram`, `FBAN`, `WhatsApp`…) o, en Android, por `; wv)` (WebView).
 */

/** Familia de instrucciones de instalación. */
export type InstallPlatform =
  /** Safari de iPhone/iPad: Compartir → Añadir a pantalla de inicio. */
  | 'ios-safari'
  /** Chrome / Edge / Firefox en iOS (WebKit, mismo gesto, otro botón). */
  | 'ios-browser'
  /** Navegador integrado de una app (Instagram, WhatsApp…) en iOS. */
  | 'ios-inapp'
  /** Chrome, Edge, Opera… en Android (menú ⋮ → Instalar aplicación). */
  | 'android-chromium'
  /** Samsung Internet (menú ☰ → Añadir página a → Pantalla de inicio). */
  | 'android-samsung'
  /** Firefox para Android (menú ⋮ → Instalar). */
  | 'android-firefox'
  /** Navegador integrado / WebView en Android. */
  | 'android-inapp'
  /** Safari ≥ 17 en macOS (Archivo → Añadir al Dock). */
  | 'mac-safari'
  /** Chrome / Edge de escritorio (icono de instalar en la barra de direcciones). */
  | 'desktop-chromium'
  /** Escritorio sin instalación (Firefox, Safari antiguo…). */
  | 'unsupported';

/** Clase de dispositivo: decide si el control se ofrece sin esperar al aviso nativo. */
export type DeviceClass = 'phone' | 'tablet' | 'desktop';

export interface InstallEnvironment {
  readonly platform: InstallPlatform;
  readonly device: DeviceClass;
  /** Versión mayor de Safari (iOS/macOS); `null` si no aplica o no se lee. */
  readonly safariVersion: number | null;
}

/** Apps cuya vista web no permite instalar: hay que salir al navegador. */
const IN_APP_SIGNATURES =
  /\b(FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Snapchat|musical_ly|TikTok|BytedanceWebview|Line\/|LinkedInApp|Twitter|Pinterest|GSA\/|MicroMessenger|Telegram)\b/i;

/**
 * Deduce plataforma, clase de dispositivo y versión de Safari.
 *
 * @param ua             `navigator.userAgent`.
 * @param maxTouchPoints `navigator.maxTouchPoints` (para desenmascarar iPadOS).
 */
export function detectInstallEnvironment(ua: string, maxTouchPoints = 0): InstallEnvironment {
  const ipadAsMac = /Macintosh/.test(ua) && maxTouchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipadAsMac;
  const android = /Android/i.test(ua);
  const inApp = IN_APP_SIGNATURES.test(ua) || (android && /; wv\)/.test(ua));
  const safariMatch = /Version\/(\d+)/.exec(ua);
  const safariVersion = safariMatch ? Number(safariMatch[1]) : null;

  const device: DeviceClass = ios
    ? /iPad/.test(ua) || ipadAsMac
      ? 'tablet'
      : 'phone'
    : android
      ? // Android sin «Mobile» en el UA = tableta (convención de Google).
        /Mobile/.test(ua)
        ? 'phone'
        : 'tablet'
      : 'desktop';

  let platform: InstallPlatform;
  if (ios) {
    platform = inApp ? 'ios-inapp' : /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-browser' : 'ios-safari';
  } else if (android) {
    platform = inApp
      ? 'android-inapp'
      : /SamsungBrowser/.test(ua)
        ? 'android-samsung'
        : /Firefox\//.test(ua)
          ? 'android-firefox'
          : 'android-chromium';
  } else if (/Chrome\/|Edg\//.test(ua) && !/Firefox\//.test(ua)) {
    platform = 'desktop-chromium';
  } else if (/Macintosh/.test(ua) && /Safari\//.test(ua) && (safariVersion ?? 0) >= 17) {
    platform = 'mac-safari';
  } else {
    platform = 'unsupported';
  }

  return { platform, device, safariVersion: ios || platform === 'mac-safari' ? safariVersion : null };
}

/** Navegador concreto en iOS (cambia dónde está «Compartir»). */
export function iosBrowserOf(ua: string): 'chrome' | 'firefox' | 'edge' | 'other' {
  if (/CriOS/.test(ua)) return 'chrome';
  if (/FxiOS/.test(ua)) return 'firefox';
  if (/EdgiOS/.test(ua)) return 'edge';
  return 'other';
}
