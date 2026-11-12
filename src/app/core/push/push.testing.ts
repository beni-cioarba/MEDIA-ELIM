import { PushClient, PushConnectOptions, PushProvider } from './push-client';

/**
 * Dobles de prueba del web push: un proveedor en memoria y un navegador que
 * sabe de notificaciones (jsdom no trae `Notification`, `PushManager` ni
 * `navigator.serviceWorker`). Sólo para specs.
 */
export class FakePushClient implements PushClient {
  opted = false;
  readonly tags = new Map<string, string>();
  language = '';

  optedIn(): boolean {
    return this.opted;
  }
  async optIn(): Promise<void> {
    this.opted = true;
  }
  async optOut(): Promise<void> {
    this.opted = false;
  }
  async tag(key: string, value: string | null): Promise<void> {
    if (value === null) this.tags.delete(key);
    else this.tags.set(key, value);
  }
  setLanguage(lang: string): void {
    this.language = lang;
  }
}

export class FakePushProvider implements PushProvider {
  readonly client = new FakePushClient();
  readonly connects: PushConnectOptions[] = [];
  /** Simula un SDK que no carga (bloqueador, red). */
  fail = false;
  /** Lo que valía el permiso cuando se conectó (para comprobar el orden). */
  permissionAtConnect: NotificationPermission | null = null;

  async connect(options: PushConnectOptions): Promise<PushClient> {
    this.connects.push(options);
    this.permissionAtConnect = (window as Window & { Notification?: typeof Notification }).Notification?.permission ?? null;
    if (this.fail) throw new Error('SDK bloqueado');
    return this.client;
  }
}

/** Permiso y respuesta del diálogo nativo de notificaciones. */
export const fakeNotification = {
  permission: 'default' as NotificationPermission,
  answer: 'granted' as NotificationPermission,
  asked: 0,
};

/** Desuscripción del navegador (la usa la baja cuando el SDK no carga). */
export const fakeBrowserPush = { unsubscribed: 0 };

const STUBBED = ['Notification', 'PushManager', 'isSecureContext'] as const;

/** Da al `window` de jsdom lo que tiene un navegador con web push. */
export function stubPushBrowser(): void {
  fakeNotification.permission = 'default';
  fakeNotification.answer = 'granted';
  fakeNotification.asked = 0;
  fakeBrowserPush.unsubscribed = 0;
  class FakeNotificationApi {
    static get permission(): NotificationPermission {
      return fakeNotification.permission;
    }
    static requestPermission(): Promise<NotificationPermission> {
      fakeNotification.asked++;
      fakeNotification.permission = fakeNotification.answer;
      return Promise.resolve(fakeNotification.permission);
    }
  }
  Object.defineProperty(window, 'Notification', { value: FakeNotificationApi, configurable: true, writable: true });
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true, writable: true });
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: {
          getSubscription: async () => ({
            unsubscribe: async () => {
              fakeBrowserPush.unsubscribed++;
              return true;
            },
          }),
        },
      }),
    },
  });
}

/** Deja el `window` de jsdom como estaba. */
export function unstubPushBrowser(): void {
  for (const key of STUBBED) delete (window as unknown as Record<string, unknown>)[key];
  delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];
}

/** Deja correr las promesas pendientes (proveedor falso, `then` del componente). */
export const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));
