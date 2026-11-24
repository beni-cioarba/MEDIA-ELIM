/**
 * **Cuándo** se invita a instalar. Puro: ni reloj ni almacenamiento.
 *
 * Reglas (una invitación es una interrupción; tiene que ganarse el sitio):
 *  · Sólo a quien ya usa la web: vuelve otro día, o lleva un rato y varias
 *    páginas. Nunca en la primera pantalla de la primera visita.
 *  · Como mucho una vez al día.
 *  · «Ahora no» se respeta: 30 días; la segunda vez, 90; después, un año.
 *  · Verla varias veces sin tocarla es también un «ahora no».
 */
export interface InviteMemory {
  /** Primer día que se vio la web en este dispositivo (`YYYY-MM-DD`). */
  readonly since: string;
  /** Último día que se enseñó. */
  readonly shownOn: string | null;
  /** Veces que se ha enseñado desde la última respuesta. */
  readonly ignored: number;
  readonly dismissals: number;
  /** No antes de este instante (ms). */
  readonly snoozedUntil: number;
}

export interface InviteContext {
  readonly now: number;
  readonly today: string;
  /** Páginas vistas en esta carga. */
  readonly pages: number;
  /** Milisegundos desde que se abrió la web. */
  readonly elapsedMs: number;
}

const DAY_MS = 86_400_000;
const SNOOZE_DAYS = [30, 90, 365] as const;
/** Enseñada tantas veces sin respuesta, cuenta como rechazo. */
export const MAX_IGNORED = 4;
/** Quien vuelve otro día. */
export const RETURNING = { pages: 1, elapsedMs: 12_000 } as const;
/** Quien llega por primera vez. */
export const FIRST_VISIT = { pages: 3, elapsedMs: 45_000 } as const;

export function newMemory(today: string): InviteMemory {
  return { since: today, shownOn: null, ignored: 0, dismissals: 0, snoozedUntil: 0 };
}

/** Lo guardado, si tiene sentido; si no, como si fuera la primera vez. */
export function parseMemory(raw: string | null, today: string): InviteMemory {
  const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);
  try {
    const value = JSON.parse(raw ?? '') as Partial<InviteMemory> | null;
    if (!value || typeof value.since !== 'string') return newMemory(today);
    return {
      since: value.since,
      shownOn: typeof value.shownOn === 'string' ? value.shownOn : null,
      ignored: count(value.ignored),
      dismissals: count(value.dismissals),
      snoozedUntil: count(value.snoozedUntil),
    };
  } catch {
    return newMemory(today);
  }
}

/** Lo que se le pide a quien mira: menos a quien ya había venido otro día. */
function engagement(memory: InviteMemory, today: string): { pages: number; elapsedMs: number } {
  return memory.since < today ? RETURNING : FIRST_VISIT;
}

export function shouldInvite(memory: InviteMemory, context: InviteContext): boolean {
  if (context.now < memory.snoozedUntil || memory.shownOn === context.today) return false;
  const needs = engagement(memory, context.today);
  return context.pages >= needs.pages && context.elapsedMs >= needs.elapsedMs;
}

/** Lo que falta para cumplir el tiempo (para programar una sola comprobación). */
export function waitMs(memory: InviteMemory, { today, elapsedMs }: Pick<InviteContext, 'today' | 'elapsedMs'>): number {
  return Math.max(0, engagement(memory, today).elapsedMs - elapsedMs);
}

/** Se ha enseñado. A la cuarta sin respuesta, descansa como si se cerrara. */
export function shown(memory: InviteMemory, { now, today }: Pick<InviteContext, 'now' | 'today'>): InviteMemory {
  const next = { ...memory, shownOn: today, ignored: memory.ignored + 1 };
  return next.ignored >= MAX_IGNORED ? dismissed(next, now) : next;
}

/** «Ahora no» (o el diálogo del navegador cancelado). */
export function dismissed(memory: InviteMemory, now: number): InviteMemory {
  const days = SNOOZE_DAYS[Math.min(memory.dismissals, SNOOZE_DAYS.length - 1)];
  return { ...memory, ignored: 0, dismissals: memory.dismissals + 1, snoozedUntil: now + days * DAY_MS };
}
