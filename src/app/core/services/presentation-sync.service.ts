import { DOCUMENT, DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import type { ProjectionRole } from '../presentation.service';

/**
 * Prioridad de cada papel a la hora de llevar el reloj de la presentación.
 * Gana la más alta entre las instancias vivas: las ventanas de proyección
 * mandan sobre la pestaña en pantalla completa, y ésta sobre la vista previa.
 * `solo` (vista de prueba de una diapositiva) nunca entra en la elección.
 */
export const ROLE_PRIORITY: Readonly<Record<Exclude<ProjectionRole, 'solo'>, number>> = {
  window: 20,
  inline: 10,
  preview: 1,
};

/**
 * Bonificación de una instancia **visible**. Chrome frena los temporizadores
 * de las pestañas ocultas (hasta uno por minuto tras cinco minutos): una
 * ventana minimizada no debe llevar el reloj si hay otra a la vista. Con
 * esto, cualquier instancia visible supera a cualquier oculta, y entre las
 * visibles sigue mandando el papel.
 */
const VISIBLE_BONUS = 100;

/**
 * Estado que el líder publica y los demás reflejan.
 *
 * El tiempo va como **plazos absolutos** (`startedAt` + `durationMs`), no
 * como progreso: cada instancia sabe en todo momento dónde está la
 * diapositiva sin recibir mensajes por fotograma, y la barra de progreso es
 * una animación CSS que el navegador compone sin JavaScript.
 */
export interface SyncState {
  readonly index: number;
  /** Clave de la diapositiva: manda sobre `index` (más robusta si las listas difieren un instante). */
  readonly slideKey: string | null;
  readonly paused: boolean;
  /** Instante (epoch ms) en que arrancó la diapositiva, descontado lo ya pausado. */
  readonly startedAt: number;
  /** Tiempo ya transcurrido cuando se pausó (ms); 0 si no está pausada. */
  readonly elapsedAtPause: number;
  /** 0 ⇒ sin cuenta atrás (modo manual o una sola diapositiva). */
  readonly durationMs: number;
  readonly count: number;
  /** El líder ocupa la pantalla completa nativa del navegador (sólo informativo). */
  readonly fullscreen: boolean;
}

/** Órdenes que cualquier ventana puede enviar; sólo el líder las ejecuta. */
export type SyncCommand =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'goto'; readonly index: number }
  /**
   * Ir a una diapositiva por su **clave**. A diferencia de `goto`, sirve
   * justo después de cambiar la selección: la ventana que proyecta puede
   * recibir la orden antes que la nueva lista, y la clave la espera hasta
   * que aparece (el índice apuntaría a la diapositiva equivocada).
   */
  | { readonly type: 'gotoKey'; readonly key: string }
  | { readonly type: 'pause' }
  | { readonly type: 'play' }
  | { readonly type: 'toggle' };

/** Lo que cada instancia dice de sí misma al saludar (para el panel). */
export interface PeerInfo {
  readonly role: Exclude<ProjectionRole, 'solo'>;
  /** `window.name` de la ventana: con él el panel recupera su referencia. */
  readonly name: string;
  readonly visible: boolean;
  readonly fullscreen: boolean;
  /** Medida de la pantalla en la que está («1920×1080»). */
  readonly screen: string;
}

type Message =
  | { readonly type: 'hello'; readonly id: string; readonly priority: number; readonly info: PeerInfo }
  | { readonly type: 'bye'; readonly id: string }
  | {
      readonly type: 'state';
      readonly id: string;
      readonly priority: number;
      readonly info: PeerInfo;
      readonly state: SyncState;
    }
  | { readonly type: 'command'; readonly command: SyncCommand }
  /** Panel → salidas: cada ventana muestra su número unos segundos. */
  | { readonly type: 'identify' }
  /** Recién llegado → todos: «¿quién hay?» (contestan con su saludo y estado). */
  | { readonly type: 'who' };

/** Una instancia viva de la presentación, vista desde esta. */
export interface Peer extends PeerInfo {
  readonly id: string;
  readonly priority: number;
  readonly lastSeen: number;
}

/** Ganchos que el motor del carrusel registra para reaccionar al canal. */
export interface SyncStageHooks {
  readonly onCommand: (command: SyncCommand) => void;
  /** `inherit`: aplicar aunque seamos líder (acabamos de llegar y heredamos). */
  readonly onRemoteState: (state: SyncState, inherit: boolean) => void;
}

