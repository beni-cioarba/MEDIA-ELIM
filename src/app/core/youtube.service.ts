import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, timer, combineLatest, map } from 'rxjs';
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

/** Respuesta cruda de YouTube Data API v3 — sólo tipamos lo que usamos. */
interface YtSearchResponse {
  items?: Array<{
    id?: { videoId?: string };         // Usado por /search
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string }; // Usado por /playlistItems
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
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
  private readonly searchEndpoint = 'https://www.googleapis.com/youtube/v3/search';
  private readonly playlistEndpoint = 'https://www.googleapis.com/youtube/v3/playlistItems';

  readonly liveStream = signal<YouTubeVideo | null>(null);
  readonly recentStreams = signal<YouTubeVideo[]>([]);

  private readonly data$: Observable<YtStaticData | null>;

  constructor() {
    // Polling del archivo JSON estático cada 60s
    this.data$ = timer(0, 60_000).pipe(
      switchMap(() => this.fetchLocalData()),
      tap((data) => {
        if (data) {
          this.liveStream.set(data.liveStream);
          this.recentStreams.set(data.recentStreams);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Activa la carga (suscripción interna). Llamar una vez al iniciar la app/home. */
  start(): void {
    this.data$.subscribe();
  }

  private fetchLocalData(): Observable<YtStaticData | null> {
    const cacheBuster = `?t=${new Date().getTime()}`;
    return this.http.get<YtStaticData>(`${this.jsonEndpoint}${cacheBuster}`).pipe(
      catchError((err) => {
        console.warn('⚠️ Falló la Solución 3 (JSON estático). Aplicando PARCHE TÉCNICO de rescate con API directa.', err.message);
        return this.triggerApiFallback();
      })
    );
  }

  /** --- FALLBACK (Solución Temporal 1 y 2 juntas) --- */
  private triggerApiFallback(): Observable<YtStaticData | null> {
    // Para evitar pollear la API 1 vez por minuto en el fallback como dicta la Sol1, 
    // controlaremos la frecuencia manualmente a nivel frontend limitando las peticiones si ya tenemos info reciente.
    // Solo llamamos a la API si ha pasado un buen rato, o delegamos el cron de RxJS.
    // Aquí implementamos la Solución 2: usar playlistItems (1 unidad) para recientes.
    return combineLatest([
      this.fetchLiveFromApi(),
      this.fetchRecentFromApi()
    ]).pipe(
      map(([liveStream, recentStreams]) => ({
        updatedAt: new Date().toISOString(),
        liveStream,
        recentStreams
      }))
    );
  }

  private fetchLiveFromApi(): Observable<YouTubeVideo | null> {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: this.config.youtubeChannelId,
      eventType: 'live',
      type: 'video',
      maxResults: '1',
      key: this.config.youtubeApiKey,
    });
    // /search cuesta 100 unidades (Aceptable si se ejecuta el fallback de emergencia)
    return this.http.get<YtSearchResponse>(`${this.searchEndpoint}?${params.toString()}`).pipe(
      map(res => this.mapItems(res)[0] || null),
      catchError(err => {
        console.error('❌ Endpoint Live (/search) excedió cuota.', err);
        return of(null);
      })
    );
  }

  private fetchRecentFromApi(): Observable<YouTubeVideo[]> {
    // Solucion 2: Convertimos el channel ID ('UC...') en playlist ID ('UU...')
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
