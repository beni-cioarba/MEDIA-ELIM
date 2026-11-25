import type { InstallEnvironment } from '../util/install-platform';

/**
 * **¿La tiene instalada quien está mirando?** Detector puro: recibe las señales
 * que da cada navegador y dice qué se sabe.
 *
 * Ningún navegador contesta esto en todos los casos, así que cada señal vale lo
 * que vale (`docs/ai/79-install.md` → «Detector»):
 *
 *  1. Se abre **como app** (`display-mode`, `navigator.standalone`): seguro.
 *  2. Se acaba de instalar en esta carga (`appinstalled`, diálogo aceptado).
 *  3. `beforeinstallprompt`: Chromium sólo lo dispara si **no** está instalada.
 *     Manda sobre cualquier marca guardada (la han desinstalado).
 *  4. `getInstalledRelatedApps` con respuesta: instalada, vista desde el navegador.
 *  5. Marca guardada: Chromium comparte almacenamiento entre la app y el
 *     navegador, así que haberla abierto como app se sabe desde la pestaña. En
 *     iPhone no lo comparte: allí sólo vale lo que diga la persona.
 *  6. `getInstalledRelatedApps` vacío: no instalada (con ese navegador).
 *  7. Nada de lo anterior (Safari de iPhone, Firefox…): no se puede saber.
 */
export type InstallState =
  /** Abierta desde el icono. */
  | 'app'
  /** Instalada, pero se está mirando en el navegador. */
  | 'installed'
  /** No instalada. */
  | 'absent'
  /** El navegador no lo dice. */
  | 'unknown';

export interface InstallSignals {
  readonly standalone: boolean;
  /** Instalada en esta misma carga. */
  readonly justInstalled: boolean;
  /** Hay un `beforeinstallprompt` guardado. */
  readonly prompt: boolean;
  /** `getInstalledRelatedApps`; `null` = sin API o sin respuesta. */
  readonly related: boolean | null;
  /** Marca vigente: instalada, abierta como app o «ya la tengo». */
  readonly marked: boolean;
}

export function resolveInstallState(signals: InstallSignals): InstallState {
  if (signals.standalone) return 'app';
  if (signals.justInstalled) return 'installed';
  if (signals.prompt) return 'absent';
  if (signals.related || signals.marked) return 'installed';
  return signals.related === false ? 'absent' : 'unknown';
}

/** Lo que se cuenta: sistema y modo. Ni identificador, ni versión, ni modelo. */
export type CensusSystem = 'android' | 'iphone' | 'ipad' | 'calculator';

export function censusSystem({ platform, device }: InstallEnvironment): CensusSystem {
  if (platform.startsWith('android')) return 'android';
  if (platform.startsWith('ios')) return device === 'tablet' ? 'ipad' : 'iphone';
  return 'calculator';
}

const CENSUS_MODE: Readonly<Record<InstallState, string>> = {
  app: 'din-aplicatie',
  installed: 'browser-o-are',
  absent: 'browser-nu-o-are',
  unknown: 'browser-nu-se-stie',
};

/**
 * Nombre del evento anónimo: `mod-din-aplicatie-iphone`. Se calcula **sin la
 * marca guardada**: la estadística no lee nada del dispositivo, sólo lo que el
 * navegador dice en esa carga.
 */
export function censusEvent(signals: Omit<InstallSignals, 'marked'>, env: InstallEnvironment): string {
  const state = resolveInstallState({ ...signals, marked: false });
  // Un navegador integrado (Instagram, Facebook) no es el de la persona.
  const mode = env.platform.endsWith('-inapp') && state !== 'app' ? 'browser-integrat' : CENSUS_MODE[state];
  return `mod-${mode}-${censusSystem(env)}`;
}