const CHANNEL_NAME = 'iglesia-redes.presentation';
const HEARTBEAT_MS = 2_000;
/** Un par sin latido en este tiempo se da por cerrado (pestaña muerta sin `bye`). */
const STALE_MS = 6_500;
/**
 * Ventana tras unirse en la que el recién llegado escucha antes de mandar:
 * hereda la diapositiva del líder anterior en vez de arrancar en la primera.
 */
const INHERIT_WINDOW_MS = 400;

/**
 * Sincroniza la presentación entre ventanas de la **misma máquina**
 * (`BroadcastChannel`): panel de control, ventanas de proyección (una por
 * pantalla, las que hagan falta) y vista previa hablan por aquí.
 *
 * ── Un solo reloj, N salidas ──────────────────────────────────────────
 * Cada instancia que proyecta se «une» con la prioridad de su papel (más la
 * bonificación si está visible). La de mayor prioridad es el **líder**: la
 * única que decide cuándo pasa la diapositiva. Publica su estado cuando
 * cambia y como latido cada 2 s; las demás lo reflejan al instante. Como el
 * estado lleva plazos absolutos y no progreso, nadie retransmite nada por
 * fotograma y todas las pantallas cambian a la vez. Si el líder desaparece,
 * la siguiente toma el relevo con su último estado y sigue donde iba.
 *
 * ── Órdenes ───────────────────────────────────────────────────────────
 * El panel de control no proyecta: envía órdenes (`next`, `pause`, `goto`…)
 * y el líder las ejecuta. Así el panel puede cerrarse o recargarse sin que la
 * proyección se detenga.
 *
 * Los **ajustes** (bloques, duraciones, modo manual) no viajan por aquí:
 * viven en `localStorage` y cada servicio escucha el evento `storage`.
 */
@Injectable({ providedIn: 'root' })
export class PresentationSyncService {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

  /** Identidad estable de esta instancia (ventana/iframe/pestaña). */
  readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  private readonly ownRole = signal<Exclude<ProjectionRole, 'solo'> | null>(null);
  private readonly visible = signal<boolean>(true);
  private readonly ownFullscreen = signal<boolean>(false);
  private readonly _peers = signal<ReadonlyMap<string, Peer>>(new Map());
  private readonly _remoteState = signal<SyncState | null>(null);

  private hooks: SyncStageHooks | null = null;
  private lastPublished: SyncState | null = null;
  private joinedAt = 0;
  /** `false` durante la ventana de herencia: aún no publicamos nuestro estado. */
  private readonly settled = signal<boolean>(true);
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  /** Último estado recibido del líder (para el panel y los seguidores). */
  readonly remoteState = this._remoteState.asReadonly();

  private readonly _identifyAt = signal<number>(0);
  /** Instante de la última petición «identificar pantallas» (0 = nunca). */
  readonly identifyAt = this._identifyAt.asReadonly();

  /**
   * Número de esta ventana entre las salidas (1, 2, 3…), o `null` si no es
   * una ventana de proyección. Es el que muestra al identificarse.
   */
  readonly outputNumber = computed<number | null>(() => {
    if (this.ownRole() !== 'window') return null;
    const index = this.outputs().findIndex((o) => o.id === this.instanceId);
    return index >= 0 ? index + 1 : null;
  });

  /** Prioridad efectiva de esta instancia, o `null` si no proyecta. */
  private readonly ownPriority = computed<number | null>(() => {
    const role = this.ownRole();
    if (role === null) return null;
    return ROLE_PRIORITY[role] + (this.visible() ? VISIBLE_BONUS : 0);
  });

  /** ¿Esta instancia proyecta (se ha unido con un papel)? */
  readonly isJoined = computed(() => this.ownRole() !== null);

  /** Esta instancia lleva el reloj: ningún par vivo la supera. */
  readonly isLeader = computed<boolean>(() => {
    const own = this.ownPriority();
    if (own === null) return false;
    for (const peer of this._peers().values()) {
      if (peer.priority > own) return false;
      if (peer.priority === own && peer.id > this.instanceId) return false;
    }
    return true;
  });

