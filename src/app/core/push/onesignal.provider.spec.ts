import { ONESIGNAL_SDK_URL, ONESIGNAL_SW_PATH, ONESIGNAL_SW_SCOPE, OneSignalProvider } from './onesignal.provider';

type Deferred = (sdk: unknown) => Promise<void> | void;
const deferred = (): Deferred[] => (window as unknown as { OneSignalDeferred: Deferred[] }).OneSignalDeferred;
const scripts = (): NodeListOf<HTMLScriptElement> => document.querySelectorAll(`script[src="${ONESIGNAL_SDK_URL}"]`);

/** SDK falso con la forma de OneSignal v16 (`init`, `User`, `PushSubscription`). */
function fakeSdk() {
  const subscription = {
    optedIn: false,
    async optIn() {
      subscription.optedIn = true;
    },
    async optOut() {
      subscription.optedIn = false;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const tags = new Map<string, string>();
  const sdk = {
    init: vi.fn(async (_options: Record<string, unknown>) => undefined),
    User: {
      addTag: (key: string, value: string) => void tags.set(key, value),
      removeTag: (key: string) => void tags.delete(key),
      setLanguage: vi.fn(),
      PushSubscription: subscription,
    },
  };
  return { sdk, tags };
}

describe('OneSignalProvider (SDK web v16, bajo demanda)', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)['OneSignalDeferred'];
    scripts().forEach((script) => script.remove());
  });

  it('carga el SDK una vez y lo inicia con su service worker, la bienvenida y el clic en la web', async () => {
    const provider = new OneSignalProvider(document);
    const welcome = { title: 'Proiectul Împreună', message: 'Gata!', url: 'https://elimarganda.com/impreuna' };
    const first = provider.connect({ appId: 'app-id', safariWebId: 'web.onesignal.auto.x', welcome });
    const second = provider.connect({ appId: 'app-id' });
    expect(scripts().length).toBe(1);
    expect(deferred().length).toBe(1);

    const { sdk, tags } = fakeSdk();
    await deferred()[0](sdk); // lo que hace el SDK al llegar: consumir la cola
    const client = await first;
    expect(await second).toBe(client);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith({
      appId: 'app-id',
      safari_web_id: 'web.onesignal.auto.x',
      serviceWorkerPath: ONESIGNAL_SW_PATH,
      serviceWorkerParam: { scope: ONESIGNAL_SW_SCOPE },
      autoResubscribe: true,
      notifyButton: { enable: false },
      notificationClickHandlerMatch: 'origin',
      notificationClickHandlerAction: 'navigate',
      persistNotification: false,
      welcomeNotification: welcome,
    });

    await client.optIn();
    expect(client.optedIn()).toBe(true);
    await client.tag('impreuna', 'ro');
    expect(tags.get('impreuna')).toBe('ro');
    await client.tag('impreuna', null);
    expect(tags.has('impreuna')).toBe(false);
  });

  it('sin bienvenida (la comprobación al abrir la página) la desactiva', async () => {
    const pending = new OneSignalProvider(document).connect({ appId: 'app-id' });
    const { sdk } = fakeSdk();
    await deferred()[0](sdk);
    await pending;
    expect(sdk.init.mock.calls[0][0]['welcomeNotification']).toEqual({ disable: true });
    expect('safari_web_id' in sdk.init.mock.calls[0][0]).toBe(false); // sin id, no se manda
  });

  it('si el SDK no carga (bloqueador), falla limpio y el siguiente intento vuelve a probar', async () => {
    const provider = new OneSignalProvider(document);
    const attempt = provider.connect({ appId: 'app-id' });
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(attempt).rejects.toThrow(/bloqueador/);
    expect(deferred().length).toBe(0); // su callback sale de la cola: nunca dos `init()`
    expect(scripts().length).toBe(0);

    const retry = provider.connect({ appId: 'app-id' });
    expect(scripts().length).toBe(1);
    await deferred()[0](fakeSdk().sdk);
    await expect(retry).resolves.toBeTruthy();
  });
});
