import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { CHURCH_CONFIG } from '../church.config';
import { ClockService } from '../services/clock.service';
import { LanguageService } from '../services/language.service';
import { LoggerService } from '../services/logger.service';
import media from './data/2026.media.json';
import { IMPREUNA_WP_API, IMPREUNA_YOUTUBE_UPLOADS, YOUTUBE_PLAYLIST_ITEMS_API } from './impreuna.config';
import { IMPREUNA_EDITION, PlanDay, editionToday, planDay } from './impreuna-edition';
import { WpDayPost, WpPostJson, YoutubePlaylistItemJson, isoDateOfDay, parseWpPost, parseYoutubeUpload, readingStreak } from './impreuna-plan';
import { BibleLang, PassageGroup, formatReading, groupRefs } from '../bible/bible-refs';

/** La meditación de un día: vídeo de YouTube, quién la da y su entrada en la web del proyecto. */
export interface DayMedia {
  readonly video: string | null;
  readonly speaker: string | null;
  readonly postId: number | null;
}

/** Un día listo para pintar en el idioma activo. */
export interface DayView extends PlanDay {
  readonly reading: string;
  readonly groups: readonly PassageGroup[];
  readonly media: DayMedia | null;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly isRead: boolean;
}

type MediaRow = readonly [string | null, string | null, number | null] | null;

/** Instantánea de vídeos generada por `npm run impreuna:sync` (índice 0 = día 1). */
function snapshot(): ReadonlyMap<number, DayMedia> {
  const map = new Map<number, DayMedia>();
  (media.days as unknown as readonly MediaRow[]).forEach((row, i) => {
    if (row) map.set(i + 1, { video: row[0], speaker: row[1], postId: row[2] });
  });
  return map;
}

/** Cuánto se espera a la web del proyecto antes de seguir sin ella. */
const WP_TIMEOUT_MS = 8000;
/** Entradas que se piden como mucho (las más recientes desde la instantánea). */
const WP_MAX_POSTS = 40;
/**
 * Mientras falte el vídeo de hoy, cada cuánto se vuelve a preguntar. Publican
 * hacia medianoche de Rumanía (23:00 en España) pero a veces tarde: con la
 * página abierta, el vídeo aparece solo sin recargar.
 */
const WP_RETRY_MS = 30 * 60_000;
/** Subidas que se miran en YouTube (las más recientes; una por día). */
const YT_MAX_ITEMS = 10;

/**
 * Proiectul Împreună: qué día toca, sus vídeos y lo que lleva leído cada uno.
 *
 *  · **Día**: `computed` sobre el reloj compartido, así que la página cambia
 *    sola a medianoche (hora del dispositivo).
 *  · **Vídeos**: la instantánea de `data/` más, si a ella le falta algo de
 *    hoy, YouTube (lista de subidas del Cult: el vídeo, en cuanto se sube) y
 *    la API pública de proiectulimpreuna.ro (la entrada con los motivos de
 *    oración, que llega horas después). Si nada responde, la página sigue con
 *    la instantánea y enlaza al canal de YouTube: nunca se queda en blanco.
 *  · **Progreso**: los días marcados como leídos, sólo en este dispositivo
 *    (`localStorage`, protegido: en privado o sin almacenamiento simplemente
 *    no se recuerda).
 */
@Injectable({ providedIn: 'root' })
export class ImpreunaService {
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly http = inject(HttpClient);
  private readonly log = inject(LoggerService).prefix('impreuna');
  private readonly window = inject(DOCUMENT).defaultView;
  /** Clave de la YouTube Data API de la web (restringida por dominio). */
  private readonly config = inject(CHURCH_CONFIG, { optional: true });

  readonly edition = IMPREUNA_EDITION;
  readonly lang = computed<BibleLang>(() => this.language.current());

  /** Hoy en la edición: día y si está en marcha (antes de empezar / ya acabada). */
  readonly today = computed(() => editionToday(new Date(this.clock.now())));
  readonly todayDay = computed(() => this.today().day);

  // ── Vídeos ────────────────────────────────────────────────────────────
  private readonly _media = signal<ReadonlyMap<number, DayMedia>>(snapshot());
  readonly media = this._media.asReadonly();
  /** Último día con vídeo conocido. */
  readonly lastMediaDay = computed(() => Math.max(0, ...this._media().keys()));
  private requestedFor = 0;
  private requestedAt = 0;

  // ── Progreso ──────────────────────────────────────────────────────────
  private readonly storageKey = `elim.impreuna.${IMPREUNA_EDITION.year}.read`;
  private readonly _read = signal<ReadonlySet<number>>(this.loadRead());
  readonly read = this._read.asReadonly();
  readonly readCount = computed(() => this._read().size);
  readonly streak = computed(() => readingStreak(this._read(), this.todayDay()));
  /** Días hasta hoy (incluido) que faltan por marcar. */
  readonly behind = computed(() => {
    const read = this._read();
    let missing = 0;
    for (let d = 1; d <= this.todayDay(); d++) if (!read.has(d)) missing++;
    return missing;
  });

  /** Un día con todo lo necesario para pintarlo en el idioma activo. */
  view(day: number): DayView | null {
    const plan = planDay(day);
    if (!plan) return null;
    const lang = this.lang();
    const today = this.today();
    return {
      ...plan,
      reading: formatReading(plan.refs, lang),
      groups: groupRefs(plan.refs, lang),
      media: this._media().get(day) ?? null,
      isToday: today.status === 'running' && day === today.day,
      isFuture: today.status === 'before' || (today.status === 'running' && day > today.day),
      isRead: this._read().has(day),
    };
  }

