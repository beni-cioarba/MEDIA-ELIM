import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import type { ProjectionRole } from '../presentation.service';

/**
 * Prioridad de cada papel a la hora de llevar el reloj de la presentación.
 * Gana la más alta entre las instancias vivas: la ventana del templo manda
 * sobre la pestaña en pantalla completa, y ésta sobre la vista previa.
 */
export const ROLE_PRIORITY: Readonly<Record<ProjectionRole, number>> = {
  window: 20,
  inline: 10,
  preview: 1,
};

/** Estado que el líder publica y los demás reflejan. */
export interface SyncState {
  readonly index: number;
  readonly paused: boolean;
  /** Instante (epoch ms) en que arrancó la diapositiva actual. */
  readonly startedAt: number;
  readonly durationMs: number;
  readonly count: number;
  readonly slideKey: string | null;
  /** El líder ocupa la pantalla completa nativa del navegador (sólo informativo, para el panel). */
  readonly fullscreen: boolean;
}

/** Órdenes que cualquier ventana puede enviar; sólo el líder las ejecuta. */
export type SyncCommand =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'goto'; readonly index: number }
  | { readonly type: 'pause' }
  | { readonly type: 'play' }
  | { readonly type: 'toggle' };

type Message =
  | { readonly type: 'hello'; readonly id: string; readonly priority: number }
  | { readonly type: 'bye'; readonly id: string }
  | { readonly type: 'state'; readonly id: string; readonly priority: number; readonly state: SyncState }
  | { readonly type: 'command'; readonly command: SyncCommand };

interface Peer {
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
const STALE_MS = 6_000;
/** Cadencia con la que los seguidores refrescan su barra de progreso. */
const FOLLOWER_TICK_MS = 100;
/**
 * Ventana tras unirse en la que el recién llegado escucha antes de mandar:
 * hereda la diapositiva del líder anterior en vez de arrancar en la primera.
 */
const INHERIT_WINDOW_MS = 400;

/**
 * Sincroniza la presentación entre ventanas de la **misma máquina**
 * (`BroadcastChannel`): panel de control, ventana de proyección y vista
 * previa hablan por aquí.
 *
 * ── Un solo reloj ─────────────────────────────────────────────────────
 * Cada instancia que proyecta se «une» con la prioridad de su papel. La de
 * mayor prioridad viva es el **líder**: la única que avanza el carrusel.
 * Publica su estado cuando cambia y como latido cada 2 s; los demás lo
 * reflejan (misma diapositiva, misma pausa) y calculan el progreso a partir
 * de `startedAt`, sin que nadie tenga que retransmitir 60 mensajes por
 * segundo. Si el líder desaparece (se cierra la ventana), la siguiente
 * instancia toma el relevo en el siguiente latido; si aparece uno mejor
 * (se abre la ventana), hereda el estado del anterior antes de mandar.
 *
 * ── Órdenes ───────────────────────────────────────────────────────────
 * El panel de control no proyecta: envía órdenes (`next`, `pause`, `goto`…)
 * y el líder las ejecuta. Así el panel puede cerrarse sin que la proyección
 * se detenga.
 *
 * Los **ajustes** (bloques, duraciones, QR) no viajan por aquí: viven en
 * `localStorage` y cada servicio escucha el evento `storage`.
 */
@Injectable({ providedIn: 'root' })
export class PresentationSyncService {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

  /** Identidad estable de esta instancia (ventana/iframe/pestaña). */
  readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  private readonly ownPriority = signal<number | null>(null);
  private readonly peers = signal<ReadonlyMap<string, Peer>>(new Map());
  private readonly _remoteState = signal<SyncState | null>(null);
  private readonly _remoteProgress = signal<number>(0);

  private hooks: SyncStageHooks | null = null;
  private lastPublished: SyncState | null = null;
  private joinedAt = 0;
  /** `false` durante la ventana de herencia: aún no publicamos nuestro estado. */
  private readonly settled = signal<boolean>(true);
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private followerTicker: ReturnType<typeof setInterval> | null = null;

  /** Último estado recibido del líder (para el panel y los seguidores). */
  readonly remoteState = this._remoteState.asReadonly();

  /** Progreso 0-100 de la diapositiva del líder, calculado en local. */
  readonly remoteProgress = this._remoteProgress.asReadonly();

  /** ¿Esta instancia proyecta (se ha unido con un papel)? */
  readonly isJoined = computed(() => this.ownPriority() !== null);

  /** Esta instancia lleva el reloj: ningún par vivo la supera. */
  readonly isLeader = computed<boolean>(() => {
    const own = this.ownPriority();
    if (own === null) return false;
    for (const [id, peer] of this.peers()) {
      if (peer.priority > own) return false;
      if (peer.priority === own && id > this.instanceId) return false;
    }
    return true;
  });

  /** Hay una **ventana de proyección** abierta en esta máquina (propia o ajena). */
  readonly hasProjectionWindow = computed<boolean>(() => {
    if (this.ownPriority() === ROLE_PRIORITY.window) return true;
    for (const peer of this.peers().values()) {
      if (peer.priority === ROLE_PRIORITY.window) return true;
    }
    return false;
  });

  /** Hay alguien proyectando (líder propio o ajeno). */
  readonly hasLeader = computed<boolean>(() => this.isLeader() || this.peers().size > 0);

