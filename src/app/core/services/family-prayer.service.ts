import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FAMILY_PRAYER_WEEKS,
  PrayerFamily,
  PrayerPhotoSize,
  PrayerVerse,
  PrayerWeek,
} from '../family-prayer.config';
import { FAMILY_PHOTOS } from '../family-photos.generated';
import { addDays, formatIsoRange, parseIsoDate, startOfDay, toIsoDate } from '../util/iso-date';
import { ClockService } from './clock.service';

/** Carpeta pública de las fotos (la rellena `scripts/import-family-photos.mjs`). */
const PHOTO_ROOT = 'assets/family-prayer';

/**
 * Proporciones que la ficha web pinta tal cual (marco = foto, sin bandas):
 * de 9:16 (vertical de móvil) a 2:1 (panorámica). Una foto fuera de ese rango
 * es la «incontrolable»: el marco se queda en el tope y el hueco lo rellena
 * la misma foto difuminada. Para casos concretos, `PrayerFamily.photo.frame`.
 */
const MIN_FRAME_RATIO = 9 / 16;
const MAX_FRAME_RATIO = 2;

/** Foto lista para `<img>`: variantes (`srcset`) y proporciones. */
export interface PrayerPhotoView {
  /** Variante mayor: `src` de reserva para navegadores sin `srcset`. */
  readonly src: string;
  /** Variante menor (480): miniaturas y fondo difuminado. */
  readonly thumb: string;
  /** Todas las variantes con su ancho real: `…-480.webp 437w, …-960.webp 874w, …`. */
  readonly srcset: string;
  /**
   * Variantes para la ficha: sin la miniatura (salvo que sea la única).
   * Chrome elige entre dos candidatos por la media geométrica de sus
   * densidades y, con la de 480 en la lista, la escogía para pintar a ~480 px
   * (ampliada y blanda). La ficha nunca baja de 960.
   */
  readonly srcsetDetail: string;
  readonly width: number;
  readonly height: number;
  /** Ancho / alto de la foto. */
  readonly ratio: number;
  /**
   * Proporción del marco en la web: la de la foto (acotada a 9:16 – 2:1) o
   * la fijada a mano en la configuración de la familia.
   */
  readonly frameRatio: number;
  /** Tamaño de la foto en la ficha web (ajuste manual; por defecto `normal`). */
  readonly size: PrayerPhotoSize;
}

/** Una familia resuelta para pintar (web, panel y proyección). */
export interface PrayerFamilyView {
  readonly id: string;
  /**
   * `id` del elemento en la página: `<id>-<domingo>`. La página es un feed de
   * semanas y una familia vuelve a salir cuando la rotación da la vuelta, así
   * que el `id` a secas se repetiría en el documento.
   */
  readonly anchor: string;
  readonly surname: string;
  readonly names: string;
  readonly single: boolean;
  /** «Bîrle Sebastian și Maria»: como se nombra en la lista del resumen. */
  readonly fullName: string;
  /** Iniciales para el monograma cuando aún no hay foto («BS»). */
  readonly initials: string;
  readonly children: readonly string[];
  readonly message: readonly string[];
  readonly verse: PrayerVerse | null;
  readonly photo: PrayerPhotoView | null;
}

/** Dónde cae la semana respecto a la que se anuncia. */
export type PrayerWeekStatus = 'past' | 'current' | 'upcoming';

/** Una semana resuelta: fechas de oración y familias. */
export interface PrayerWeekView {
  readonly number: number;
  readonly presentedOn: string;
  /** Lunes en que empieza la semana de oración (`YYYY-MM-DD`). */
  readonly start: string;
  /** Domingo en que termina (`YYYY-MM-DD`). */
  readonly end: string;
  readonly families: readonly PrayerFamilyView[];
  readonly status: PrayerWeekStatus;
}

