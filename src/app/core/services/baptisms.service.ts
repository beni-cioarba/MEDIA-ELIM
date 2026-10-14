import { Injectable, computed, inject } from '@angular/core';
import { BAPTISM_PHOTOS } from '../baptism-photos.generated';
import { BAPTISM_STUDIO_PHOTOS } from '../baptism-studio-photos.generated';
import { BAPTISMS, Baptism, BaptismCandidate } from '../baptisms.config';
import { CHURCH_CONFIG } from '../church.config';
import { APP_PATHS } from '../navigation/app-paths';
import { driveFolderUrl } from '../util/drive-folder';
import { parseIsoDate, startOfDay, toIsoDate } from '../util/iso-date';
import { ClockService } from './clock.service';
import { LanguageService } from './language.service';

/** Un botez con lo que se deriva de su posición y de la fecha de hoy. */
export interface BaptismView extends Baptism {
  /** 1, 2, 3… en orden cronológico. */
  readonly ordinal: number;
  readonly status: 'past' | 'today' | 'upcoming';
  /** Días hasta el botez (0 hoy; negativo si ya pasó). */
  readonly daysLeft: number;
  readonly year: number;
  /** Enlace a su sitio en el registro (`/botezuri/2023-06-11`). */
  readonly link: string;
  /** Carpeta de fotos del día, o `null` si no la hay. */
  readonly photosUrl: string | null;
  /** Directo del servicio en YouTube, o `null`. */
  readonly videoUrl: string | null;
}

/** Un candidato junto con su botez (para el carrusel, el perfil, los vecinos). */
export interface CandidateView extends BaptismCandidate {
  readonly baptism: BaptismView;
  /** Clave del retrato: `<fecha>/<id>`. */
  readonly key: string;
  readonly link: string;
  /** Retrato 4:5 (o `null` si aún no se importó). */
  readonly photo: CandidatePhoto | null;
}

export interface CandidatePhoto {
  /** Variante pequeña (rejillas), mediana y `srcset` completo. */
  readonly small: string;
  readonly medium: string;
  readonly large: string;
  readonly srcset: string;
}

/**
 * Qué retratos se ven:
 *  · `'studio'`   → fondo de estudio común y encuadre igualado
 *    (`assets/baptisms-studio/`, de `scripts/baptism-studio.py`).
 *  · `'original'` → la foto tal cual llegó, sólo recortada a 4:5
 *    (`assets/baptisms/`).
 * Los dos juegos se conservan: volver atrás es cambiar esta línea. Si a un
 * candidato le falta el de estudio, se usa su original.
 */
export const PORTRAIT_STYLE: 'studio' | 'original' = 'studio';

/** Base de la ruta del módulo, sin barra inicial. */
const BASE = APP_PATHS.baptisms;

/**
 * Botezuri: registro cronológico de bautismos y candidatos.
 *
 * Todo sale de `BAPTISMS` (datos) + `BAPTISM_PHOTOS` (retratos generados) y
 * del reloj compartido: un botez futuro pasa a «hoy» y a «historia» solo, sin
 * tocar el fichero. Ver `docs/ai/34-baptisms.md`.
 */
@Injectable({ providedIn: 'root' })
export class BaptismsService {
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly fallbackUrl = inject(CHURCH_CONFIG).mediaGalleryUrl;

  /** Medianoche de hoy como `YYYY-MM-DD` (cambia sólo una vez al día). */
  private readonly today = computed(() => toIsoDate(startOfDay(new Date(this.clock.now()))));

