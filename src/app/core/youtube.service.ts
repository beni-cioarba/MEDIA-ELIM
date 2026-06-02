import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, timer, map } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CHURCH_CONFIG } from './church.config';

/**
 * Información mínima de un vídeo para mostrar en la UI.
 * Mantenemos la forma plana para no exponer la estructura de la API.
 */
export interface YouTubeVideo {
  readonly id: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly thumbnail: string;
  readonly url: string;
}

/** Datos estáticos generados por el Cron Job */
interface YtStaticData {
  updatedAt: string;
  liveStream: YouTubeVideo | null;
  recentStreams: YouTubeVideo[];
}

/** Miniaturas comunes a varias respuestas de la API. */
interface YtThumbnails {
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
}

/** Respuesta de /search y /playlistItems (recientes) — sólo lo que usamos. */
interface YtSearchResponse {
  items?: Array<{
    id?: { videoId?: string };           // Usado por /search
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string }; // Usado por /playlistItems (part=snippet)
      thumbnails?: YtThumbnails;
    };
  }>;
}

/** Respuesta de /playlistItems con part=contentDetails (sólo IDs). */
interface YtPlaylistContentResponse {
  items?: Array<{ contentDetails?: { videoId?: string } }>;
}

/**
 * Respuesta de /videos con part=snippet,liveStreamingDetails.
 * `liveBroadcastContent === 'live'` es la señal fiable de "en directo ahora".
 */
interface YtVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
      liveBroadcastContent?: 'live' | 'upcoming' | 'none';
      thumbnails?: YtThumbnails;
    };
    liveStreamingDetails?: {
      actualStartTime?: string;
      actualEndTime?: string;
      scheduledStartTime?: string;
    };
  }>;
}

/**
 * Servicio que obtiene la información de YouTube a través de un JSON local cacheado.
 * Implementa el fallback extremo de la API directa si la Solución 3 falla.
 */