/**
 * «Rugăciune pentru familii»: **qué semana se anuncia hoy**.
 *
 * Misma regla que el plan de lectura (`BibleReadingService`): se anuncia la
 * semana que contiene **mañana**. El domingo, en el culto, ya se proyectan las
 * familias de la semana que empieza el lunes —exactamente lo que hacía el
 * PowerPoint «în următoarea săptămână»— y de lunes a sábado siguen las de la
 * semana en curso.
 *
 * Si el domingo aún no se ha cargado la semana siguiente, se mantiene la de
 * hoy (sigue en vigor hasta medianoche) en lugar de dejar la pantalla sin
 * familias. Todo en días naturales locales y reactivo al reloj compartido:
 * el portátil del templo cambia de semana a medianoche sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class FamilyPrayerService {
  private readonly clock = inject(ClockService);
  private readonly translate = inject(TranslateService);

  /** Todas las semanas, de la más antigua a la más reciente. */
  private readonly weeks: readonly PrayerWeek[] = [...FAMILY_PRAYER_WEEKS].sort((a, b) =>
    a.presentedOn.localeCompare(b.presentedOn),
  );

  private readonly today = computed<string>(() => toIsoDate(startOfDay(new Date(this.clock.now()))));

  /** `presentedOn` de la semana que se anuncia, o `null` si no hay ninguna vigente. */
  private readonly announcedKey = computed<string | null>(() => {
    const today = parseIsoDate(this.today());
    const tomorrow = toIsoDate(addDays(today, 1));
    const containing = (iso: string) =>
      this.weeks.find((week) => startOf(week) <= iso && iso <= endOf(week));
    return (containing(tomorrow) ?? containing(this.today()))?.presentedOn ?? null;
  });

  /** Semana que se anuncia (web, panel y proyección). */
  readonly current = computed<PrayerWeekView | null>(() => {
    const key = this.announcedKey();
    const week = this.weeks.find((w) => w.presentedOn === key);
    return week ? this.toView(week) : null;
  });

  readonly hasCurrent = computed<boolean>(() => this.current() !== null);

  /**
   * Semanas ya pasadas, la más reciente primero: el archivo de la web. Las
   * semanas futuras (cargadas por adelantado) no se publican hasta su turno.
   */
  readonly past = computed<readonly PrayerWeekView[]>(() =>
    this.weeks
      .map((week) => this.toView(week))
      .filter((week) => week.status === 'past')
      .reverse(),
  );

  /** Una semana concreta por su domingo, si ya se ha publicado (no futura). */
  byDate(presentedOn: string): PrayerWeekView | null {
    const week = this.weeks.find((w) => w.presentedOn === presentedOn);
    if (!week) return null;
    const view = this.toView(week);
    return view.status === 'upcoming' ? null : view;
  }

  /**
   * Feed de la web: la semana que se anuncia y, debajo, las anteriores de la
   * más reciente a la más antigua. Sin semana vigente, sólo las pasadas.
   */
  readonly feed = computed<readonly PrayerWeekView[]>(() => {
    const current = this.current();
    return current ? [current, ...this.past()] : this.past();
  });

  /** «21 – 27 sept.» / «28 sept. – 4 oct.»: para el índice, sin año. */
  formatShortRange(week: PrayerWeekView): string {
    try {
      return new Intl.DateTimeFormat(this.lang(), { day: 'numeric', month: 'short' }).formatRange(
        parseIsoDate(week.start),
        parseIsoDate(week.end),
      );
    } catch {
      return this.formatRange(week);
    }
  }

  /** «28 septembrie – 4 octombrie 2026», localizado. */
  formatRange(week: PrayerWeekView): string {
    return formatIsoRange(this.lang(), week.start, week.end);
  }

  /** «David, Robert, Lucas și Samuel» (conjunción del idioma activo). */
  formatList(items: readonly string[]): string {
    try {
      return new Intl.ListFormat(this.lang(), { style: 'long', type: 'conjunction' }).format(items);
    } catch {
      return items.join(', ');
    }
  }

  private toView(week: PrayerWeek): PrayerWeekView {
    const status = this.statusOf(week);

    return {
      number: week.number,
      presentedOn: week.presentedOn,
      start: startOf(week),
      end: endOf(week),
      status,
      families: week.families.map((family) => toFamilyView(family, week.presentedOn)),
    };
  }

  /**
   * Con una semana anunciada, todo se ordena respecto a ella (el domingo, la
   * que termina hoy ya es pasada: cedió el sitio a la siguiente). Sin ninguna
   * vigente (hueco entre tandas), manda el calendario.
   */
  private statusOf(week: PrayerWeek): PrayerWeekStatus {
    const announced = this.announcedKey();
    if (announced !== null) {
      if (week.presentedOn === announced) return 'current';
      return week.presentedOn < announced ? 'past' : 'upcoming';
    }
    return endOf(week) < this.today() ? 'past' : 'upcoming';
  }

  private lang(): string {
    return this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
  }
}

function toFamilyView(
  family: PrayerFamily,
  presentedOn: string,
): PrayerFamilyView {
  const base = `${PHOTO_ROOT}/${presentedOn}/${family.id}`;
  const entry = FAMILY_PHOTOS[`${presentedOn}/${family.id}`];
  const file = (size: number) => `${base}-${size}.webp`;
  const toSrcset = (variants: readonly (readonly [number, number])[]) =>
    variants.map(([size, width]) => `${file(size)} ${width}w`).join(', ');
  const photo: PrayerPhotoView | null = entry
    ? {
        src: file(entry.variants[entry.variants.length - 1][0]),
        thumb: file(entry.variants[0][0]),
        srcset: toSrcset(entry.variants),
        srcsetDetail: toSrcset(entry.variants.length > 1 ? entry.variants.slice(1) : entry.variants),
        width: entry.width,
        height: entry.height,
        ratio: entry.width / entry.height,
        frameRatio:
          family.photo?.frame ??
          Math.min(MAX_FRAME_RATIO, Math.max(MIN_FRAME_RATIO, entry.width / entry.height)),
        size: family.photo?.size ?? 'normal',
      }
    : null;

  return {
    id: family.id,
    anchor: `${family.id}-${presentedOn}`,
    surname: family.surname,
    names: family.names,
    single: family.single ?? false,
    fullName: `${family.surname} ${family.names}`,
    initials: `${family.surname[0] ?? ''}${family.names[0] ?? ''}`.toUpperCase(),
    children: family.children ?? [],
    message: family.message ?? [],
    verse: family.verse ?? null,
    photo,
  };
}

/** Lunes de la semana de oración (el día después del domingo en que se presenta). */
function startOf(week: PrayerWeek): string {
  return toIsoDate(addDays(parseIsoDate(week.presentedOn), 1));
}

/** Domingo en que termina la semana de oración. */
function endOf(week: PrayerWeek): string {
  return toIsoDate(addDays(parseIsoDate(week.presentedOn), 7));
}
