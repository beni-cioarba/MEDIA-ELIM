import { DOCUMENT, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { CHURCH_CONFIG } from '../church.config';
import { LanguageService } from '../services/language.service';
import { LoggerService } from '../services/logger.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { InstallPlatform } from '../util/install-platform';
import { ONESIGNAL_SW_SCOPE } from './onesignal.provider';
import { PUSH_PROVIDER, PushClient, PushWelcome } from './push-client';

/** Si este navegador puede recibir avisos y, si no, qué hay que decirle a quien mira. */
export type PushSupport =
  | 'ok'
  /** iPhone / iPad: sólo desde la app puesta en la pantalla de inicio (iOS ≥ 16.4). */
  | 'ios-install'
  /** Navegador integrado de Android (Instagram, WhatsApp…): hay que abrir Chrome. */
  | 'open-browser'
  | 'unsupported';

/** Cómo acabó activar o desactivar: la interfaz lo explica. */
export type PushOutcome = 'on' | 'off' | 'dismissed' | 'denied' | 'unsupported' | 'error';

/** Temas activados en este dispositivo: tema → idioma con que se pidió. */
type Topics = Readonly<Record<string, string>>;

const STORAGE_KEY = 'elim.push.topics';

/**
 * OneSignal sólo funciona en el origen de su «Site URL», la web pública
 * (`CHURCH_CONFIG.publicUrl`). En cualquier otro (un proxy de traducción como
 * `*.translate.goog`, una vista previa) el interruptor fallaría al tocarlo, así
 * que no se enseña. En local sí, para poder trabajar la interfaz: conectar no
 * puede (OneSignal rechaza ese origen) y la tarjeta lo dice.
 */
export function pushOriginAllowed(origin: string, publicUrl: string): boolean {
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return true;
  try {
    return origin === new URL(publicUrl).origin;
  } catch {
    return false;
  }
}

/**
 * ¿Puede este navegador recibir web push? Pura (pruebas): mira las APIs, no el
 * agente de usuario; la plataforma sólo decide qué explicar cuando no puede.
 */
export function pushSupport(platform: InstallPlatform, win: Window | null): PushSupport {
  if (!win) return 'unsupported';
  if (win.isSecureContext && 'serviceWorker' in win.navigator && 'PushManager' in win && 'Notification' in win) {
    return 'ok';
  }
  if (platform.startsWith('ios-')) {
    // Ya instalada y aun así sin push: iOS anterior a 16.4.
    const nav = win.navigator as Navigator & { standalone?: boolean };
    const installed = nav.standalone === true || win.matchMedia?.('(display-mode: standalone)').matches === true;
    return installed ? 'unsupported' : 'ios-install';
  }
  return platform === 'android-inapp' ? 'open-browser' : 'unsupported';
}

/**
 * Avisos web push de la app, por **temas** (hoy uno: la amintire zilnică de
 * Proiectul Împreună, `impreuna`). Cada tema es una etiqueta de la suscripción
 * cuyo valor es el idioma, y el envío (`scripts/impreuna-push.mjs`) apunta a
 * esa etiqueta: así cada uno lo recibe en su idioma.
 *
 *  · **Apagado sin App ID** (`CHURCH_CONFIG.oneSignalAppId` vacío) o fuera de
 *    la web pública (`pushOriginAllowed`): no se pinta ni se carga nada.
 *  · **Permiso primero**: el del navegador se pide dentro del toque, antes de
 *    cargar el SDK (Safari no lo concede fuera del gesto).
 *  · **Estado en el dispositivo** (`localStorage`) para pintar el interruptor
 *    al instante; al abrir la página se comprueba en segundo plano con el
 *    proveedor (`reconcile`), que es quien manda.
 *  · **Baja robusta**: si el SDK no carga (bloqueador), se corta la
 *    suscripción del propio navegador y deja de llegar igual.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly provider = inject(PUSH_PROVIDER);
  private readonly language = inject(LanguageService);
  private readonly log = inject(LoggerService).prefix('push');
  private readonly config = inject(CHURCH_CONFIG, { optional: true });
  private readonly appId = this.config?.oneSignalAppId ?? '';

  /** Hay App ID de OneSignal y estamos en su web: si no, la función no existe. */
  readonly configured =
    this.appId !== '' && pushOriginAllowed(this.window?.location.origin ?? '', this.config?.publicUrl ?? '');
  readonly support: PushSupport = pushSupport(inject(PwaInstallService).env.platform, this.window);

  private readonly _permission = signal<NotificationPermission>(this.readPermission());
  /** Permiso del navegador para este sitio (se relee al volver a la pestaña). */
  readonly permission = this._permission.asReadonly();
  private readonly topics = signal<Topics>(this.load());
  private readonly _busy = signal(false);
  /** Activando o desactivando: el interruptor espera. */
  readonly busy = this._busy.asReadonly();
  private reconciling: Promise<void> | null = null;
  private reconciled = false;

  constructor() {
    const win = this.window;
    if (!win || !this.configured || this.support !== 'ok') return;

    // El permiso se puede cambiar fuera (ajustes del navegador).
    win.document.addEventListener('visibilitychange', () => {
      if (!win.document.hidden) this.refreshPermission();
    });
    win.navigator.permissions?.query({ name: 'notifications' as PermissionName }).then(
      (status) => status.addEventListener('change', () => this.refreshPermission()),
      () => undefined,
    );

    // Si cambia el idioma de la web, cambia el del aviso (su etiqueta).
    effect(() => {
      const lang = this.language.current();
      if (Object.values(this.topics()).some((l) => l !== lang)) {
        untracked(() => {
          this.reconciled = false;
          void this.reconcile();
        });
      }
    });
  }

  /** El tema está activado en este dispositivo y el navegador da permiso. */
  isOn(topic: string): boolean {
    return this.permission() === 'granted' && Object.hasOwn(this.topics(), topic);
  }

  /**
   * Activa un tema. **Llamar directamente desde el `click`, sin `await`
   * antes**: lo primero es pedir el permiso nativo, y Safari sólo lo concede
   * dentro del gesto. Después se carga el proveedor, se da de alta y se
   * etiqueta con el idioma actual.
   */
  async enable(topic: string, welcome?: PushWelcome): Promise<PushOutcome> {
    if (!this.configured || this.support !== 'ok') return 'unsupported';
    if (this._busy()) return this.isOn(topic) ? 'on' : 'off';
    this._busy.set(true);
    try {
      const permission = await this.requestPermission();
      this._permission.set(permission);
      if (permission === 'denied') return 'denied';
      if (permission !== 'granted') return 'dismissed';

      const lang = this.language.current();
      const client = await this.connect(welcome);
      await client.optIn();
      await client.tag(topic, lang);
      client.setLanguage(lang);
      this.save({ ...this.topics(), [topic]: lang });
      this.reconciled = true;
      return 'on';
    } catch (err) {
      this.log.warn('No se pudo activar el aviso.', err);
      return 'error';
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Desactiva un tema: quita su etiqueta y, si era el último, da de baja la
   * suscripción. Si el proveedor no responde, corta la suscripción del
   * navegador (lo que de verdad entrega los avisos).
   */
  async disable(topic: string): Promise<PushOutcome> {
    if (this._busy()) return this.isOn(topic) ? 'on' : 'off';
    const rest = Object.fromEntries(Object.entries(this.topics()).filter(([t]) => t !== topic));
    const last = Object.keys(rest).length === 0;
    this._busy.set(true);
    try {
      const client = await this.connect();
      await client.tag(topic, null);
      if (last) await client.optOut();
      this.save(rest);
      return 'off';
    } catch (err) {
      this.log.warn('El proveedor no respondió a la baja; se corta la suscripción del navegador.', err);
      if (last && (await this.unsubscribeBrowser())) {
        this.save(rest);
        return 'off';
      }
      return 'error';
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Con algún tema activo, comprueba en segundo plano (una vez por sesión, y
   * otra si cambia el idioma) que la suscripción sigue viva y bien etiquetada.
   * `optIn` es idempotente: si el navegador la perdió con el permiso aún
   * concedido, la rehace. Nunca enseña errores: el interruptor sigue igual.
   */
  reconcile(): Promise<void> {
    if (!this.configured || this.support !== 'ok' || this.reconciled) return Promise.resolve();
    this.reconciling ??= this.runReconcile().finally(() => (this.reconciling = null));
    return this.reconciling;
  }

  private async runReconcile(): Promise<void> {
    const active = Object.keys(this.topics());
    if (!active.length || this.readPermission() !== 'granted') return;
    try {
      const lang = this.language.current();
      const client = await this.connect();
      await client.optIn();
      for (const topic of active) await client.tag(topic, lang);
      client.setLanguage(lang);
      this.save(Object.fromEntries(active.map((topic) => [topic, lang])));
      this.reconciled = true;
    } catch (err) {
      this.log.warn('No se pudo comprobar la suscripción; se reintentará en otra visita.', err);
    }
  }

  private connect(welcome?: PushWelcome): Promise<PushClient> {
    const safariWebId = this.config?.oneSignalSafariWebId || undefined;
    return this.provider.connect({ appId: this.appId, safariWebId, welcome });
  }

  /** Permiso nativo. Safari antiguo usa callback; el resto, promesa. */
  private requestPermission(): Promise<NotificationPermission> {
    const api = this.window?.Notification;
    if (!api) return Promise.resolve('denied');
    if (api.permission !== 'default') return Promise.resolve(api.permission);
    return new Promise((resolve) => {
      const settle = (permission?: NotificationPermission): void => resolve(permission ?? api.permission);
      api.requestPermission(settle)?.then(settle, () => settle());
    });
  }

  private readPermission(): NotificationPermission {
    return this.window?.Notification?.permission ?? 'default';
  }

  private refreshPermission(): void {
    this._permission.set(this.readPermission());
  }

  /** Corta la suscripción push del navegador (la del service worker de OneSignal). */
  private async unsubscribeBrowser(): Promise<boolean> {
    try {
      const registration = await this.window?.navigator.serviceWorker?.getRegistration(ONESIGNAL_SW_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      return subscription ? await subscription.unsubscribe() : true;
    } catch {
      return false;
    }
  }

  private load(): Topics {
    try {
      const raw = this.window?.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'),
      );
    } catch {
      return {};
    }
  }

  private save(topics: Topics): void {
    this.topics.set(topics);
    try {
      if (Object.keys(topics).length) this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
      else this.window?.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento (privado): vale para esta visita; el proveedor sigue mandando.
    }
  }
}
