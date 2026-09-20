import { Injectable, computed, signal } from '@angular/core';
import type { PresentationBlockId } from './presentation-blocks.service';

/** Tamaño del código QR proyectado (columna del lienzo que ocupa). */
export type QrSize = 's' | 'm' | 'l';

export const QR_SIZES: readonly QrSize[] = ['s', 'm', 'l'];

/** Límites del tiempo por diapositiva que puede fijar el operador (segundos). */
export const DURATION_MIN_S = 5;
export const DURATION_MAX_S = 120;
export const DURATION_STEP_S = 5;

/**
 * Tiempo por defecto de cada diapositiva, por bloque (segundos).
 * Los anuncios se leen, no se miran: necesitan mucho más que una lista de
 * redes o un programa que la congregación ya conoce.
 */
const DEFAULT_DURATIONS_S: Readonly<Record<PresentationBlockId, number>> = {
  announcements: 30,
  socials: 12,
  streams: 12,
  gallery: 12,
  weekly: 12,
  upcoming: 15,
};

interface DisplayPrefs {
  readonly qrVisible: boolean;
  readonly qrSize: QrSize;
  /** Duraciones fijadas a mano (segundos). Ausente ⇒ valor por defecto. */
  readonly durations: Partial<Record<PresentationBlockId, number>>;
}

const STORAGE_KEY = 'iglesia-redes.presentation.display';

const DEFAULTS: DisplayPrefs = { qrVisible: true, qrSize: 'm', durations: {} };

/**
 * Preferencias de **pantalla y ritmo** de la proyección (no de contenido): si
 * se muestra el QR y a qué tamaño, y cuánto dura cada diapositiva de cada
 * bloque.
 *
 * Van aparte de `PresentationBlocksService` porque responden a otra pregunta:
 * aquél decide *qué* se proyecta; éste, *cómo se reparte el lienzo y el
 * tiempo*. Sin QR el contenido ocupa toda la anchura y los bloques se
 * recolocan (`.stage--no-qr`, ver `styles/_projection.scss`).
 *
 * El tamaño del QR se elige con la regla 1:10 (lado del QR ≈ distancia de
 * escaneo ÷ 10): en una pantalla de ~3 m, «M» (44 u) mide ~0,75 m y se
 * escanea desde ~7 m; «L» llega al fondo de un templo grande; «S» deja casi
 * todo el lienzo al contenido cuando el QR es secundario.
 *
 * Las duraciones vienen con un valor por defecto por bloque y el operador
 * puede ajustarlas desde el panel de controles; se recuerdan en
 * `localStorage`, como el resto de ajustes.
 */
@Injectable({ providedIn: 'root' })
export class PresentationDisplayService {
  private readonly prefs = signal<DisplayPrefs>(readStoredPrefs());

  readonly qrVisible = computed<boolean>(() => this.prefs().qrVisible);
  readonly qrSize = computed<QrSize>(() => this.prefs().qrSize);

  /** Duración efectiva por bloque (segundos), ya resuelta con los defectos. */
  readonly durations = computed<Readonly<Record<PresentationBlockId, number>>>(() => ({
    ...DEFAULT_DURATIONS_S,
    ...this.prefs().durations,
  }));

  /** `true` si el operador ha cambiado alguna duración. */
  readonly hasCustomDurations = computed<boolean>(
    () => Object.keys(this.prefs().durations).length > 0,
  );

  /** Segundos que dura cada diapositiva de este bloque. */
  durationFor(block: PresentationBlockId): number {
    return this.durations()[block];
  }

  isDefaultDuration(block: PresentationBlockId): boolean {
    return this.prefs().durations[block] === undefined;
  }

  /** Fija la duración (segundos) de un bloque, acotada a los límites. */
  setDuration(block: PresentationBlockId, seconds: number): void {
    const clamped = Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, Math.round(seconds)));
    this.update({ durations: { ...this.prefs().durations, [block]: clamped } });
  }

  /** Suma o resta un paso a la duración de un bloque. */
  stepDuration(block: PresentationBlockId, direction: 1 | -1): void {
    this.setDuration(block, this.durationFor(block) + direction * DURATION_STEP_S);
  }

  /** Devuelve un bloque a su duración por defecto. */
  resetDuration(block: PresentationBlockId): void {
    const durations = { ...this.prefs().durations };
    delete durations[block];
    this.update({ durations });
  }

  /** Devuelve todos los bloques a su duración por defecto. */
  resetDurations(): void {
    this.update({ durations: {} });
  }

  setQrVisible(visible: boolean): void {
    this.update({ qrVisible: visible });
  }

  toggleQr(): void {
    this.update({ qrVisible: !this.prefs().qrVisible });
  }

  setQrSize(size: QrSize): void {
    this.update({ qrSize: size });
  }

  private update(patch: Partial<DisplayPrefs>): void {
    this.prefs.update((current) => {
      const next = { ...current, ...patch };
      persistPrefs(next);
      return next;
    });
  }
}

function readStoredPrefs(): DisplayPrefs {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULTS;
    const { qrVisible, qrSize, durations } = parsed as Record<string, unknown>;
    return {
      qrVisible: typeof qrVisible === 'boolean' ? qrVisible : DEFAULTS.qrVisible,
      qrSize: isQrSize(qrSize) ? qrSize : DEFAULTS.qrSize,
      durations: readDurations(durations),
    };
  } catch {
    return DEFAULTS;
  }
}

/** Sólo acepta bloques conocidos y segundos dentro de los límites. */
function readDurations(value: unknown): Partial<Record<PresentationBlockId, number>> {
  if (!value || typeof value !== 'object') return {};
  const out: Partial<Record<PresentationBlockId, number>> = {};
  for (const [key, seconds] of Object.entries(value as Record<string, unknown>)) {
    if (!(key in DEFAULT_DURATIONS_S) || typeof seconds !== 'number') continue;
    if (seconds < DURATION_MIN_S || seconds > DURATION_MAX_S) continue;
    out[key as PresentationBlockId] = seconds;
  }
  return out;
}

function persistPrefs(prefs: DisplayPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}

function isQrSize(value: unknown): value is QrSize {
  return typeof value === 'string' && (QR_SIZES as readonly string[]).includes(value);
}
