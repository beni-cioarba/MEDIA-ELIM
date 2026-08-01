import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { CHURCH_CONFIG } from '../church.config';
import { ScheduleService } from './schedule.service';

/** Identificador estable de cada bloque proyectable del carrusel. */
export type PresentationBlockId = 'socials' | 'streams' | 'gallery' | 'weekly' | 'upcoming';

/** Preferencia manual del operador. `null` ⇒ decide la regla automática. */
export type PresentationBlockOverride = boolean | null;

/** Definición estática de un bloque (orden de proyección incluido). */
export interface PresentationBlockDef {
  readonly id: PresentationBlockId;
  /** Clave i18n del título mostrado en los dots y en el panel de ajustes. */
  readonly titleKey: string;
}

/** Estado resuelto de un bloque, listo para pintar en la UI de ajustes. */
export interface PresentationBlockState extends PresentationBlockDef {
  /** Resultado de la regla automática (¿hay contenido que mostrar?). */
  readonly autoAvailable: boolean;
  /** Preferencia manual guardada (o `null` si está en modo automático). */
  readonly override: PresentationBlockOverride;
  /** `true` cuando nadie ha tocado el interruptor: manda la regla automática. */
  readonly isAuto: boolean;
  /** Decisión final: ¿se proyecta este bloque? */
  readonly enabled: boolean;
}

const STORAGE_KEY = 'iglesia-redes.presentation.blocks';

/** Orden de proyección. Cambiarlo aquí cambia el orden del carrusel. */
const BLOCK_DEFS: readonly PresentationBlockDef[] = [
  { id: 'socials', titleKey: 'socials.section_title' },
  { id: 'streams', titleKey: 'streams.title' },
  { id: 'gallery', titleKey: 'gallery.title' },
  { id: 'weekly', titleKey: 'weekly.title' },
  { id: 'upcoming', titleKey: 'upcoming.title' },
];

/**
 * Controla **qué bloques se proyectan** cuando se pulsa "Presentar".
 *
 * Modelo de decisión por bloque (en este orden):
 *  1. Si el operador ha fijado el interruptor manualmente → manda su elección.
 *  2. Si no → manda la *regla automática*, que comprueba si el bloque tiene
 *     contenido real que mostrar.
 *
 * El caso principal es "Evenimente viitoare": cuando no queda ningún evento
 * futuro el bloque se descarta solo (para no proyectar una pantalla vacía),
 * pero el operador puede forzarlo a visible si de verdad lo necesita.
 *
 * Las preferencias manuales se guardan en `localStorage`, de modo que el
 * portátil de la iglesia recuerda su configuración entre sesiones.
 */
@Injectable({ providedIn: 'root' })
export class PresentationBlocksService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly schedule = inject(ScheduleService);

  /** Preferencias manuales persistidas (ausente ⇒ modo automático). */
  private readonly overrides = signal<Partial<Record<PresentationBlockId, boolean>>>(
    readStoredOverrides(),
  );

  readonly definitions = BLOCK_DEFS;

  /** Reglas automáticas: un bloque sólo se auto-proyecta si tiene contenido. */
  private readonly autoAvailability: Signal<Record<PresentationBlockId, boolean>> = computed(() => ({
    socials: this.config.socials.length > 0,
    streams: true,
    gallery: this.config.mediaEvents.length > 0,
    weekly: this.config.weeklyProgram.length > 0,
    upcoming: this.schedule.hasUpcomingEvents(),
  }));

  /** Estado resuelto de todos los bloques (para el panel de ajustes). */
  readonly states = computed<readonly PresentationBlockState[]>(() => {
    const auto = this.autoAvailability();
    const overrides = this.overrides();
    return BLOCK_DEFS.map((def) => {
      const override = overrides[def.id] ?? null;
      const autoAvailable = auto[def.id];
      return {
        ...def,
        autoAvailable,
        override,
        isAuto: override === null,
        enabled: override ?? autoAvailable,
      };
    });
  });

  /**
   * Bloques que se proyectan, en orden. Nunca devuelve una lista vacía:
   * si todo quedara desactivado se conserva el primer bloque para no dejar
   * la pantalla de la iglesia en negro.
   */
  readonly activeBlockIds = computed<readonly PresentationBlockId[]>(() => {
    const enabled = this.states()
      .filter((s) => s.enabled)
      .map((s) => s.id);
    return enabled.length > 0 ? enabled : [BLOCK_DEFS[0].id];
  });

  /** Número de bloques activos (útil para deshabilitar el último toggle). */
  readonly activeCount = computed<number>(() => this.states().filter((s) => s.enabled).length);

  /** Estado de los bloques proyectables, en orden (para los dots del carrusel). */
  readonly activeStates = computed<readonly PresentationBlockState[]>(() => {
    const byId = new Map(this.states().map((s) => [s.id, s] as const));
    return this.activeBlockIds()
      .map((id) => byId.get(id))
      .filter((s): s is PresentationBlockState => !!s);
  });

  /** Todos los identificadores, en orden de proyección. */
  readonly allBlockIds: readonly PresentationBlockId[] = BLOCK_DEFS.map((d) => d.id);

  /** `true` si alguna preferencia manual difiere del automático. */
  readonly hasManualOverrides = computed<boolean>(() =>
    this.states().some((s) => !s.isAuto),
  );

  /** Fija manualmente si un bloque se proyecta o no. */
  setEnabled(id: PresentationBlockId, enabled: boolean): void {
    this.overrides.update((current) => {
      const next = { ...current, [id]: enabled };
      persistOverrides(next);
      return next;
    });
  }

  /** Alterna el estado actual del bloque (pasa a modo manual). */
  toggle(id: PresentationBlockId): void {
    const state = this.states().find((s) => s.id === id);
    if (!state) return;
    this.setEnabled(id, !state.enabled);
  }

  /** Devuelve un bloque al modo automático. */
  resetToAuto(id: PresentationBlockId): void {
    this.overrides.update((current) => {
      const next = { ...current };
      delete next[id];
      persistOverrides(next);
      return next;
    });
  }

  /** Devuelve todos los bloques al modo automático. */
  resetAll(): void {
    persistOverrides({});
    this.overrides.set({});
  }
}

function readStoredOverrides(): Partial<Record<PresentationBlockId, boolean>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const valid = new Set<string>(BLOCK_DEFS.map((d) => d.id));
    const out: Partial<Record<PresentationBlockId, boolean>> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (valid.has(key) && typeof value === 'boolean') {
        out[key as PresentationBlockId] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function persistOverrides(overrides: Partial<Record<PresentationBlockId, boolean>>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}