  /**
   * El líder ya puede publicar (pasó la ventana de herencia). Quien publica
   * debe leerla de forma *reactiva*: al asentarse hay que mandar el estado.
   */
  readonly canPublish = computed<boolean>(() => this.isLeader() && this.settled());

  /** Instancias vivas (sin contar esta). */
  readonly peers = computed<readonly Peer[]>(() => [...this._peers().values()]);

  /**
   * **Salidas**: ventanas de proyección vivas, en orden estable (por nombre).
   * Es lo que el panel lista como «pantallas en directo».
   */
  readonly outputs = computed<readonly Peer[]>(() => {
    const own: Peer[] = [];
    if (this.ownRole() === 'window') {
      own.push({ ...this.info(), id: this.instanceId, priority: this.ownPriority() ?? 0, lastSeen: Date.now() });
    }
    return [...own, ...this.peers().filter((p) => p.role === 'window')].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
  });

  /** Hay al menos una **ventana de proyección** abierta en esta máquina. */
  readonly hasProjectionWindow = computed<boolean>(() => this.outputs().length > 0);

  constructor() {
    if (!this.channel) return;
    this.channel.addEventListener('message', (event: MessageEvent<Message>) =>
      this.zone.run(() => this.receive(event.data)),
    );

    // Visibilidad: cambia la prioridad (y por tanto quién lleva el reloj).
    this.visible.set(!this.document.hidden);
    const onVisibility = () => {
      this.visible.set(!this.document.hidden);
      this.announce();
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    const onFullscreen = () => {
      this.ownFullscreen.set(!!this.document.fullscreenElement);
      this.announce();
    };
    this.document.addEventListener('fullscreenchange', onFullscreen);

    // Pestaña o ventana que se cierra: avisar para que el relevo sea inmediato.
    const onPageHide = () => this.leave();
    window.addEventListener('pagehide', onPageHide);

    this.zone.runOutsideAngular(() => {
      const prune = setInterval(() => this.pruneStalePeers(), HEARTBEAT_MS);
      this.destroyRef.onDestroy(() => clearInterval(prune));
    });
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('pagehide', onPageHide);
      this.leave();
      this.channel?.close();
    });

