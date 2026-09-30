import { DestroyRef, Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Announcement, CHURCH_CONFIG } from '../church.config';
import { AnnouncementsService } from './announcements.service';
import { BibleReadingService } from './bible-reading.service';
import { FamilyPrayerService, PrayerFamilyView, PrayerWeekView } from './family-prayer.service';
import { ClockService } from './clock.service';
import { PrayerCausesService } from './prayer-causes.service';
import { TalentContestService } from './talent-contest.service';
import { toIsoDate } from '../util/iso-date';
import { PresentationDisplayService } from './presentation-display.service';
import { ScheduleService, UpcomingEventView } from './schedule.service';

/** Identificador estable de cada bloque proyectable del carrusel. */
export type PresentationBlockId =
  | 'announcements'
  | 'socials'
  | 'streams'
  | 'gallery'
  | 'weekly'
  | 'upcoming'
  | 'bible'
  | 'families'
  | 'causes'
  | 'talent'
  | 'website';

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
 *  - `families`      → el resumen de la semana y, detrás, una ficha por
 *                      familia (como el PowerPoint del domingo).
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
  /** Sólo en `families`: la semana (resumen y fichas). */
  readonly prayerWeek?: PrayerWeekView;
  /** Sólo en las fichas de `families`: la familia de la diapositiva. */
  readonly family?: PrayerFamilyView;
  /**
   * Ficha de una familia de una **semana anterior**, añadida a mano para
   * hoy (ver `PresentationBlocksService.setPastFamilyShown`).
   */
  readonly pastFamily?: boolean;
}

/** Una familia de una semana anterior, para el desplegable del panel. */
export interface PastFamilyOption {
  readonly week: PrayerWeekView;
  readonly family: PrayerFamilyView;
}

/** Quién va a pintar las diapositivas que devuelve `expand()`. */
export type ExpandView = 'projection' | 'panel' | 'web';

/** Estado de un anuncio en el panel de ajustes: vigente y ¿se proyecta? */
export interface AnnouncementSlideState {
  readonly announcement: Announcement;
  readonly visible: boolean;
}

/** Un evento próximo con su interruptor de proyección, para el panel. */
export interface UpcomingSlideState {
  readonly event: UpcomingEventView;
  readonly visible: boolean;
}

/**
 * Eventos por diapositiva: dos caben grandes y legibles con la escala de
 * cartel (descripción recortada a dos líneas; el detalle, en la web). El
 * lienzo es siempre entero: el QR ya no le quita una columna.
 */
export const UPCOMING_PER_SLIDE = 2;

const STORAGE_KEY = 'iglesia-redes.presentation.blocks';
const HIDDEN_ANNOUNCEMENTS_KEY = 'iglesia-redes.presentation.announcements.hidden';
const HIDDEN_EVENTS_KEY = 'iglesia-redes.presentation.events.hidden';
const HIDDEN_FAMILIES_KEY = 'iglesia-redes.presentation.families.hidden';
const PAST_FAMILIES_KEY = 'iglesia-redes.presentation.families.past';

/** Id de la diapositiva de resumen dentro de la selección de `families`. */
export const FAMILY_SUMMARY_ID = 'summary';

/** Bloques cuyas diapositivas se eligen una a una en el panel. */
export type SelectableBlockId = 'announcements' | 'upcoming' | 'families';

/** Estado de la selección de un bloque, para los atajos «Doar primul» / «Toate». */
export interface BlockSelection {
  /** Elementos elegibles (anuncios, eventos, resumen + fichas). */
  readonly total: number;
  /** Cuántos se proyectan. */
  readonly visible: number;
  /** Sólo el primero está marcado. */
  readonly onlyFirst: boolean;
}

/** Bloques con selección elemento a elemento, en el orden del panel. */
const SELECTABLE_BLOCKS: readonly SelectableBlockId[] = ['announcements', 'upcoming', 'families'];
const ORDER_KEY = 'iglesia-redes.presentation.order';

/**
 * Orden de proyección. Cambiarlo aquí cambia el orden del carrusel.
 * Los anuncios y la lectura bíblica de la semana van primero: son lo que la
 * congregación necesita leer antes de que empiece el programa.
 */
