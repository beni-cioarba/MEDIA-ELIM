import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Announcement, CHURCH_CONFIG } from '../church.config';
import { AnnouncementsService } from './announcements.service';
import { BibleReadingService } from './bible-reading.service';
import { ScheduleService, UpcomingEventView } from './schedule.service';

/** Identificador estable de cada bloque proyectable del carrusel. */
export type PresentationBlockId =
  | 'announcements'
  | 'socials'
  | 'streams'
  | 'gallery'
  | 'weekly'
  | 'upcoming'
  | 'bible';

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

/** Posición de una diapositiva dentro de un bloque paginado. */
export interface SlidePage {
  readonly index: number;
  readonly total: number;
}

/**
 * Una **diapositiva** del carrusel. Casi siempre coincide con un bloque, pero
 * algunos bloques se expanden en varias:
 *  - `announcements` → una diapositiva por anuncio vigente (y visible).
 *  - `upcoming`      → páginas de `UPCOMING_PER_SLIDE` eventos, para que
 *                      ninguno se corte y cada página tenga su tiempo.
 */
export interface PresentationSlide {
  /** Clave estable: el id del bloque, `announcements:<id>` o `upcoming:<n>`. */
  readonly key: string;
  readonly block: PresentationBlockId;
  /** Clave i18n del bloque (rótulo de los dots cuando no hay anuncio). */
  readonly titleKey: string;
  /** Sólo en las diapositivas de anuncio. */
  readonly announcement?: Announcement;
  /** Sólo en las páginas de eventos: los eventos de esta página. */
  readonly events?: readonly UpcomingEventView[];
  /** Sólo en bloques paginados. */
  readonly page?: SlidePage;
}

/** Quién va a pintar las diapositivas que devuelve `expand()`. */
export type ExpandView = 'projection' | 'panel' | 'web';

/** Estado de un anuncio en el panel de ajustes: vigente y ¿se proyecta? */
export interface AnnouncementSlideState {
  readonly announcement: Announcement;
  readonly visible: boolean;
}

/**
 * Eventos por diapositiva: dos caben grandes y legibles con la escala de cartel
 * (descripción recortada a dos líneas en proyección; el detalle está en la web).
 */
export const UPCOMING_PER_SLIDE = 2;

const STORAGE_KEY = 'iglesia-redes.presentation.blocks';
const HIDDEN_ANNOUNCEMENTS_KEY = 'iglesia-redes.presentation.announcements.hidden';
const ORDER_KEY = 'iglesia-redes.presentation.order';

/**
 * Orden de proyección. Cambiarlo aquí cambia el orden del carrusel.
 * Los anuncios y la lectura bíblica de la semana van primero: son lo que la
 * congregación necesita leer antes de que empiece el programa.
 */
const BLOCK_DEFS: readonly PresentationBlockDef[] = [
  { id: 'announcements', titleKey: 'announcements.title' },
  { id: 'bible', titleKey: 'bible.title' },
  { id: 'socials', titleKey: 'socials.section_title' },
  { id: 'streams', titleKey: 'streams.title' },
  { id: 'gallery', titleKey: 'gallery.title' },
  { id: 'weekly', titleKey: 'weekly.title' },
  { id: 'upcoming', titleKey: 'upcoming.title' },
];

/**
 * Controla **qué se proyecta** cuando se pulsa "Presentar".
 *
 * Modelo de decisión por bloque (en este orden):
 *  1. Si el operador ha fijado el interruptor manualmente → manda su elección.
 *  2. Si no → manda la *regla automática*, que comprueba si el bloque tiene
 *     contenido real que mostrar.
 *
 * Los casos principales son «Anunțuri» y «Evenimente viitoare»: cuando no
 * queda ningún anuncio vigente o ningún evento futuro, el bloque se descarta
 * solo (para no proyectar una pantalla vacía), pero el operador puede forzarlo
 * a visible si de verdad lo necesita.
 *
 * Dentro del bloque de anuncios, además, cada anuncio vigente tiene su propio
 * interruptor: un aviso que hoy no toca leer se oculta sin retirarlo de la
 * web ni tocar su fecha de caducidad.
 *
 * Las preferencias manuales se guardan en `localStorage`, de modo que el
 * portátil de la iglesia recuerda su configuración entre sesiones.
 */