@Injectable({ providedIn: 'root' })
export class YouTubeService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CHURCH_CONFIG);

  // Leemos desde la rama especial "youtube-data" alojada en publico por github de manera gratuita y cacheada por su CDN superrápida. 
  // Esto desconecta un 100% tu base de código principal del script de youtube!
  private readonly jsonEndpoint = 'https://raw.githubusercontent.com/beni-cioarba/MEDIA-ELIM/youtube-data/youtube.json';
  private readonly playlistEndpoint = 'https://www.googleapis.com/youtube/v3/playlistItems';
  private readonly videosEndpoint = 'https://www.googleapis.com/youtube/v3/videos';

  readonly liveStream = signal<YouTubeVideo | null>(null);
  readonly recentStreams = signal<YouTubeVideo[]>([]);

  /**
   * true en cuanto el sondeo directo de "en directo" ha respondido al menos
   * una vez. A partir de ese momento es la fuente autoritativa del estado
   * live y el JSON estático deja de pisar `liveStream` (solo aporta recientes).
   */
  private liveDirectlyKnown = false;

  /** Cadencia del JSON estático (recientes + respaldo de live). */
  private readonly staticPollMs = 5 * 60_000;
  /**
   * Cadencia del sondeo directo del directo. Es ligero (2 unidades de cuota)
   * y nos da detección casi en tiempo real, sin depender de la cadencia del
   * GitHub Action ni de la caché del CDN.
   */
  private readonly livePollMs = 2 * 60_000;

  private readonly data$: Observable<YtStaticData | null>;
  private readonly live$: Observable<YouTubeVideo | null>;

  constructor() {
    // 1) JSON estático: fuente de los vídeos recientes y respaldo del live.
    //    Regenerado por GitHub Actions y servido por el CDN de GitHub.
    this.data$ = timer(0, this.staticPollMs).pipe(
      switchMap(() => this.fetchLocalData()),
      tap((data) => {
        if (!data) return;
        this.recentStreams.set(data.recentStreams);
        // Solo usamos el live del JSON mientras el sondeo directo no haya
        // confirmado nada todavía (evita parpadeos y datos desfasados).
        if (!this.liveDirectlyKnown) {
          this.liveStream.set(data.liveStream);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    // 2) Sondeo directo del directo: método FIABLE basado en
    //    liveStreamingDetails (no en search?eventType=live, que tiene mucha
    //    latencia de indexado y fallaba al iniciar las retransmisiones).
    this.live$ = timer(0, this.livePollMs).pipe(
      switchMap(() => this.fetchLiveRobust()),
      tap((live) => {
        // `undefined` significa "no se pudo comprobar" (error/cuota): en ese
        // caso NO tocamos la señal y mantenemos el respaldo del JSON.
        if (live === undefined) return;
        this.liveDirectlyKnown = true;
        this.liveStream.set(live);
      }),
      map((live) => (live === undefined ? this.liveStream() : live)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Activa la carga (suscripción interna). Llamar una vez al iniciar la app/home. */
  start(): void {
    this.data$.subscribe();
    this.live$.subscribe();
  }

  private fetchLocalData(): Observable<YtStaticData | null> {
    // Sin cache-buster: dejamos que el CDN de GitHub sirva la versión cacheada
    // (TTL ~5 min). Esto reduce a la mitad el tiempo de carga inicial.
    return this.http.get<YtStaticData>(this.jsonEndpoint).pipe(
      catchError((err) => {
        console.warn('⚠️ Falló el JSON estático de YouTube. Aplicando fallback con API directa.', err.message);
        return this.triggerApiFallback();
      })
    );
  }

  /** --- FALLBACK del JSON estático: recientes vía API directa (playlistItems) --- */
  private triggerApiFallback(): Observable<YtStaticData | null> {
    // El live ya lo cubre `fetchLiveRobust()` en su propio sondeo, así que aquí
    // solo recuperamos los vídeos recientes (1 unidad de cuota).
    return this.fetchRecentFromApi().pipe(
      map((recentStreams) => ({
        updatedAt: new Date().toISOString(),
        liveStream: null,
        recentStreams,
      })),
    );
  }

  /**
   * Detección FIABLE de "en directo ahora":
   *  1. `playlistItems` (part=contentDetails) de la playlist de subidas (UU…)
   *     para obtener los IDs de los últimos vídeos. → 1 unidad.
   *  2. `videos` (part=snippet,liveStreamingDetails) sobre esos IDs y se busca
   *     `snippet.liveBroadcastContent === 'live'`. → 1 unidad.
   *
   * Devuelve el vídeo en directo, `null` si no hay ninguno, o `undefined` si
   * no se pudo comprobar (error de red/cuota) para no pisar el respaldo.
   */
  private fetchLiveRobust(): Observable<YouTubeVideo | null | undefined> {
    const uploadsPlaylistId = this.config.youtubeChannelId.replace(/^UC/, 'UU');
    const plParams = new URLSearchParams({
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: '6',
      key: this.config.youtubeApiKey,
    });

    return this.http.get<YtPlaylistContentResponse>(`${this.playlistEndpoint}?${plParams.toString()}`).pipe(
      switchMap((pl) => {
        const ids = (pl.items ?? [])
          .map((it) => it.contentDetails?.videoId)
          .filter((id): id is string => !!id);

        if (!ids.length) return of<YouTubeVideo | null | undefined>(null);

        const vParams = new URLSearchParams({
          part: 'snippet,liveStreamingDetails',
          id: ids.join(','),
          maxResults: String(ids.length),
          key: this.config.youtubeApiKey,
        });

        return this.http.get<YtVideosResponse>(`${this.videosEndpoint}?${vParams.toString()}`).pipe(
          map((res) => {
            const liveItem = (res.items ?? []).find(
              (it) =>
                it.snippet?.liveBroadcastContent === 'live' &&
                !it.liveStreamingDetails?.actualEndTime,
            );
            if (!liveItem?.id || !liveItem.snippet) return null;
            return {
              id: liveItem.id,
              title: liveItem.snippet.title ?? '',
              publishedAt:
                liveItem.liveStreamingDetails?.actualStartTime ??
                liveItem.snippet.publishedAt ??
                '',
              thumbnail:
                liveItem.snippet.thumbnails?.high?.url ??
                liveItem.snippet.thumbnails?.medium?.url ??
                liveItem.snippet.thumbnails?.default?.url ??
                '',
              url: `https://www.youtube.com/watch?v=${liveItem.id}`,
            } satisfies YouTubeVideo;
          }),
          catchError((err) => {
            console.error('❌ Endpoint /videos (live) falló.', err);
            return of<YouTubeVideo | null | undefined>(undefined);
          }),
        );
      }),
      catchError((err) => {
        console.error('❌ Endpoint /playlistItems (live) falló.', err);
        return of<YouTubeVideo | null | undefined>(undefined);
      }),
    );
  }

  private fetchRecentFromApi(): Observable<YouTubeVideo[]> {
    // Convertimos el channel ID ('UC...') en playlist de subidas ('UU...')
    const uploadsPlaylistId = this.config.youtubeChannelId.replace(/^UC/, 'UU');

    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '5',
      key: this.config.youtubeApiKey,
    });

    // /playlistItems cuesta 1 sola unidad. Super optimizado.
    return this.http.get<YtSearchResponse>(`${this.playlistEndpoint}?${params.toString()}`).pipe(
      map(res => this.mapItems(res)),
      catchError(err => {
        console.error('❌ Endpoint Recientes (/playlistItems) excedió cuota', err);
        return of([]);
      })
    );
  }

  private mapItems(res: YtSearchResponse): YouTubeVideo[] {
    return (res.items ?? [])
      .map((it) => {
        // En /search el ID viene en id.videoId
        // En /playlistItems el ID viene en snippet.resourceId.videoId
        const id = it.id?.videoId || it.snippet?.resourceId?.videoId;
        const sn = it.snippet;
        if (!id || !sn) return null;
        
        const thumb =
          sn.thumbnails?.high?.url ??
          sn.thumbnails?.medium?.url ??
          sn.thumbnails?.default?.url ??
          '';
          
        return {
          id,
          title: sn.title ?? '',
          publishedAt: sn.publishedAt ?? '',
          thumbnail: thumb,
          url: `https://www.youtube.com/watch?v=${id}`,
        } satisfies YouTubeVideo;
      })
      .filter((v): v is YouTubeVideo => v !== null);
  }
}