const BLOCK_DEFS: readonly PresentationBlockDef[] = [
  { id: 'announcements', titleKey: 'announcements.title' },
  { id: 'families', titleKey: 'family_prayer.title' },
  { id: 'causes', titleKey: 'prayer_causes.title' },
  { id: 'bible', titleKey: 'bible.title' },
  { id: 'socials', titleKey: 'socials.section_title' },
  { id: 'streams', titleKey: 'streams.title' },
  { id: 'gallery', titleKey: 'gallery.title' },
  { id: 'weekly', titleKey: 'weekly.title' },
  { id: 'upcoming', titleKey: 'upcoming.title' },
  // Talantul în Negoț: tras los eventos (es otro «lo que viene») y antes del QR.
  { id: 'talent', titleKey: 'talent_contest.title' },
  // El QR, al final de la vuelta: «todo esto está en la web».
  { id: 'website', titleKey: 'website_slide.block' },
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
  private readonly familyPrayer = inject(FamilyPrayerService);
  private readonly prayerCauses = inject(PrayerCausesService);
  private readonly talentContest = inject(TalentContestService);
  private readonly display = inject(PresentationDisplayService);
  private readonly clock = inject(ClockService);

  /** Preferencias manuales persistidas (ausente ⇒ modo automático). */
  private readonly overrides = signal<Partial<Record<PresentationBlockId, boolean>>>(
    readStoredOverrides(),
  );

  /** Anuncios que el operador ha decidido no proyectar (por id). */
  private readonly hiddenAnnouncementIds = signal<ReadonlySet<string>>(readHiddenAnnouncements());

  /** Eventos que el operador ha decidido no proyectar (por id). */
  private readonly hiddenEventIds = signal<ReadonlySet<string>>(readHiddenIds(HIDDEN_EVENTS_KEY));

  /**
   * Diapositivas de familias que no se proyectan: el resumen
   * (`FAMILY_SUMMARY_ID`) o una ficha (id de la familia). Con cinco o seis
   * familias por semana no siempre se proyectan todas.
   */
  private readonly hiddenFamilyIds = signal<ReadonlySet<string>>(readHiddenIds(HIDDEN_FAMILIES_KEY));

  /**
   * Familias de semanas anteriores que el operador ha añadido **para hoy**.
   * Es la excepción (una familia que pidió oración otra vez, un domingo con
   * pocas fichas): por eso se añade a mano, nunca entra con «Toate» y caduca
   * sola a medianoche, como el aviso de directo.
   */
  private readonly pastFamilyPick = signal<PastFamilyPick>(readPastFamilyPick());

  private readonly today = computed<string>(() => toIsoDate(new Date(this.clock.now())));

  /** Ids de las familias anteriores añadidas hoy (vacío si la marca es de otro día). */
  private readonly pastFamilyIds = computed<ReadonlySet<string>>(() => {
    const pick = this.pastFamilyPick();
    return pick.date === this.today() ? new Set(pick.ids) : new Set();
  });

  /**
   * Familias de las semanas anteriores (la más reciente primero), sin las
   * que también están en la semana en curso.
   */
  readonly pastFamilies = computed<readonly PastFamilyOption[]>(() => {
    // Una familia que se repite en varias semanas sale una vez: la más reciente.
    const seen = new Set(this.familyPrayer.current()?.families.map((f) => f.id) ?? []);
    const options: PastFamilyOption[] = [];
    for (const week of this.familyPrayer.past()) {
      for (const family of week.families) {
        if (seen.has(family.id)) continue;
        seen.add(family.id);
        options.push({ week, family });
      }
    }
    return options;
  });

  /** Las que todavía no se proyectan: el contenido del desplegable. */
  readonly pastFamilyOptions = computed<readonly PastFamilyOption[]>(() => {
    const picked = this.pastFamilyIds();
    return this.pastFamilies().filter((option) => !picked.has(option.family.id));
  });

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
      if (event.key === null || event.key === HIDDEN_EVENTS_KEY) {
        this.hiddenEventIds.set(readHiddenIds(HIDDEN_EVENTS_KEY));
      }
      if (event.key === null || event.key === HIDDEN_FAMILIES_KEY) {
        this.hiddenFamilyIds.set(readHiddenIds(HIDDEN_FAMILIES_KEY));
      }
      if (event.key === null || event.key === PAST_FAMILIES_KEY) {
        this.pastFamilyPick.set(readPastFamilyPick());
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
    families: this.familyPrayer.hasCurrent(),
    causes: this.prayerCauses.hasCauses,
    // Mientras quede alguna fase por delante (o se esté celebrando).
    talent: this.talentContest.focusPhase() !== null,
    website: true,
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

  /** Eventos próximos con su interruptor, para el panel de ajustes. */
  readonly upcomingStates = computed<readonly UpcomingSlideState[]>(() => {
    const hidden = this.hiddenEventIds();
    return this.schedule.upcomingEvents().map((event) => ({ event, visible: !hidden.has(event.id) }));
  });

  /** Eventos próximos que sí se proyectan. */
  readonly visibleEvents = computed<readonly UpcomingEventView[]>(() =>
    this.upcomingStates()
      .filter((s) => s.visible)
      .map((s) => s.event),
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
    () =>
      this.states().some((s) => !s.isAuto) ||
      this.hiddenAnnouncementIds().size > 0 ||
      this.hiddenEventIds().size > 0 ||
      this.hiddenFamilyIds().size > 0 ||
      this.pastFamilyIds().size > 0,
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
      // Igual que con los anuncios: el panel los lista todos (para poder
      // volver a marcarlos) y la proyección sólo pinta los elegidos.
      const todos = this.schedule.upcomingEvents();
      // Sin eventos en el calendario: diapositiva vacía con su mensaje, para
      // que el operador entienda por qué la pantalla está en blanco.
      if (todos.length === 0) return this.emptySlide(id);
      const events = projection ? this.visibleEvents() : todos;
      // Los ha ocultado todos a mano: eso no es «no hay nada que contar»,
      // es «hoy no los proyectes», así que el bloque no aporta diapositivas.
      if (events.length === 0) return [];
      if (!paginate) return [{ key: id, block: id, titleKey, events }];

      /*
       * En el panel, **una fila por evento** y no por página.
       *
       * La página es un detalle de la proyección —cambia sola al encender el
       * QR, que reparte los eventos de otra forma— y el operador no decide
       * sobre páginas: decide sobre eventos. Con una fila por evento, la
       * casilla corresponde a uno concreto, el rótulo es su título y pulsar
       * la fila salta a la diapositiva donde ese evento se proyecta
       * (`PresenterComponent.indexOf` resuelve la correspondencia).
       */
      if (view === 'panel') {
        return events.map((event) => ({
          key: `${id}:${event.id}`,
          block: id,
          titleKey,
          events: [event],
        }));
      }
      const total = Math.ceil(events.length / UPCOMING_PER_SLIDE);
      return Array.from({ length: total }, (_, index) => ({
        key: `${id}:${index}`,
        block: id,
        titleKey,
        events: events.slice(index * UPCOMING_PER_SLIDE, (index + 1) * UPCOMING_PER_SLIDE),
        page: { index, total },
      }));
    }

    if (id === 'families') {
      // Resumen primero y, detrás, una ficha por familia en el orden del
      // resumen: se proyecta igual que el PowerPoint del domingo. En la web
      // no pasa por aquí (tiene página propia).
      const week = this.familyPrayer.current();
      if (!week) return this.emptySlide(id);
      // Familias anteriores añadidas hoy: detrás de las de la semana, en el
      // orden del desplegable. Se listan en el panel (para quitarlas o darles
      // tiempo) y se proyectan; no cuentan en la selección de la semana.
      const picked = this.pastFamilyIds();
      const past: PresentationSlide[] = this.pastFamilies()
        .filter((option) => picked.has(option.family.id))
        .map(({ week: pastWeek, family }) => ({
          key: `${id}:past:${family.id}`,
          block: id,
          titleKey,
          prayerWeek: pastWeek,
          family,
          pastFamily: true,
        }));
      const all: PresentationSlide[] = [
        { key: id, block: id, titleKey, prayerWeek: week },
        ...week.families.map((family) => ({
          key: `${id}:${family.id}`,
          block: id,
          titleKey,
          prayerWeek: week,
          family,
        })),
      ];
      // El panel las lista todas (para poder volver a marcarlas); la
      // proyección, sólo las elegidas. Si se desmarcan todas, el bloque no
      // aporta diapositivas (como los eventos).
      if (!projection) return [...all, ...past];
      const hidden = this.hiddenFamilyIds();
      return [...all.filter((slide) => !hidden.has(familySelectionId(slide))), ...past];
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
    this.hiddenEventIds.set(new Set());
    persistHiddenIds(HIDDEN_EVENTS_KEY, new Set());
    this.hiddenFamilyIds.set(new Set());
    persistHiddenIds(HIDDEN_FAMILIES_KEY, new Set());
    this.clearPastFamilies();
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

  /** Muestra u oculta una diapositiva de familias (resumen o ficha). */
  setFamilyVisible(id: string, visible: boolean): void {
    this.updateHidden(this.hiddenFamilyIds, HIDDEN_FAMILIES_KEY, id, visible);
  }

  /** ¿Se proyecta esta diapositiva de familias? */
  isFamilyVisible(id: string): boolean {
    return !this.hiddenFamilyIds().has(id);
  }

  /** Añade (para hoy) o quita una familia de una semana anterior. */
  setPastFamilyShown(id: string, shown: boolean): void {
    const ids = new Set(this.pastFamilyIds());
    if (shown) ids.add(id);
    else ids.delete(id);
    const next: PastFamilyPick = { date: this.today(), ids: [...ids] };
    this.pastFamilyPick.set(next);
    persistPastFamilyPick(next);
  }

  private clearPastFamilies(): void {
    const empty: PastFamilyPick = { date: null, ids: [] };
    this.pastFamilyPick.set(empty);
    persistPastFamilyPick(empty);
  }

  // ---- Selección rápida ---------------------------------------------------
  //
  // Con muchos anuncios, eventos o familias no siempre se proyectan todos:
  // «Doar primul» deja marcado sólo el primero (para ir marcando después los
  // que se quieran) y «Toate» los vuelve a marcar todos. Un solo mecanismo
  // para los tres bloques: la lista de ids elegibles y su conjunto de ocultos.

  /** Estado de la selección de un bloque (para pintar los atajos). */
  selection(block: SelectableBlockId): BlockSelection {
    const { ids, hidden } = this.selectable(block);
    const set = hidden();
    const visible = ids.filter((id) => !set.has(id)).length;
    return {
      total: ids.length,
      visible,
      onlyFirst: ids.length > 0 && visible === 1 && !set.has(ids[0]),
    };
  }

  /**
   * Deja marcado sólo el primer elemento del bloque. En familias también
   * retira las de semanas anteriores: «todo menos el primero» es todo.
   */
  selectOnlyFirst(block: SelectableBlockId): void {
    const { ids, hidden, key } = this.selectable(block);
    const next = new Set(ids.slice(1));
    hidden.set(next);
    persistHiddenIds(key, next);
    if (block === 'families') this.clearPastFamilies();
  }

  /**
   * Vuelve a marcar todos los elementos del bloque. Las familias de semanas
   * anteriores **no**: son una excepción que se añade a mano, una a una.
   */
  selectAll(block: SelectableBlockId): void {
    const { hidden, key } = this.selectable(block);
    hidden.set(new Set());
    persistHiddenIds(key, new Set());
  }

  // ---- Selección global (bloques) -----------------------------------------
  //
  // Los mismos dos atajos, un nivel más arriba: sobre los **bloques**.
  //  - «Doar primul»: sólo el primer bloque con contenido (en el orden de
  //    proyección) queda encendido; el resto, apagados a mano.
  //  - «Toate»: todos los bloques con contenido encendidos (vuelven a su
  //    modo automático) y, dentro, todos sus elementos marcados. Las
  //    familias de semanas anteriores, no: son una excepción a mano.
  // Un bloque sin contenido no se enciende: sólo proyectaría una pantalla
  // vacía.

  /** Bloques con contenido y cuántos se proyectan (para el contador global). */
  readonly globalSelection = computed<BlockSelection & { readonly allSelected: boolean }>(() => {
    const conContenido = this.states().filter((s) => s.autoAvailable);
    const visible = conContenido.filter((s) => s.enabled).length;
    const primero = conContenido[0];
    const elementosCompletos = SELECTABLE_BLOCKS.every((block) => {
      const sel = this.selection(block);
      return sel.visible === sel.total;
    });
    return {
      total: conContenido.length,
      visible,
      onlyFirst: !!primero && primero.enabled && this.states().every((s) => s === primero || !s.enabled),
      allSelected: visible === conContenido.length && elementosCompletos,
    };
  });

  /** Sólo el primer bloque con contenido queda encendido. */
  selectOnlyFirstBlock(): void {
    const primero = this.states().find((s) => s.autoAvailable);
    if (!primero) return;
    const next: Partial<Record<PresentationBlockId, boolean>> = {};
    for (const state of this.states()) next[state.id] = state.id === primero.id;
    this.overrides.set(next);
    persistOverrides(next);
  }

  /** Todos los bloques con contenido encendidos y todos sus elementos marcados. */
  selectAllBlocks(): void {
    this.overrides.set({});
    persistOverrides({});
    for (const block of SELECTABLE_BLOCKS) this.selectAll(block);
  }

  /** Ids elegibles de un bloque, en orden de proyección, y dónde se guardan. */
  private selectable(block: SelectableBlockId): {
    readonly ids: readonly string[];
    readonly hidden: WritableSignal<ReadonlySet<string>>;
    readonly key: string;
  } {
    switch (block) {
      case 'announcements':
        return {
          ids: this.announcements.active().map((a) => a.id),
          hidden: this.hiddenAnnouncementIds,
          key: HIDDEN_ANNOUNCEMENTS_KEY,
        };
      case 'upcoming':
        return {
          ids: this.schedule.upcomingEvents().map((e) => e.id),
          hidden: this.hiddenEventIds,
          key: HIDDEN_EVENTS_KEY,
        };
      case 'families': {
        const week = this.familyPrayer.current();
        return {
          ids: week ? [FAMILY_SUMMARY_ID, ...week.families.map((f) => f.id)] : [],
          hidden: this.hiddenFamilyIds,
          key: HIDDEN_FAMILIES_KEY,
        };
      }
    }
  }

  private updateHidden(
    hidden: WritableSignal<ReadonlySet<string>>,
    key: string,
    id: string,
    visible: boolean,
  ): void {
    hidden.update((current) => {
      const next = new Set(current);
      if (visible) next.delete(id);
      else next.add(id);
      persistHiddenIds(key, next);
      return next;
    });
  }

  /** Muestra u oculta un evento concreto en la proyección. */
  setEventVisible(id: string, visible: boolean): void {
    this.hiddenEventIds.update((current) => {
      const next = new Set(current);
      if (visible) next.delete(id);
      else next.add(id);
      persistHiddenIds(HIDDEN_EVENTS_KEY, next);
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
  return readHiddenIds(HIDDEN_ANNOUNCEMENTS_KEY);
}

/** Ids ocultos guardados bajo una clave. Mismo trato para anuncios y eventos. */
function readHiddenIds(key: string): ReadonlySet<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
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
  persistHiddenIds(HIDDEN_ANNOUNCEMENTS_KEY, ids);
}

function persistHiddenIds(key: string, ids: ReadonlySet<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}

/** Familias anteriores añadidas: el día en que se añadieron y sus ids. */
interface PastFamilyPick {
  readonly date: string | null;
  readonly ids: readonly string[];
}

function readPastFamilyPick(): PastFamilyPick {
  const empty: PastFamilyPick = { date: null, ids: [] };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(PAST_FAMILIES_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Record<keyof PastFamilyPick, unknown>>;
    const date = typeof parsed.date === 'string' ? parsed.date : null;
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((v): v is string => typeof v === 'string') : [];
    return { date, ids };
  } catch {
    return empty;
  }
}

function persistPastFamilyPick(pick: PastFamilyPick): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (pick.ids.length === 0) localStorage.removeItem(PAST_FAMILIES_KEY);
    else localStorage.setItem(PAST_FAMILIES_KEY, JSON.stringify(pick));
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión sigue funcionando */
  }
}

/** Id de selección de una diapositiva de familias: el resumen o la familia. */
export function familySelectionId(slide: PresentationSlide): string {
  return slide.family?.id ?? FAMILY_SUMMARY_ID;
}
