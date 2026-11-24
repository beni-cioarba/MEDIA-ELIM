import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_PATHS } from '../navigation/app-paths';
import { PresentationService } from '../presentation.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { routeKey } from '../telemetry/telemetry';
import { TelemetryService } from '../telemetry/telemetry.service';
import { InviteMemory, dismissed, newMemory, parseMemory, shouldInvite, shown, waitMs } from './invite-policy';

const STORAGE_KEY = 'iglesia-redes.install.invite';

/** Aquí no se interrumpe: quien llega por primera vez, quien dona, quien escribe o lee lo legal. */
const QUIET_PATHS: readonly string[] = [APP_PATHS.guests, APP_PATHS.donate, APP_PATHS.contact, APP_PATHS.legal].map(
  (path) => `/${path}`,
);

/** Pantallas bajadas antes de invitar: la portada (hero) no se tapa nunca. */
const MIN_SCROLL_SCREENS = 0.6;

function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Invitación a instalar dentro de la web (teléfono y tableta): **cuándo** se
 * enseña y qué se recuerda. Las reglas son puras (`invite-policy.ts`); aquí se
 * juntan con el mundo: rutas, scroll, plataforma y `localStorage`.
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

  private memory: InviteMemory = this.load();
  private pages = 1;
  private timer: number | null = null;
  /** Cumplido todo menos bajar de la portada: espera al scroll. */
  private waitingScroll = false;

  private readonly open = signal(false);
  private readonly quiet = signal(this.isQuiet());

  /** Teléfono o tableta donde se puede instalar (dentro de otra app, no se puede). */
  private readonly eligible = computed(() => {
    const { device, platform } = this.pwa.env;
    return this.pwa.available() && device !== 'desktop' && !platform.endsWith('-inapp');
  });

  /** Se ve ahora. Una página tranquila o la presentación la esconden. */
  readonly visible = computed(
    () => this.open() && !this.quiet() && this.eligible() && !this.presentation.isFullscreen(),
  );

  constructor() {
    if (!this.window) return;
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.pages++;
      this.quiet.set(this.isQuiet());
      this.schedule();
    });
    this.schedule();
  }

  /** «Ahora no», la cruz o `Esc`. */
  dismiss(): void {
    this.open.set(false);
    this.save(dismissed(this.memory, Date.now()));
    this.telemetry.event('instalare-invitatie-inchisa');
  }

  /** Se ha pulsado «Instalar»: la tarjeta cumplió; sigue el diálogo. */
  accept(): void {
    this.open.set(false);
  }

  /** El diálogo del navegador se canceló: es un «ahora no». */
  declined(): void {
    this.save(dismissed(this.memory, Date.now()));
  }

  /** Una comprobación cuando se cumpla el tiempo; nada de sondeos. */
  private schedule(): void {
    const win = this.window;
    if (!win || this.open() || this.waitingScroll) return;
    if (this.timer !== null) win.clearTimeout(this.timer);
    const wait = waitMs(this.memory, { today: isoDay(Date.now()), elapsedMs: win.performance.now() });
    this.timer = win.setTimeout(() => this.check(), wait);
  }

  private check(): void {
    const win = this.window;
    if (!win || this.open() || this.waitingScroll) return;
    const now = Date.now();
    const context = { now, today: isoDay(now), pages: this.pages, elapsedMs: win.performance.now() };
    if (!this.eligible() || !shouldInvite(this.memory, context) || this.tryShow()) return;
    this.waitingScroll = true;
    const onScroll = (): void => {
      if (!this.tryShow()) return;
      this.waitingScroll = false;
      win.removeEventListener('scroll', onScroll);
    };
    win.addEventListener('scroll', onScroll, { passive: true });
  }

  private tryShow(): boolean {
    const win = this.window;
    if (!win || win.scrollY < win.innerHeight * MIN_SCROLL_SCREENS) return false;
    if (!this.eligible() || this.quiet() || this.presentation.isFullscreen() || this.isBusy()) return false;
    const now = Date.now();
    this.open.set(true);
    this.save(shown(this.memory, { now, today: isoDay(now) }));
    this.telemetry.event('instalare-invitatie');
    return true;
  }

  /** Escribiendo, con un diálogo o el menú abiertos, o con el botón del pie ya a la vista. */
  private isBusy(): boolean {
    const win = this.window;
    if (!win) return true;
    if (win.document.querySelector('dialog[open], body.has-drawer-open, input:focus, textarea:focus')) return true;
    const footer = win.document.querySelector('app-footer');
    return !!footer && footer.getBoundingClientRect().top < win.innerHeight;
  }

  private isQuiet(): boolean {
    const { path, tool } = routeKey(this.router.routerState.snapshot.root);
    return tool || QUIET_PATHS.some((quiet) => path === quiet || path.startsWith(`${quiet}/`));
  }

  private load(): InviteMemory {
    const today = isoDay(Date.now());
    try {
      const raw = this.window?.localStorage.getItem(STORAGE_KEY) ?? null;
      const memory = parseMemory(raw, today);
      if (raw === null) this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
      return memory;
    } catch {
      return newMemory(today);
    }
  }

  private save(memory: InviteMemory): void {
    this.memory = memory;
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      /* almacenamiento bloqueado: basta con esta carga */
    }
  }
}
