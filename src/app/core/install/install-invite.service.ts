import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_PATHS } from '../navigation/app-paths';
import { PresentationService } from '../presentation.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { routeKey } from '../telemetry/telemetry';
import { TelemetryService } from '../telemetry/telemetry.service';
import {
  InviteContext,
  InviteKind,
  InviteMemory,
  dismissed,
  guided,
  inviteKind,
  never,
  newMemory,
  offersNever,
  parseMemory,
  shown,
  visited,
  waitMs,
} from './invite-policy';
import { InviteTopic, inviteTopic } from './invite-topic';

const STORAGE_KEY = 'iglesia-redes.install.invite';

/** Aquí no se interrumpe: quien llega por primera vez, quien dona, quien escribe o lee lo legal. */
const QUIET_PATHS: readonly string[] = [APP_PATHS.guests, APP_PATHS.donate, APP_PATHS.contact, APP_PATHS.legal].map(
  (path) => `/${path}`,
);

/** Cada cuánto se vuelve a mirar si ya se puede enseñar (estaba escribiendo, viendo un vídeo…). */
const RETRY_MS = 4_000;

/** Lo que la tarjeta pinta. */
export interface InviteCard {
  readonly kind: InviteKind;
  readonly topic: InviteTopic;
  /** Se ofrece «no me lo recuerdes más» en vez de «ahora no». */
  readonly final: boolean;
}

const SHOWN_EVENT: Readonly<Record<InviteKind, string>> = {
  welcome: 'instalare-invitatie-prima',
  reminder: 'instalare-invitatie-amintire',
  open: 'instalare-ai-deja-aplicatia',
};

function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Avisos de instalación dentro de la web (teléfono y tableta): **cuándo** salen,
 * cuál y qué se recuerda. Las reglas son puras (`invite-policy.ts`) y quién la
 * tiene lo dice el detector (`install-state.ts`); aquí se juntan con el mundo:
 * rutas, reloj, plataforma y `localStorage`.
 *
 * Lo carga sólo el trozo diferido de la invitación: no está en el arranque.
 */