  constructor() {
    if (!this.channel) return;
    this.channel.addEventListener('message', (event: MessageEvent<Message>) =>
      this.zone.run(() => this.receive(event.data)),
    );
    // Pestaña o ventana que se cierra: avisar para que el relevo sea inmediato.
    const onPageHide = () => this.leave();
    window.addEventListener('pagehide', onPageHide);

    this.zone.runOutsideAngular(() => {
      const prune = setInterval(() => this.pruneStalePeers(), HEARTBEAT_MS);
      this.destroyRef.onDestroy(() => clearInterval(prune));
    });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('pagehide', onPageHide);
      this.leave();
      this.channel?.close();
    });
  }

  /** El carrusel se registra para ejecutar órdenes y reflejar el estado ajeno. */
  registerStage(hooks: SyncStageHooks): void {
    this.hooks = hooks;
  }

  /** Entra en la elección de líder con la prioridad de su papel. */
  join(role: ProjectionRole): void {
    const priority = ROLE_PRIORITY[role];
    this.ownPriority.set(priority);
    this.joinedAt = Date.now();
    this.settled.set(false);
    this.zone.runOutsideAngular(() =>
      setTimeout(() => this.zone.run(() => this.settled.set(true)), INHERIT_WINDOW_MS),
    );
    this.post({ type: 'hello', id: this.instanceId, priority });
    this.startHeartbeat();
  }

  /** Sale de la elección (deja de proyectar). */
  leave(): void {
    if (this.ownPriority() === null) return;
    this.post({ type: 'bye', id: this.instanceId });
    this.ownPriority.set(null);
    this.stopHeartbeat();
  }

  /** Publica el estado del carrusel (sólo tiene efecto si esta instancia es líder). */
  publishState(state: SyncState): void {
    if (!this.isLeader() || !this.settled()) return;
    this.lastPublished = state;
    const priority = this.ownPriority();
    if (priority === null) return;
    this.post({ type: 'state', id: this.instanceId, priority, state });
  }

  /** Envía una orden al líder (quien sea). Si esta instancia lo es, la ejecuta. */
  sendCommand(command: SyncCommand): void {
    if (this.isLeader()) {
      this.hooks?.onCommand(command);
      return;
    }
    this.post({ type: 'command', command });
  }

  // -------------------------------------------------------------------

  private receive(message: Message): void {
    switch (message.type) {
      case 'hello': {
        // Si liderábamos hasta este saludo, el recién llegado hereda nuestro
        // estado aunque nos releve (por eso se mira ANTES de registrarlo).
        const wasLeader = this.isLeader();
        this.touchPeer(message.id, message.priority);
        const priority = this.ownPriority();
        if (priority !== null) {
          this.post({ type: 'hello', id: this.instanceId, priority });
          if (wasLeader && this.lastPublished) {
            this.post({ type: 'state', id: this.instanceId, priority, state: this.lastPublished });
          }
        }
        break;
      }

      case 'bye':
        this.peers.update((current) => {
          const next = new Map(current);
          next.delete(message.id);
          return next;
        });
        break;

      case 'state':
        this.touchPeer(message.id, message.priority);
        // Sólo se refleja el estado de quien manda de verdad: un par de menor
        // prioridad que aún no se ha enterado del relevo no debe arrastrarnos.
        // Excepción: acabamos de llegar y heredamos su diapositiva.
        {
          const inherit = Date.now() - this.joinedAt < INHERIT_WINDOW_MS;
          if (this.outranksSelf(message.priority, message.id) || inherit) {
            this._remoteState.set(message.state);
            this.hooks?.onRemoteState(message.state, inherit);
            this.ensureFollowerTicker();
            // Ya no mandamos: nuestro último estado publicado deja de valer
            // como herencia para futuros recién llegados.
            if (!inherit) this.lastPublished = null;
          }
        }
        break;

      case 'command':
        if (this.isLeader()) this.hooks?.onCommand(message.command);
        break;
    }
  }

  /** ¿Ese par tiene más autoridad que esta instancia (o no proyectamos)? */
  private outranksSelf(priority: number, id: string): boolean {
    const own = this.ownPriority();
    if (own === null) return true;
    return priority > own || (priority === own && id > this.instanceId);
  }

  private touchPeer(id: string, priority: number): void {
    if (id === this.instanceId) return;
    this.peers.update((current) => {
      const next = new Map(current);
      next.set(id, { priority, lastSeen: Date.now() });
      return next;
    });
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    const stale = [...this.peers()].filter(([, peer]) => now - peer.lastSeen > STALE_MS);
    if (stale.length === 0) return;
    this.zone.run(() =>
      this.peers.update((current) => {
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
          this.post({ type: 'state', id: this.instanceId, priority, state: this.lastPublished });
        } else {
          this.post({ type: 'hello', id: this.instanceId, priority });
        }
      }, HEARTBEAT_MS);
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  /**
   * Los seguidores (y el panel) recalculan el progreso del líder en local a
   * partir de `startedAt`: diez veces por segundo basta para una barra.
   */
  private ensureFollowerTicker(): void {
    if (this.followerTicker) return;
    this.zone.runOutsideAngular(() => {
      this.followerTicker = setInterval(() => {
        const state = this._remoteState();
        if (!state) return;
        const progress =
          state.paused || state.durationMs <= 0
            ? 0
            : Math.min(100, ((Date.now() - state.startedAt) / state.durationMs) * 100);
        if (Math.abs(progress - this._remoteProgress()) < 0.5 && progress !== 0) return;
        this.zone.run(() => this._remoteProgress.set(progress));
      }, FOLLOWER_TICK_MS);
      this.destroyRef.onDestroy(() => {
        if (this.followerTicker) clearInterval(this.followerTicker);
      });
    });
  }

  private post(message: Message): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      /* canal cerrado durante el descarte de la página */
    }
  }
}
