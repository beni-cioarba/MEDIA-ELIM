/**
 * **Cuándo** se avisa de que se puede instalar. Puro: ni reloj ni almacenamiento.
 *
 *  · **Bienvenida**: la primera vez que se entra, a los 8 s. Una sola vez.
 *  · **Recordatorios**: sólo a quien ha vuelto **otros días** y sigue sin
 *    instalarla. Cada vez más espaciados, según lo que hizo la última vez:
 *    la dejó pasar, la cerró, o miró los pasos.
 *  · Como mucho uno al día. «No me lo recuerdes más» descansa un año.
 *  · **«Ya la tienes»**: a quien la tiene y entra por el navegador, muy de
 *    tarde en tarde.
 */
export interface InviteMemory {
  /** Primer día que se vio la web en este dispositivo (`YYYY-MM-DD`). */
  readonly since: string;
  /** Último día de visita, y cuántos días distintos se ha entrado. */
  readonly lastVisit: string;
  readonly visits: number;
  /** Avisos enseñados (bienvenida incluida) y último día. */
  readonly shown: number;
  readonly shownOn: string | null;
  /** `visits` cuando se enseñó el último: para contar los días que ha vuelto. */
  readonly shownAtVisit: number;
  readonly dismissals: number;
  /** No antes de este instante (ms). */
  readonly snoozedUntil: number;
  /** Días que hay que volver antes del siguiente. */
  readonly visitsNeeded: number;
  /** Último «ya la tienes» (ms). */
  readonly tipAt: number;
}

/** Qué aviso toca. */
export type InviteKind = 'welcome' | 'reminder' | 'open';

export interface InviteContext {
  readonly now: number;
  readonly today: string;
  /** Milisegundos desde que se abrió la web. */
  readonly elapsedMs: number;
  /** El detector dice que la tiene (y no está dentro de ella). */
  readonly installed: boolean;
}

const DAY_MS = 86_400_000;
/** Tiempo en la web antes de cada aviso. */
export const DELAY_MS: Readonly<Record<InviteKind, number>> = { welcome: 8_000, reminder: 12_000, open: 12_000 };
/** Días de descanso si se deja pasar sin tocarla (por nº de avisos enseñados). */
export const REST_SEEN = [3, 7, 14, 30, 60] as const;
/** Días de descanso tras «ahora no» (por nº de rechazos). */
export const REST_DISMISSED = [14, 30, 60, 90] as const;
/** Tras abrir los pasos: puede haberla instalado sin que el navegador lo diga. */
export const REST_GUIDED = 7;
export const REST_NEVER = 365;
export const REST_TIP = 60;
/** Rechazos a partir de los cuales se ofrece «no me lo recuerdes más». */
const NEVER_AFTER = 2;

const at = (list: readonly number[], index: number): number => list[Math.min(index, list.length - 1)];

export function newMemory(today: string): InviteMemory {
  return {
    since: today,
    lastVisit: today,
    visits: 1,
    shown: 0,
    shownOn: null,
    shownAtVisit: 0,
    dismissals: 0,
    snoozedUntil: 0,
    visitsNeeded: 0,
    tipAt: 0,
  };
}

/** Lo guardado, si tiene sentido (también el formato anterior); si no, como si fuera la primera vez. */
export function parseMemory(raw: string | null, today: string): InviteMemory {
  const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);
  try {
    const value = JSON.parse(raw ?? '') as Partial<InviteMemory> | null;
    if (!value || typeof value.since !== 'string') return newMemory(today);
    const shownOn = typeof value.shownOn === 'string' ? value.shownOn : null;
    return {
      since: value.since,
      lastVisit: typeof value.lastVisit === 'string' ? value.lastVisit : value.since,
      visits: count(value.visits) || 1,
      // El formato anterior no contaba: si se enseñó, la bienvenida ya fue.
      shown: count(value.shown) || (shownOn ? 1 : 0),
      shownOn,
      shownAtVisit: count(value.shownAtVisit),
      dismissals: count(value.dismissals),
      snoozedUntil: count(value.snoozedUntil),
      visitsNeeded: count(value.visitsNeeded),
      tipAt: count(value.tipAt),
    };
  } catch {
    return newMemory(today);
  }
}

/** Una visita por día. Devuelve la misma memoria si el día ya estaba contado. */
export function visited(memory: InviteMemory, today: string): InviteMemory {
  return memory.lastVisit === today ? memory : { ...memory, lastVisit: today, visits: memory.visits + 1 };
}

/** El aviso que toca por calendario, sin mirar los segundos. */
export function inviteKind(
  memory: InviteMemory,
  { now, today, installed }: Omit<InviteContext, 'elapsedMs'>,
): InviteKind | null {
  if (memory.shownOn === today) return null;
  if (installed) {
    // Nunca el primer día: quien la acaba de instalar ya lo sabe.
    return memory.visits > 1 && now - memory.tipAt >= REST_TIP * DAY_MS ? 'open' : null;
  }
  if (now < memory.snoozedUntil) return null;
  if (memory.shown === 0) return 'welcome';
  return memory.visits - memory.shownAtVisit >= memory.visitsNeeded ? 'reminder' : null;
}

/** Lo que falta para poder enseñarlo; `null` si hoy no toca. */
export function waitMs(memory: InviteMemory, context: InviteContext): number | null {
  const kind = inviteKind(memory, context);
  return kind && Math.max(0, DELAY_MS[kind] - context.elapsedMs);
}

/** Se ha enseñado. El descanso es el de «lo dejó pasar» hasta que conteste. */
export function shown(
  memory: InviteMemory,
  kind: InviteKind,
  { now, today }: Pick<InviteContext, 'now' | 'today'>,
): InviteMemory {
  if (kind === 'open') return { ...memory, shownOn: today, tipAt: now };
  return {
    ...memory,
    shown: memory.shown + 1,
    shownOn: today,
    shownAtVisit: memory.visits,
    visitsNeeded: 1,
    snoozedUntil: now + at(REST_SEEN, memory.shown) * DAY_MS,
  };
}

/** «Ahora no» (o el diálogo del navegador cancelado). */
export function dismissed(memory: InviteMemory, now: number): InviteMemory {
  return {
    ...memory,
    dismissals: memory.dismissals + 1,
    visitsNeeded: 2,
    snoozedUntil: now + at(REST_DISMISSED, memory.dismissals) * DAY_MS,
  };
}

/** Abrió los pasos. */
export function guided(memory: InviteMemory, now: number): InviteMemory {
  return { ...memory, visitsNeeded: 1, snoozedUntil: now + REST_GUIDED * DAY_MS };
}

/** «No me lo recuerdes más»: un año. */
export function never(memory: InviteMemory, now: number): InviteMemory {
  return { ...memory, dismissals: memory.dismissals + 1, snoozedUntil: now + REST_NEVER * DAY_MS };
}

/** ¿Se ofrece ya «no me lo recuerdes más» en vez de «ahora no»? */
export function offersNever(memory: InviteMemory): boolean {
  return memory.dismissals >= NEVER_AFTER;
}