    // El panel (que no se une) pregunta quién hay al arrancar: sin esperar
    // al siguiente latido, la lista de pantallas aparece al instante.
    this.post({ type: 'who' });
  }

  /** El carrusel se registra para ejecutar órdenes y reflejar el estado ajeno. */
  registerStage(hooks: SyncStageHooks): void {
    this.hooks = hooks;
  }

  /** Entra en la elección de líder con la prioridad de su papel. */
  join(role: Exclude<ProjectionRole, 'solo'>): void {
    if (this.ownRole() === role) return;
    this.ownRole.set(role);
    this.joinedAt = Date.now();
    this.settled.set(false);
    this.zone.runOutsideAngular(() =>
      setTimeout(() => this.zone.run(() => this.settled.set(true)), INHERIT_WINDOW_MS),
    );
    this.announce();
    this.startHeartbeat();
  }

  /** Sale de la elección (deja de proyectar). */
  leave(): void {
    if (this.ownRole() === null) return;
    this.post({ type: 'bye', id: this.instanceId });
    this.ownRole.set(null);
    this.stopHeartbeat();
  }

  /** Publica el estado del carrusel (sólo tiene efecto si esta instancia es líder). */
  publishState(state: SyncState): void {
    if (!this.isLeader() || !this.settled()) return;
    this.lastPublished = state;
    const priority = this.ownPriority();
    if (priority === null) return;
    this.post({ type: 'state', id: this.instanceId, priority, info: this.info(), state });
  }

  /** Envía una orden al líder (quien sea). Si esta instancia lo es, la ejecuta. */
  sendCommand(command: SyncCommand): void {
    if (this.isLeader()) {
      this.hooks?.onCommand(command);
      return;
    }
    this.post({ type: 'command', command });
  }

  /** Pide a todas las salidas que muestren su número (para saber cuál es cuál). */
  identify(): void {
    this.post({ type: 'identify' });
    if (this.ownRole() === 'window') this._identifyAt.set(Date.now());
  }

  // -------------------------------------------------------------------

  private info(): PeerInfo {
    const screen = typeof window === 'undefined' ? '' : `${window.screen.width}×${window.screen.height}`;
    return {
      role: this.ownRole() ?? 'preview',
      name: typeof window === 'undefined' ? '' : window.name,
      visible: this.visible(),
      fullscreen: this.ownFullscreen(),
      screen,
    };
  }

  /** Saludo con la prioridad y los datos actuales (al unirse o al cambiar algo). */
  private announce(): void {
    const priority = this.ownPriority();
    if (priority === null) return;
    this.post({ type: 'hello', id: this.instanceId, priority, info: this.info() });
  }

  private receive(message: Message): void {
    switch (message.type) {
      case 'hello': {
        // Si liderábamos hasta este saludo, el recién llegado hereda nuestro
        // estado aunque nos releve (por eso se mira ANTES de registrarlo).
        const wasLeader = this.isLeader();
        const known = this._peers().has(message.id);
        this.touchPeer(message.id, message.priority, message.info);
        const priority = this.ownPriority();
        if (priority !== null && !known) {
          this.announce();
          if (wasLeader && this.lastPublished) {
            this.post({ type: 'state', id: this.instanceId, priority, info: this.info(), state: this.lastPublished });
          }
        }
        break;
      }

      case 'bye':
        this._peers.update((current) => {
          const next = new Map(current);
          next.delete(message.id);
          return next;
        });
        break;

      case 'state': {
        this.touchPeer(message.id, message.priority, message.info);
        // Sólo se refleja el estado de quien manda de verdad: un par de menor
        // prioridad que aún no se ha enterado del relevo no debe arrastrarnos.
        // Excepción: acabamos de llegar y heredamos su diapositiva.
        const inherit = Date.now() - this.joinedAt < INHERIT_WINDOW_MS;
        if (this.outranksSelf(message.priority, message.id) || inherit) {
          this._remoteState.set(message.state);
          this.hooks?.onRemoteState(message.state, inherit);
          // Ya no mandamos: nuestro último estado publicado deja de valer
          // como herencia para futuros recién llegados.
          if (!inherit) this.lastPublished = null;
        }
        break;
      }

      case 'command':
        if (this.isLeader()) this.hooks?.onCommand(message.command);
        break;

      case 'who': {
        this.announce();
        const priority = this.ownPriority();
        if (priority !== null && this.isLeader() && this.lastPublished) {
          this.post({ type: 'state', id: this.instanceId, priority, info: this.info(), state: this.lastPublished });
        }
        break;
      }

      case 'identify':
        if (this.ownRole() === 'window') this._identifyAt.set(Date.now());
        break;
    }
  }

  /** ¿Ese par tiene más autoridad que esta instancia (o no proyectamos)? */
  private outranksSelf(priority: number, id: string): boolean {
    const own = this.ownPriority();
    if (own === null) return true;
    return priority > own || (priority === own && id > this.instanceId);
  }

  private touchPeer(id: string, priority: number, info: PeerInfo): void {
    if (id === this.instanceId) return;
    this._peers.update((current) => {
      const next = new Map(current);
      next.set(id, { ...info, id, priority, lastSeen: Date.now() });
      return next;
    });
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    const stale = [...this._peers()].filter(([, peer]) => now - peer.lastSeen > STALE_MS);
    if (stale.length === 0) return;
    this.zone.run(() =>
      this._peers.update((current) => {
        const next = new Map(current);
        for (const [id] of stale) next.delete(id);
        return next;
      }),
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeat) return;
    this.zone.runOutsideAngular(() => {
      this.heartbeat = setInterval(() => {
        const priority = this.ownPriority();
        if (priority === null) return;
        // El latido lleva el estado si somos líder; si no, basta con el saludo.
        if (this.isLeader() && this.lastPublished) {
          this.post({ type: 'state', id: this.instanceId, priority, info: this.info(), state: this.lastPublished });
        } else {
          this.announce();
        }
      }, HEARTBEAT_MS);
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private post(message: Message): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      /* canal cerrado durante el descarte de la página */
    }
  }
}

/**
 * Progreso (0-1) de una diapositiva según su estado, en este instante. Para
 * pintar texto (segundos) o arrancar la animación CSS de la barra en el punto
 * justo; nunca para animar por fotograma.
 */
export function elapsedMs(state: Pick<SyncState, 'paused' | 'startedAt' | 'elapsedAtPause'>, now = Date.now()): number {
  return state.paused ? state.elapsedAtPause : Math.max(0, now - state.startedAt);
}