  /** Todos los botezuri, en orden cronológico, con su estado de hoy. */
  readonly all = computed<readonly BaptismView[]>(() => {
    const today = parseIsoDate(this.today()).getTime();
    return [...BAPTISMS]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b, i) => {
        const daysLeft = Math.round((parseIsoDate(b.date).getTime() - today) / 86_400_000);
        return {
          ...b,
          ordinal: i + 1,
          daysLeft,
          status: daysLeft > 0 ? 'upcoming' : daysLeft === 0 ? 'today' : 'past',
          year: Number(b.date.slice(0, 4)),
          link: `/${BASE}/${b.date}`,
          photosUrl: b.driveFolderId ? driveFolderUrl(b.driveFolderId, this.fallbackUrl) : null,
          videoUrl: b.youtubeId ? youtubeUrl(b.youtubeId) : null,
        } satisfies BaptismView;
      });
  });

  /**
   * Orden de lectura del registro: **el más reciente primero** (el próximo,
   * si lo hay, encabeza). El ordinal sigue siendo el cronológico.
   */
  readonly newestFirst = computed(() => [...this.all()].reverse());

  /** Los que ya se celebraron (o se celebran hoy). */
  readonly held = computed(() => this.all().filter((b) => b.status !== 'upcoming'));

  /** El próximo botez anunciado (el más cercano en el futuro, o el de hoy). */
  readonly next = computed<BaptismView | null>(
    () => this.all().find((b) => b.status !== 'past') ?? null,
  );

  /** El último celebrado. */
  readonly latest = computed<BaptismView | null>(() => {
    const held = this.all().filter((b) => b.status === 'past');
    return held.at(-1) ?? null;
  });

  /**
   * Todos los candidatos con retrato y enlace: los botezuri del más reciente
   * al más antiguo y, dentro de cada uno, en el orden de la presentación.
   */
  readonly candidates = computed<readonly CandidateView[]>(() =>
    this.newestFirst().flatMap((b) => b.candidates.map((c) => this.candidateView(b, c))),
  );

  /** Cifras de la cabecera. */
  readonly stats = computed(() => {
    const held = this.held();
    return {
      baptisms: held.length,
      candidates: held.reduce((n, b) => n + b.candidates.length, 0),
      since: held[0]?.year ?? null,
      years: new Set(held.map((b) => b.year)).size,
      streams: held.filter((b) => b.youtubeId).length,
    };
  });

  /** Años con candidatos, del más reciente al más antiguo (filtro del carrusel). */
  readonly candidateYears = computed(() =>
    [...new Set(this.candidates().map((c) => c.baptism.year))].sort((a, b) => b - a),
  );

  byDate(date: string | null | undefined): BaptismView | null {
    return this.all().find((b) => b.date === date) ?? null;
  }

  candidate(date: string | null | undefined, id: string | null | undefined): CandidateView | null {
    return this.candidates().find((c) => c.baptism.date === date && c.id === id) ?? null;
  }

  /** Anterior y siguiente en todo el registro, en el orden en que se lee (sin bucle). */
  neighbours(current: CandidateView): { prev: CandidateView | null; next: CandidateView | null } {
    const list = this.candidates();
    const i = list.findIndex((c) => c.key === current.key);
    return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
  }

  /** «23 iulie 2020» en el idioma activo. */
  formatDate(iso: string, style: 'long' | 'short' | 'day' = 'long'): string {
    const options: Intl.DateTimeFormatOptions =
      style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : style === 'short'
          ? { day: 'numeric', month: 'short', year: 'numeric' }
          : { weekday: 'long' };
    return new Intl.DateTimeFormat(this.language.current(), options).format(parseIsoDate(iso));
  }

  /** Partes de la fecha para la columna del registro (día · mes · año). */
  dateParts(iso: string): { day: string; month: string; year: string; weekday: string } {
    const date = parseIsoDate(iso);
    const lang = this.language.current();
    return {
      day: String(date.getDate()).padStart(2, '0'),
      month: new Intl.DateTimeFormat(lang, { month: 'short' }).format(date).replace('.', ''),
      year: String(date.getFullYear()),
      weekday: new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date),
    };
  }

  private candidateView(baptism: BaptismView, c: BaptismCandidate): CandidateView {
    const key = `${baptism.date}/${c.id}`;
    return { ...c, baptism, key, link: `${baptism.link}/${c.id}`, photo: photoOf(key) };
  }
}

export function youtubeUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Retrato de un candidato a partir del manifiesto generado. */
function photoOf(key: string): CandidatePhoto | null {
  const studio = PORTRAIT_STYLE === 'studio' ? BAPTISM_STUDIO_PHOTOS[key] : undefined;
  const widths = studio?.length ? studio : BAPTISM_PHOTOS[key];
  if (!widths?.length) return null;
  const folder = studio?.length ? 'baptisms-studio' : 'baptisms';
  const url = (w: number) => `assets/${folder}/${key}-${w}.webp`;
  return {
    small: url(widths[0]),
    medium: url(widths[Math.min(1, widths.length - 1)]),
    large: url(widths.at(-1) as number),
    srcset: widths.map((w) => `${url(w)} ${w}w`).join(', '),
  };
}
