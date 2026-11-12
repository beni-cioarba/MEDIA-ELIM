import type { PushClient, PushConnectOptions, PushProvider } from './push-client';

/**
 * Web push con **OneSignal** (SDK web v16), cargado sólo cuando hace falta.
 *
 *  · **Nada se descarga** hasta que alguien activa la amintire (o la tenía
 *    activa y abre la página, para mantener viva su suscripción): el resto de
 *    visitas no habla con OneSignal.
 *  · **Service worker propio en su carpeta** (`/push/onesignal/`): el de la
 *    app (ngsw) sigue en `/` y no se pisan; un navegador sólo admite uno por
 *    ámbito. El fichero está en `src/push/onesignal/` (asset de `angular.json`).
 *  · Si el SDK no llega (red, bloqueador de anuncios) la conexión falla con
 *    un error y la siguiente vuelve a intentarlo.
 *  · Del fragmento que da OneSignal se toman `appId` y `safari_web_id`; su
 *    campanita flotante (`notifyButton`) no: el interruptor está en la página.
 *
 * Referencia del SDK: https://documentation.onesignal.com/docs/web-sdk-reference
 */
export const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
/** Ruta del service worker (sin barra inicial, como pide OneSignal) y su ámbito. */
export const ONESIGNAL_SW_PATH = 'push/onesignal/OneSignalSDKWorker.js';
export const ONESIGNAL_SW_SCOPE = '/push/onesignal/';

const LOAD_TIMEOUT_MS = 20_000;
/** Tras `optIn()`, lo que se espera a que el navegador y OneSignal confirmen el alta. */
const OPT_IN_TIMEOUT_MS = 20_000;

/** Lo que se usa del SDK (subconjunto de su API pública). */
interface OneSignalSubscription {
  readonly optedIn?: boolean;
  optIn(): Promise<void>;
  optOut(): Promise<void>;
  addEventListener(event: 'change', listener: () => void): void;
  removeEventListener(event: 'change', listener: () => void): void;
}

interface OneSignalSdk {
  init(options: Record<string, unknown>): Promise<void>;
  readonly User: {
    addTag(key: string, value: string): void | Promise<void>;
    removeTag(key: string): void | Promise<void>;
    setLanguage(lang: string): void;
    readonly PushSubscription: OneSignalSubscription;
  };
}

type DeferredCallback = (sdk: OneSignalSdk) => void | Promise<void>;
type OneSignalWindow = Window & { OneSignalDeferred?: DeferredCallback[] };

export class OneSignalProvider implements PushProvider {
  private connection: Promise<PushClient> | null = null;
  /** SDK ya iniciado: `init()` sólo se puede llamar una vez por página. */
  private sdk: OneSignalSdk | null = null;
  private script: HTMLScriptElement | null = null;

  constructor(private readonly document: Document) {}

  connect(options: PushConnectOptions): Promise<PushClient> {
    this.connection ??= this.load(options).catch((err: unknown) => {
      this.connection = null; // la próxima llamada vuelve a intentarlo
      throw err;
    });
    return this.connection;
  }

  private load({ appId, safariWebId, welcome }: PushConnectOptions): Promise<PushClient> {
    const win = this.document.defaultView as OneSignalWindow | null;
    if (!win) return Promise.reject(new Error('Sin ventana: no hay web push'));
    if (this.sdk) return Promise.resolve(adapt(this.sdk, win));

    return new Promise<PushClient>((resolve, reject) => {
      const queue = (win.OneSignalDeferred ??= []);
      const fail = (err: unknown): void => {
        win.clearTimeout(timer);
        // Si el SDK aún no ha consumido la cola, este intento sale de ella:
        // un reintento no debe acabar llamando dos veces a `init()`.
        const at = Array.isArray(queue) ? queue.indexOf(callback) : -1;
        if (at >= 0) queue.splice(at, 1);
        reject(err);
      };
      const callback: DeferredCallback = async (sdk) => {
        try {
          if (!this.sdk) {
            await sdk.init({
              appId,
              ...(safariWebId ? { safari_web_id: safariWebId } : {}),
              serviceWorkerPath: ONESIGNAL_SW_PATH,
              serviceWorkerParam: { scope: ONESIGNAL_SW_SCOPE },
              // Si el navegador pierde la suscripción (caché borrada) pero
              // sigue el permiso, OneSignal la rehace sola.
              autoResubscribe: true,
              notifyButton: { enable: false },
              // Al tocar el aviso: si la web ya está abierta (pestaña o app
              // instalada), se reutiliza y va a la página del día; si no, se abre.
              notificationClickHandlerMatch: 'origin',
              notificationClickHandlerAction: 'navigate',
              // En escritorio no se queda fija en pantalla (no es urgente): pasa
              // al centro de notificaciones como cualquier otra.
              persistNotification: false,
              welcomeNotification: welcome
                ? { title: welcome.title, message: welcome.message, url: welcome.url }
                : { disable: true },
            });
            this.sdk = sdk;
          }
          win.clearTimeout(timer);
          resolve(adapt(this.sdk, win));
        } catch (err) {
          fail(err);
        }
      };
      const timer = win.setTimeout(
        () => fail(new Error('OneSignal no responde (red o bloqueador de anuncios)')),
        LOAD_TIMEOUT_MS,
      );
      queue.push(callback);

      if (!this.script) {
        const script = this.document.createElement('script');
        script.src = ONESIGNAL_SDK_URL;
        script.async = true;
        script.addEventListener('error', () => {
          script.remove();
          this.script = null;
          fail(new Error('No se pudo cargar el SDK de OneSignal (red o bloqueador de anuncios)'));
        });
        this.document.head.appendChild(script);
        this.script = script;
      }
    });
  }
}

/** La API del SDK con la forma de `PushClient`. */
function adapt(sdk: OneSignalSdk, win: Window): PushClient {
  const sub = sdk.User.PushSubscription;
  return {
    optedIn: () => sub.optedIn === true,
    async optIn() {
      await sub.optIn();
      await until(() => sub.optedIn === true, sub, win);
    },
    async optOut() {
      await sub.optOut();
    },
    async tag(key, value) {
      await (value === null ? sdk.User.removeTag(key) : sdk.User.addTag(key, value));
    },
    setLanguage: (lang) => sdk.User.setLanguage(lang),
  };
}

/**
 * Espera a que `check()` se cumpla: con el evento `change` de la suscripción
 * y, por si no llega, mirando cada 300 ms. Falla pasado `OPT_IN_TIMEOUT_MS`.
 */
function until(check: () => boolean, sub: OneSignalSubscription, win: Window): Promise<void> {
  if (check()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (ok: boolean): void => {
      win.clearTimeout(timer);
      win.clearInterval(poll);
      sub.removeEventListener('change', onChange);
      if (ok) resolve();
      else reject(new Error('OneSignal no confirmó el alta'));
    };
    const onChange = (): void => {
      if (check()) finish(true);
    };
    const poll = win.setInterval(onChange, 300);
    const timer = win.setTimeout(() => finish(false), OPT_IN_TIMEOUT_MS);
    sub.addEventListener('change', onChange);
  });
}
