import { DOCUMENT, InjectionToken, inject } from '@angular/core';
import { OneSignalProvider } from './onesignal.provider';

/**
 * Lo que la app necesita de un proveedor de web push. Hoy es OneSignal
 * (`onesignal.provider.ts`); las pruebas usan uno falso y cambiar de
 * proveedor no toca ni el servicio ni la interfaz.
 */
export interface PushClient {
  /** La suscripción de este navegador recibe avisos (permiso + alta en el proveedor). */
  optedIn(): boolean;
  /** Da de alta (o reanuda) y espera a que el alta conste. */
  optIn(): Promise<void>;
  optOut(): Promise<void>;
  /** Etiqueta de la suscripción; `null` la quita. */
  tag(key: string, value: string | null): Promise<void>;
  setLanguage(lang: string): void;
}

/** Aviso de confirmación que el proveedor manda una sola vez, al darse de alta. */
export interface PushWelcome {
  readonly title: string;
  readonly message: string;
  readonly url?: string;
}

export interface PushConnectOptions {
  readonly appId: string;
  /** Safari Web ID del proveedor (Safari antiguo de macOS). */
  readonly safariWebId?: string;
  readonly welcome?: PushWelcome;
}

export interface PushProvider {
  /**
   * Carga e inicia el proveedor. Sólo la primera llamada lo hace; las
   * siguientes devuelven la misma conexión (si falla, la próxima reintenta).
   */
  connect(options: PushConnectOptions): Promise<PushClient>;
}

/** Proveedor de web push de la app (OneSignal). */
export const PUSH_PROVIDER = new InjectionToken<PushProvider>('PUSH_PROVIDER', {
  providedIn: 'root',
  factory: () => new OneSignalProvider(inject(DOCUMENT)),
});
