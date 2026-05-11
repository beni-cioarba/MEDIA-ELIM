import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, timer } from 'rxjs';
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

/** Respuesta cruda de YouTube Data API v3 — sólo tipamos lo que usamos. */
interface YtSearchResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
}

/**
 * Servicio que encapsula el acceso a YouTube Data API v3.
 *
 * Expone dos signals reactivas:
 *  - `liveStream`     — vídeo en directo ahora mismo (o `null`).
 *  - `recentStreams`  — últimas 5 transmisiones completadas.
 *
 * Estrategia de cuota:
 *  - Live: refresca cada 60 s (~1.440 calls/día = 144.000 unidades). Para
 *    quedar dentro de los 10.000/día gratis, se podría subir a 5 min en
 *    producción si la quota apretara. Por ahora 60 s da inmediatez.
 *  - Recientes: refresca cada 30 min (48 calls/día).
 *
 * En caso de error de red o cuota agotada se devuelven listas vacías y
 * `null` respectivamente, sin romper la UI.
 */
@Injectable({ providedIn: 'root' })
export class YouTubeService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CHURCH_CONFIG);

  private readonly endpoint = 'https://www.googleapis.com/youtube/v3/search';

  readonly liveStream = signal<YouTubeVideo | null>(null);
  readonly recentStreams = signal<YouTubeVideo[]>([]);

  private readonly live$: Observable<YouTubeVideo | null>;
  private readonly recent$: Observable<YouTubeVideo[]>;

  constructor() {
    // Polling con `timer` para evitar setInterval manual y para que
    // `shareReplay` cachee el último valor a nuevos suscriptores.
    this.live$ = timer(0, 60_000).pipe(
      switchMap(() => this.fetchLive()),
      tap((v) => this.liveStream.set(v)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.recent$ = timer(0, 30 * 60_000).pipe(
      switchMap(() => this.fetchRecent()),
      tap((list) => this.recentStreams.set(list)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /** Activa la carga (suscripción interna). Llamar una vez al iniciar la app/home. */
  start(): void {
    this.live$.subscribe();
    this.recent$.subscribe();
  }

  private fetchLive(): Observable<YouTubeVideo | null> {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: this.config.youtubeChannelId,
      eventType: 'live',
      type: 'video',
      maxResults: '1',
      key: this.config.youtubeApiKey,
    });
    return this.http.get<YtSearchResponse>(`${this.endpoint}?${params.toString()}`).pipe(
      switchMap((res) => of(this.mapItems(res)[0] ?? null)),
      catchError(() => of(null)),
    );
  }

  private fetchRecent(): Observable<YouTubeVideo[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: this.config.youtubeChannelId,
      eventType: 'completed',
      type: 'video',
      order: 'date',
      maxResults: '5',
      key: this.config.youtubeApiKey,
    });
    return this.http.get<YtSearchResponse>(`${this.endpoint}?${params.toString()}`).pipe(
      switchMap((res) => of(this.mapItems(res))),
      catchError(() => of([])),
    );
  }

  private mapItems(res: YtSearchResponse): YouTubeVideo[] {
    return (res.items ?? [])
      .map((it) => {
        const id = it.id?.videoId;
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
