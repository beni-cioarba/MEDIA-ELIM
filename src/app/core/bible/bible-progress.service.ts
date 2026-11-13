import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { BibleReadingService } from '../services/bible-reading.service';
import { ClockService } from '../services/clock.service';
import { startOfDay, toIsoDate } from '../util/iso-date';

const STORAGE_KEY = 'elim.bible.read';

/**
 * Días leídos seguidos que terminan hoy (o ayer, si hoy aún no se ha marcado:
 * la racha no se rompe por la mañana). `due` son las fechas del plan hasta
 * hoy, en orden.
 */
export function planStreak(due: readonly string[], read: ReadonlySet<string>, todayIso: string): number {
  let i = due.length - 1;
  if (i >= 0 && due[i] === todayIso && !read.has(todayIso)) i--;
  let streak = 0;
  while (i >= 0 && read.has(due[i])) {
    streak++;
    i--;
  }
  return streak;
}

/** Cómo va quien lee el plan de la iglesia. */
export interface BibleProgress {
  /** Días del plan marcados como leídos. */
  readonly read: number;
  readonly total: number;
  /** Días del plan hasta hoy sin marcar. */
  readonly behind: number;
  readonly streak: number;
}

/**
 * **«Am citit»** del plan de lectura de la iglesia (Citirea Bibliei): qué días
 * ha marcado quien lee, en este dispositivo (`localStorage`, sin cuenta), como
 * en Proiectul Împreună. Por fecha (`YYYY-MM-DD`), no por número de día: el
 * plan va por semanas y puede cambiar de un año a otro.
 */
@Injectable({ providedIn: 'root' })
export class BibleProgressService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly bible = inject(BibleReadingService);
  private readonly clock = inject(ClockService);

  private readonly _read = signal<ReadonlySet<string>>(this.load());
  readonly read = this._read.asReadonly();

  private readonly todayIso = computed(() => toIsoDate(startOfDay(new Date(this.clock.now()))));

  readonly stats = computed<BibleProgress>(() => {
    const dates = this.bible.planDates();
    const read = this._read();
    const today = this.todayIso();
    const due = dates.filter((date) => date <= today);
    return {
      read: dates.filter((date) => read.has(date)).length,
      total: dates.length,
      behind: due.filter((date) => !read.has(date)).length,
      streak: planStreak(due, read, today),
    };
  });

  isRead(isoDate: string): boolean {
    return this._read().has(isoDate);
  }

  toggle(isoDate: string): void {
    const next = new Set(this._read());
    if (next.has(isoDate)) next.delete(isoDate);
    else next.add(isoDate);
    this.save(next);
  }

  private load(): ReadonlySet<string> {
    try {
      const raw = this.window?.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((d): d is string => /^\d{4}-\d{2}-\d{2}$/.test(String(d))) : []);
    } catch {
      return new Set();
    }
  }

  private save(read: ReadonlySet<string>): void {
    this._read.set(read);
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify([...read].sort()));
    } catch {
      // Sin almacenamiento (privado): vale para esta visita.
    }
  }
}