  /**
   * Completa lo que le falte al día de hoy (la página la llama con cada tic
   * del reloj; como mucho una ronda cada `WP_RETRY_MS`, sin errores visibles):
   *  · **vídeo** → YouTube, la lista de subidas del Cult (lo suben a las
   *    23:15 de España, horas antes que la web del proyecto);
   *  · **entrada** de la web del proyecto (enlace a «Motive de rugăciune») →
   *    su API de WordPress, que de paso también trae el vídeo.
   */
  refresh(): void {
    const { status, day } = this.today();
    if (status !== 'running') return;
    const known = this._media().get(day);
    if (known?.video && known.postId) return;
    const now = this.clock.now();
    if (this.requestedFor === day && now - this.requestedAt < WP_RETRY_MS) return;
    this.requestedFor = day;
    this.requestedAt = now;
    if (!known?.video) this.fetchYoutube();
    this.fetchWordpress();
  }

  private fetchYoutube(): void {
    const key = this.config?.youtubeApiKey;
    if (!key) return;
    const params = new HttpParams({
      fromObject: {
        part: 'snippet',
        playlistId: IMPREUNA_YOUTUBE_UPLOADS,
        maxResults: String(YT_MAX_ITEMS),
        fields: 'items(snippet(publishedAt,title,resourceId/videoId))',
        key,
      },
    });
    this.http
      .get<{ readonly items?: readonly YoutubePlaylistItemJson[] }>(YOUTUBE_PLAYLIST_ITEMS_API, { params })
      .pipe(timeout(WP_TIMEOUT_MS))
      .subscribe({
        next: (res) => this.mergeYoutube(res.items ?? []),
        error: (err: unknown) => this.log.warn('Sin respuesta de YouTube; queda la web del proyecto.', err),
      });
  }

  private fetchWordpress(): void {
    const since = isoDateOfDay(this.edition.year, Math.max(1, this.lastPostDay()));
    const params = new HttpParams({
      fromObject: {
        categories: String(media.wpCategory),
        after: `${since}T00:00:00`,
        per_page: String(WP_MAX_POSTS),
        orderby: 'date',
        order: 'desc',
        _fields: 'id,title,content',
      },
    });
    this.http
      .get<WpPostJson[]>(IMPREUNA_WP_API, { params })
      .pipe(timeout(WP_TIMEOUT_MS))
      .subscribe({
        next: (posts) => this.merge(posts),
        error: (err: unknown) => this.log.warn('Sin respuesta de proiectulimpreuna.ro; queda la instantánea.', err),
      });
  }

  /** Último día con entrada de la web del proyecto conocida. */
  private lastPostDay(): number {
    let last = 0;
    for (const [day, m] of this._media()) if (m.postId && day > last) last = day;
    return last;
  }

  /** Añade lo que traen unas entradas de WordPress (vídeo, ponente y entrada). */
  merge(posts: readonly WpPostJson[]): void {
    this.mergeDays(posts.map(parseWpPost));
  }

  /** Añade lo que traen unas subidas del canal del Cult (vídeo y ponente). */
  mergeYoutube(items: readonly YoutubePlaylistItemJson[]): void {
    this.mergeDays(items.map((item) => parseYoutubeUpload(item, this.edition.year)));
  }

  /**
   * Fusiona por día sin perder datos: lo nuevo rellena lo que faltaba y no
   * borra lo que ya había (YouTube no trae la entrada; WordPress puede no
   * tener aún el vídeo).
   */
  private mergeDays(days: readonly (WpDayPost | null)[]): void {
    const next = new Map(this._media());
    let changed = false;
    for (const d of days) {
      if (!d || d.day < 1 || d.day > this.edition.total) continue;
      const prev = next.get(d.day);
      const merged: DayMedia = {
        video: d.video ?? prev?.video ?? null,
        speaker: d.speaker ?? prev?.speaker ?? null,
        postId: d.postId ?? prev?.postId ?? null,
      };
      if (!merged.video && !merged.postId) continue;
      if (prev && prev.video === merged.video && prev.speaker === merged.speaker && prev.postId === merged.postId) continue;
      next.set(d.day, merged);
      changed = true;
    }
    if (changed) this._media.set(next);
  }

  // ── Progreso ──────────────────────────────────────────────────────────

  toggleRead(day: number): void {
    const next = new Set(this._read());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    this.saveRead(next);
  }

  /**
   * Marca como leídos todos los días hasta `day` (para quien lee en otro
   * sitio). Devuelve lo que había antes, para poder deshacerlo.
   */
  markThrough(day: number): ReadonlySet<number> {
    const previous = this._read();
    const next = new Set(previous);
    for (let d = 1; d <= day; d++) next.add(d);
    this.saveRead(next);
    return previous;
  }

  /** Vuelve a un estado de lectura anterior («Deshacer»). */
  restoreRead(read: ReadonlySet<number>): void {
    this.saveRead(new Set(read));
  }

  clearRead(): void {
    this.saveRead(new Set());
  }

  private loadRead(): ReadonlySet<number> {
    try {
      const raw = this.window?.localStorage.getItem(this.storageKey);
      const list: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list.filter((d): d is number => Number.isInteger(d)) : []);
    } catch {
      return new Set();
    }
  }

  private saveRead(read: ReadonlySet<number>): void {
    this._read.set(read);
    try {
      this.window?.localStorage.setItem(this.storageKey, JSON.stringify([...read].sort((a, b) => a - b)));
    } catch {
      // Sin almacenamiento (privado, cuota): se recuerda sólo mientras dure la página.
    }
  }
}