@Injectable({ providedIn: 'root' })
export class InstallInviteService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly router = inject(Router);
  private readonly pwa = inject(PwaInstallService);
  private readonly presentation = inject(PresentationService);
  private readonly telemetry = inject(TelemetryService);

  /** Sin almacenamiento no se puede recordar un «ahora no»: no se invita. */
  private canRemember = true;
  private memory: InviteMemory = this.load();
  private timer: number | null = null;

  private readonly current = signal<InviteCard | null>(null);
  private readonly quiet = signal(this.isQuiet());
  private readonly closedCount = signal(0);

  /** Veces que se ha dicho «ahora no» en esta carga: la cabecera señala su icono. */
  readonly hint = this.closedCount.asReadonly();

  /** Teléfono o tableta donde tiene sentido decir algo. */
  private readonly eligible = computed(() => {
    const { device, platform } = this.pwa.env;
    if (device === 'desktop') return false;
    const state = this.pwa.state();
    // Dentro de ella o recién instalada: no hay nada que contar.
    if (state === 'app' || this.pwa.justInstalled()) return false;
    return state === 'installed' ? !platform.endsWith('-inapp') : this.pwa.available();
  });

  /** La tarjeta que se ve ahora. Una página tranquila o la presentación la esconden. */
  readonly card = computed(() => {
    const card = this.current();
    if (!card || this.quiet() || !this.eligible() || this.presentation.isFullscreen()) return null;
    // Si el detector cambia de opinión con la tarjeta abierta, ese mensaje ya no vale.
    return (card.kind === 'open') === (this.pwa.state() === 'installed') ? card : null;
  });

  constructor() {
    const win = this.window;
    if (!win) return;
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.quiet.set(this.isQuiet());
      this.schedule();
    });
    // Volver a la pestaña otro día es otra visita, aunque no se recargue.
    win.document.addEventListener('visibilitychange', () => {
      if (!win.document.hidden) this.schedule();
    });
    this.schedule();
  }

  /** «Ahora no», la cruz o `Esc`. */
  dismiss(): void {
    const kind = this.close();
    if (!kind) return;
    if (kind !== 'open') this.declined();
    this.telemetry.event('instalare-invitatie-inchisa');
  }

  /** «No me lo recuerdes más». */
  never(): void {
    if (!this.close()) return;
    this.save(never(this.memory, Date.now()));
    this.closedCount.update((n) => n + 1);
    this.telemetry.event('instalare-invitatie-oprita');
  }

  /** «Ya la tengo» (donde el navegador no lo dice). */
  alreadyHave(): void {
    this.close();
    this.pwa.confirmInstalled();
  }

  /** Se ha pulsado «Instalar»: la tarjeta cumplió; sigue el diálogo. */
  accept(): void {
    this.close();
    this.telemetry.event('instalare-invitatie-acceptata');
  }

  /** «Ahora no», o el diálogo del navegador cancelado. */
  declined(): void {
    this.save(dismissed(this.memory, Date.now()));
    this.closedCount.update((n) => n + 1);
  }

  /** Se abrieron los pasos: si al final no la instala, se le recuerda antes. */
  guided(): void {
    this.save(guided(this.memory, Date.now()));
  }

  private close(): InviteKind | null {
    const kind = this.current()?.kind ?? null;
    this.current.set(null);
    return kind;
  }

  private context(win: Window): InviteContext {
    const now = Date.now();
    return {
      now,
      today: isoDay(now),
      elapsedMs: win.performance.now(),
      installed: this.pwa.state() === 'installed',
    };
  }

  /** Una comprobación cuando se cumpla el tiempo; si hoy no toca, ninguna. */
  private schedule(): void {
    const win = this.window;
    if (!win || !this.canRemember || this.current()) return;
    const context = this.context(win);
    const memory = visited(this.memory, context.today);
    if (memory !== this.memory) this.save(memory);
    this.arm(win, waitMs(this.memory, context));
  }

  private arm(win: Window, wait: number | null): void {
    if (this.timer !== null) win.clearTimeout(this.timer);
    this.timer = wait === null ? null : win.setTimeout(() => this.check(win), wait);
  }

  private check(win: Window): void {
    this.timer = null;
    if (this.current()) return;
    const context = this.context(win);
    const kind = inviteKind(this.memory, context);
    // Hoy no toca, o aquí no se le dice nada: hasta la próxima página.
    if (!kind || !this.eligible() || this.quiet()) return;
    const wait = waitMs(this.memory, context) ?? 0;
    if (wait > 0) return this.arm(win, wait);
    if (this.presentation.isFullscreen() || this.isBusy(win.document)) return this.arm(win, RETRY_MS);

    const { path } = routeKey(this.router.routerState.snapshot.root);
    const ios = this.pwa.env.platform.startsWith('ios');
    this.current.set({ kind, topic: inviteTopic(path, this.memory.shown, ios), final: offersNever(this.memory) });
    this.save(shown(this.memory, kind, context));
    this.telemetry.event(SHOWN_EVENT[kind]);
  }

  /** Pestaña detrás, escribiendo, con un diálogo o el menú abiertos, o viendo un vídeo. */
  private isBusy(document: Document): boolean {
    if (document.hidden || document.fullscreenElement) return true;
    // Tocar el reproductor de YouTube deja el foco en su `iframe`.
    if (document.activeElement?.tagName === 'IFRAME') return true;
    const open = 'dialog[open], [aria-modal="true"], body.has-drawer-open, body.has-doc-panel';
    const typing = 'input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus';
    if (document.querySelector(`${open}, ${typing}`)) return true;
    return [...document.querySelectorAll<HTMLMediaElement>('video, audio')].some((m) => !m.paused && !m.muted);
  }

  private isQuiet(): boolean {
    const { path, tool } = routeKey(this.router.routerState.snapshot.root);
    return tool || QUIET_PATHS.some((quiet) => path === quiet || path.startsWith(`${quiet}/`));
  }

  private load(): InviteMemory {
    const today = isoDay(Date.now());
    try {
      const storage = this.window?.localStorage;
      const memory = visited(parseMemory(storage?.getItem(STORAGE_KEY) ?? null, today), today);
      storage?.setItem(STORAGE_KEY, JSON.stringify(memory));
      return memory;
    } catch {
      this.canRemember = false;
      return newMemory(today);
    }
  }

  private save(memory: InviteMemory): void {
    this.memory = memory;
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      this.canRemember = false;
    }
  }
}