@Injectable({ providedIn: 'root' })
export class PresentationBlocksService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly schedule = inject(ScheduleService);
  private readonly announcements = inject(AnnouncementsService);
  private readonly bible = inject(BibleReadingService);

  /** Preferencias manuales persistidas (ausente ⇒ modo automático). */
  private readonly overrides = signal<Partial<Record<PresentationBlockId, boolean>>>(
    readStoredOverrides(),
  );

  /** Anuncios que el operador ha decidido no proyectar (por id). */
  private readonly hiddenAnnouncementIds = signal<ReadonlySet<string>>(readHiddenAnnouncements());

  /** Orden elegido por el operador (ids). Vacío ⇒ el orden de `BLOCK_DEFS`. */
  private readonly customOrder = signal<readonly PresentationBlockId[]>(readStoredOrder());

  /**
   * Definiciones en el **orden de proyección efectivo**: el guardado por el
   * operador, con los bloques que no conozca (nuevos en el código) al final
   * en su orden por defecto. Todo lo demás (estados, diapositivas, dots)
   * deriva de aquí.
   */
  readonly definitions = computed<readonly PresentationBlockDef[]>(() => {
    const order = this.customOrder();
    if (order.length === 0) return BLOCK_DEFS;
    const byId = new Map(BLOCK_DEFS.map((d) => [d.id, d] as const));
    const ordered = order.map((id) => byId.get(id)).filter((d): d is PresentationBlockDef => !!d);
    const rest = BLOCK_DEFS.filter((d) => !order.includes(d.id));
    return [...ordered, ...rest];
  });

  /** `true` si el operador ha cambiado el orden por defecto. */
  readonly hasCustomOrder = computed<boolean>(() => this.customOrder().length > 0);

  constructor() {
    // Otra ventana de la misma máquina (panel de control ↔ proyección) ha
    // cambiado los ajustes: `storage` sólo salta en las demás ventanas, así
    // que basta con releer para que ambas vean lo mismo al instante.
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEY) {
        this.overrides.set(readStoredOverrides());
      }
      if (event.key === null || event.key === HIDDEN_ANNOUNCEMENTS_KEY) {
        this.hiddenAnnouncementIds.set(readHiddenAnnouncements());
      }
      if (event.key === null || event.key === ORDER_KEY) {
        this.customOrder.set(readStoredOrder());
      }
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Reglas automáticas: un bloque sólo se auto-proyecta si tiene contenido. */
  private readonly autoAvailability: Signal<Record<PresentationBlockId, boolean>> = computed(() => ({
    announcements: this.announcements.hasActive(),
    socials: this.config.socials.length > 0,
    streams: true,
    gallery: this.config.mediaEvents.length > 0,
    weekly: this.config.weeklyProgram.length > 0,
    upcoming: this.schedule.hasUpcomingEvents(),
    bible: this.bible.hasReading(),
  }));

  /** Estado resuelto de todos los bloques (para el panel de ajustes). */
  readonly states = computed<readonly PresentationBlockState[]>(() => {
    const auto = this.autoAvailability();
    const overrides = this.overrides();
    return this.definitions().map((def) => {
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
   * si todo quedara desactivado se conserva el primer bloque **con
   * contenido** para no dejar la pantalla de la iglesia en negro.
   */
  readonly activeBlockIds = computed<readonly PresentationBlockId[]>(() => {
    const enabled = this.states()
      .filter((s) => s.enabled)
      .map((s) => s.id);
    if (enabled.length > 0) return enabled;
    const fallback = this.states().find((s) => s.autoAvailable) ?? this.states()[0];
    return [fallback.id];
  });

  /** Anuncios vigentes con su interruptor, para el panel de ajustes. */
  readonly announcementStates = computed<readonly AnnouncementSlideState[]>(() => {
    const hidden = this.hiddenAnnouncementIds();
    return this.announcements
      .active()
      .map((announcement) => ({ announcement, visible: !hidden.has(announcement.id) }));
  });

  /** Anuncios vigentes que sí se proyectan. */
  readonly visibleAnnouncements = computed<readonly Announcement[]>(() =>
    this.announcementStates()
      .filter((s) => s.visible)
      .map((s) => s.announcement),
  );

  /**
   * Diapositivas del carrusel, en orden: los bloques activos expandidos
   * (`announcements` → una por anuncio visible; `upcoming` → páginas).
   *
   * Si el operador oculta todos los anuncios y ése era el único bloque
   * activo, se recurre al primer bloque con contenido: la pantalla nunca se
   * queda vacía.
   */
  readonly activeSlides = computed<readonly PresentationSlide[]>(() => {
    const slides = this.activeBlockIds().flatMap((id) => this.expand(id));
    if (slides.length > 0) return slides;
    const fallback = this.states().find((s) => s.autoAvailable && s.id !== 'announcements');
    return fallback ? this.expand(fallback.id) : this.emptySlide('announcements');
  });

  /** Número de bloques activos (útil para deshabilitar el último toggle). */
  readonly activeCount = computed<number>(() => this.states().filter((s) => s.enabled).length);

  /** Todos los identificadores, en orden de proyección. */
  readonly allBlockIds = computed<readonly PresentationBlockId[]>(() =>
    this.definitions().map((d) => d.id),
  );

  /** `true` si alguna preferencia manual difiere del automático. */
  readonly hasManualOverrides = computed<boolean>(
    () => this.states().some((s) => !s.isAuto) || this.hiddenAnnouncementIds().size > 0,
  );

  /**
   * Expande un bloque en sus diapositivas, según quién las va a pintar:
   *
   *  - `projection` (por defecto): lo que se proyecta. **Un anuncio = una
   *    diapositiva** (entero, de un vistazo: la tarjeta se autoajusta), sólo
   *    los visibles; eventos de dos en dos.
   *  - `panel`: la lista del panel de control. Todos los anuncios vigentes
   *    (también los ocultos, para poder volver a marcarlos); eventos con sus
   *    páginas, para poder ir a cada una.
   *  - `web`: la web pública. Todo entero y sin páginas. Ocultar un anuncio
   *    es una decisión de proyección, no de publicación.
   *
   * Sin contenido (bloque forzado a visible): una diapositiva vacía con su
   * mensaje, para que el operador entienda la pantalla en blanco.
   */
  expand(id: PresentationBlockId, view: ExpandView = 'projection'): readonly PresentationSlide[] {
    const titleKey = this.titleKeyOf(id);
    const projection = view === 'projection';
    const paginate = view !== 'web';

    if (id === 'announcements') {
      const active = this.announcements.active();
      if (active.length === 0) return this.emptySlide(id);
      const shown = projection ? this.visibleAnnouncements() : active;
      return shown.map((announcement) => ({
        key: `${id}:${announcement.id}`,
        block: id,
        titleKey,
        announcement,
      }));
    }

    if (id === 'upcoming') {
      const events = this.schedule.upcomingEvents();
      if (events.length === 0) return this.emptySlide(id);
      if (!paginate) return [{ key: id, block: id, titleKey, events }];
      const total = Math.ceil(events.length / UPCOMING_PER_SLIDE);
      return Array.from({ length: total }, (_, index) => ({
        key: `${id}:${index}`,
        block: id,
        titleKey,
        events: events.slice(index * UPCOMING_PER_SLIDE, (index + 1) * UPCOMING_PER_SLIDE),
        page: { index, total },
      }));
    }

    return [{ key: id, block: id, titleKey }];
  }

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

  /** Devuelve todos los bloques al modo automático y muestra todos los anuncios. */
  resetAll(): void {
    persistOverrides({});
    this.overrides.set({});
    this.hiddenAnnouncementIds.set(new Set());
    persistHiddenAnnouncements(new Set());
  }

  /**
   * Mueve un bloque de una posición a otra del orden de proyección (índices
   * sobre `definitions()`), al estilo de arrastrar en una lista.
   */
  moveBlock(from: number, to: number): void {
    const ids = [...this.allBlockIds()];
    if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    this.setOrder(ids);
  }

  /** Fija el orden completo (ids desconocidos se ignoran; los que falten van al final). */
  setOrder(ids: readonly PresentationBlockId[]): void {
    const valid = new Set<PresentationBlockId>(BLOCK_DEFS.map((d) => d.id));
    const order = ids.filter((id, index) => valid.has(id) && ids.indexOf(id) === index);
    // Igual que el orden por defecto ⇒ no hay nada que recordar.
    const isDefault =
      order.length === BLOCK_DEFS.length && order.every((id, index) => id === BLOCK_DEFS[index].id);
    const next = isDefault ? [] : order;
    this.customOrder.set(next);
    persistOrder(next);
  }

  /** Vuelve al orden por defecto de `BLOCK_DEFS`. */
  resetOrder(): void {
    this.customOrder.set([]);
    persistOrder([]);
  }

  /** Muestra u oculta un anuncio concreto en la proyección. */
  setAnnouncementVisible(id: string, visible: boolean): void {
    this.hiddenAnnouncementIds.update((current) => {
      const next = new Set(current);
      if (visible) next.delete(id);
      else next.add(id);
      persistHiddenAnnouncements(next);
      return next;
    });
  }

  private emptySlide(id: PresentationBlockId): readonly PresentationSlide[] {
    return [{ key: id, block: id, titleKey: this.titleKeyOf(id) }];
  }

  private titleKeyOf(id: PresentationBlockId): string {
    return BLOCK_DEFS.find((d) => d.id === id)?.titleKey ?? '';
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

/**
 * Ids ocultos. Los de anuncios ya caducados se quedan en la lista sin
 * consecuencias (no coinciden con nada) y se limpian con «Restablecer».
 */
function readHiddenAnnouncements(): ReadonlySet<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_ANNOUNCEMENTS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/** Orden guardado (ids de bloque válidos, sin repetidos). */
function readStoredOrder(): readonly PresentationBlockId[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set<string>(BLOCK_DEFS.map((d) => d.id));
    return parsed.filter(
      (v, index): v is PresentationBlockId =>
        typeof v === 'string' && valid.has(v) && parsed.indexOf(v) === index,
    );
  } catch {
    return [];
  }
}

function persistOrder(ids: readonly PresentationBlockId[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (ids.length === 0) localStorage.removeItem(ORDER_KEY);
    else localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}

function persistHiddenAnnouncements(ids: ReadonlySet<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HIDDEN_ANNOUNCEMENTS_KEY, JSON.stringify([...ids]));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}
