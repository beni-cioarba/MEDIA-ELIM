import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, filter, of, shareReplay, timer, map } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CHURCH_CONFIG } from './church.config';
import { LoggerService } from './services/logger.service';
import { ScheduleService } from './services/schedule.service';
import { PresentationService } from './presentation.service';

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

/**
 * Tic base de las dos cadenas de sondeo. El ritmo real lo decide un filtro,
 * no el intervalo, para poder cambiarlo sin resuscribir.
 */
const TIC_BASE_MS = 60_000;

/** Lo que cuesta una comprobación de directo: `playlistItems` + `videos`. */
const UNIDADES_POR_COMPROBACION = 2;

/**
 * Techo diario de unidades que **este navegador** puede gastar.
 *
 * La cuota de la API son 10.000 unidades al día para toda la iglesia, y se
 * consumen por pestaña abierta: sin un tope, basta un portátil olvidado con
 * la pantalla de transmisiones abierta para arrasarla, y se arrasaría un
 * domingo por la mañana, que es justo cuando hace falta.
 *
 * La cuenta: una ventana son 135 minutos (15 antes + 120) y a un minuto por
 * comprobación salen 270 unidades. El peor día legítimo es un domingo con sus
 * dos cultos —540— y aún cabe un evento extra el mismo día —810—. 900 cubre
 * eso con margen y sigue siendo el 9 % de la cuota diaria.
 *
 * Al agotarlo, la comprobación se apaga hasta mañana y el estado de directo lo
 * sigue dando el JSON estático, que no cuesta nada: se pierde inmediatez,
 * nunca la función.
 */
const TECHO_DIARIO_UNIDADES = 900;

/** Clave del contador en `localStorage`. Lleva el día para caducar solo. */
const CLAVE_PRESUPUESTO = 'elim.youtube.cuota';

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
  private readonly log = inject(LoggerService).prefix('youtube');

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

  private readonly schedule = inject(ScheduleService);
  private readonly presentation = inject(PresentationService);

  /*
   * ── Ritmos ──────────────────────────────────────────────────────────
   *
   * Dos fuentes con dos economías opuestas:
   *
   *  · **JSON estático** (CDN de GitHub): gratis. Se puede apretar todo lo
   *    que haga falta; el único límite real es cada cuánto lo regenera el
   *    GitHub Action del repo de medios.
   *  · **API de YouTube**: 2 unidades por comprobación, **por pestaña
   *    abierta**, sobre un total de 10.000 al día para toda la iglesia.
   *
   * Por eso la aceleración durante los cultos se aplica a la fuente gratis en
   * todas las pantallas, y la de pago se reserva —y encima se reduce— para
   * los momentos en los que puede haber directo.
   */

  /** JSON fuera de ventana: no cambia nada entre cultos. */
  private readonly jsonLentoMs = 5 * 60_000;

  /** JSON en ventana de culto: gratis, así que se aprieta. */
  private readonly jsonRapidoMs = 60_000;

  /**
   * API dentro de la ventana de culto. Antes eran 2 minutos **todo el día**;
   * ahora es un minuto, pero sólo durante las horas en que puede haber
   * emisión.
   */
  private readonly liveVentanaMs = 60_000;

  /**
   * **Fuera de la ventana no se llama a la API.** Es el cambio que de verdad
   * protege la cuota: una pestaña olvidada pasaba de gastar 1.440 unidades al
   * día (2 cada 2 minutos, 24 horas) a gastar como mucho 480 un domingo con
   * dos cultos. Fuera de esas horas manda el JSON, que ya trae el estado de
   * directo y no cuesta nada.
   */
  private readonly liveFueraMs = Number.POSITIVE_INFINITY;

  private readonly data$: Observable<YtStaticData | null>;
  private readonly live$: Observable<YouTubeVideo | null>;

  constructor() {
    // 1) JSON estático: fuente de los vídeos recientes y respaldo del live.
    //    Regenerado por GitHub Actions y servido por el CDN de GitHub.
    /*
     * Un tic base de un minuto para las dos cadenas, y cada una decide en el
     * filtro si le toca. Así el ritmo puede cambiar al entrar o salir de una
     * ventana de culto **sin resuscribir nada**, que es donde se cuelan los
     * fallos: un `switchMap` sobre el intervalo perdería la emisión en curso
     * justo al cruzar la frontera.
     */
    this.data$ = timer(0, TIC_BASE_MS).pipe(
      filter((ciclo) => ciclo === 0 || this.pestanaVisible()),
      filter(() => this.tocaSondear('json', this.schedule.enVentanaDeCulto() ? this.jsonRapidoMs : this.jsonLentoMs)),
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
    this.live$ = timer(0, TIC_BASE_MS).pipe(
      /*
       * Con la pestaña en segundo plano no se sondea: una pestaña olvidada
       * gastaba 60 unidades a la hora para refrescar algo que nadie mira.
       *
       * **El ciclo 0 se deja pasar siempre.** Una pestaña abierta con el
       * botón central nace oculta, así que filtrar también la primera carga
       * dejaba la página en blanco hasta que el usuario la mirase y encima
       * esperase al siguiente ciclo. Lo que se ahorra es el sondeo
       * *repetido*, no el arranque.
       *
       * Al volver a primer plano no hace falta nada: el temporizador sigue su
       * marcha y el siguiente ciclo actualiza.
       */
      filter((ciclo) => ciclo === 0 || this.pestanaVisible()),
      filter(() => this.debeComprobarDirecto()),
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

  private jsonArrancado = false;
  private liveArrancado = false;

  /**
   * Activa la carga. **El modo decide cuánta cuota se gasta.**
   *
   * ── El problema ───────────────────────────────────────────────────
   * El sondeo directo del directo cuesta **2 unidades cada 2 minutos y por
   * pestaña abierta** (`playlistItems` + `videos`), y la clave es la misma
   * para todos los visitantes. Con la cuota por defecto de la API de YouTube
   * —10.000 unidades al día— eso son unas **166 horas de pestaña abierta**:
   * cien personas con la web abierta durante un culto de una hora se comen
   * 6.000 unidades de una sentada.
   *
   * Y lo peor no es quedarse sin cuota, sino **cuándo**: se agotaría un
   * domingo a media mañana, que es justo cuando hay directo que anunciar.
   *
   * ── El reparto ────────────────────────────────────────────────────
   *  · `'ligero'` (**portada**): sólo el JSON estático, servido por el CDN de
   *    GitHub. **Cero unidades de cuota**, y trae las dos cosas —las últimas
   *    emisiones y si hay directo—. El aviso de directo llega con el retraso
   *    del JSON (la cadencia del GitHub Action más la caché del CDN), que
   *    para un culto de una o dos horas no se nota.
   *  · `'completo'` (**transmisiones y escenario**): además, el sondeo directo
   *    cada dos minutos. Lo gasta sólo quien está en la página de las
   *    emisiones, que es donde la inmediatez importa y donde hay mucha menos
   *    gente que en la portada.
   *
   * Es idempotente y **se puede subir de modo**: si alguien entra por la
   * portada y luego va a transmisiones, el sondeo directo se añade entonces.
   */
  start(modo: 'ligero' | 'completo' = 'completo'): void {
    if (!this.jsonArrancado) {
      this.jsonArrancado = true;
      this.data$.subscribe();
    }

    if (modo === 'completo' && !this.liveArrancado) {
      this.liveArrancado = true;
      this.live$.subscribe();
    }
  }

  /**
   * ¿Se puede gastar cuota ahora mismo comprobando el directo?
   *
   * Las cuatro puertas van juntas y en una sola decisión con nombre, en vez
   * de repartidas en filtros sueltos: es **una** regla de negocio —cuándo
   * vale la pena pagar por saber si hay directo— y leerla entera importa más
   * que verla declarativa. Están ordenadas de más barata a más cara de
   * comprobar.
   *
   *  1. **Sólo la pantalla de proyección.** Es la única superficie con un
   *     número acotado de instancias: una, la del templo. El techo por
   *     navegador no acota el total —veinte pestañas suman veinte techos—,
   *     así que lo que de verdad hace imposible quedarse sin cuota es que el
   *     público no llame a la API. En la portada y en transmisiones el estado
   *     de directo lo da el JSON estático, que durante los cultos se refresca
   *     cada minuto y no cuesta nada.
   *  2. **Sólo dentro de la ventana de culto.** El resto del día no hay
   *     emisión que detectar antes que el JSON.
   *  3. **Sólo con presupuesto.** Red de seguridad para una pantalla que se
   *     quede encendida días.
   *  4. **Sólo si toca por ritmo** (y esto consume el turno, así que va al
   *     final: si alguna de las anteriores dice que no, el reloj no se mueve).
   */
  private debeComprobarDirecto(): boolean {
    return (
      this.presentation.isFullscreen() &&
      this.schedule.enVentanaDeCulto() &&
      this.hayPresupuesto() &&
      this.tocaSondear('live', this.liveVentanaMs) &&
      this.registrarGasto()
    );
  }

  /** Apunta el gasto y deja pasar. Devuelve `true` siempre: es el último paso. */
  private registrarGasto(): boolean {
    this.gastar(UNIDADES_POR_COMPROBACION);
    return true;
  }

  /** Marca de tiempo del último sondeo de cada cadena. */
  private readonly ultimoSondeo: Record<'json' | 'live', number> = { json: 0, live: 0 };

  /**
   * ¿Le toca ya a esta cadena, según el ritmo que quiera ahora mismo?
   *
   * Se compara contra el reloj y no contra un contador de tics porque el
   * ritmo cambia sobre la marcha al entrar y salir de la ventana de culto.
   */
  private tocaSondear(cadena: 'json' | 'live', intervaloMs: number): boolean {
    if (!Number.isFinite(intervaloMs)) return false;
    const ahora = Date.now();
    // Se resta medio tic para no perder un ciclo por unos milisegundos de
    // desfase del temporizador.
    if (ahora - this.ultimoSondeo[cadena] < intervaloMs - TIC_BASE_MS / 2) return false;
    this.ultimoSondeo[cadena] = ahora;
    return true;
  }

  // ── Presupuesto de cuota ─────────────────────────────────────────────

  /** Gasto de hoy en este navegador, o 0 si el contador es de otro día. */
  private gastoDeHoy(): number {
    try {
      const crudo = localStorage.getItem(CLAVE_PRESUPUESTO);
      if (!crudo) return 0;
      const { dia, unidades } = JSON.parse(crudo) as { dia: string; unidades: number };
      return dia === this.hoy() ? Number(unidades) || 0 : 0;
    } catch {
      // `localStorage` puede fallar (ventana privada, cookies bloqueadas).
      // Sin contador no se puede garantizar el techo, así que se asume
      // gastado: mejor perder inmediatez que arriesgar la cuota.
      return TECHO_DIARIO_UNIDADES;
    }
  }

  private hayPresupuesto(): boolean {
    const gastado = this.gastoDeHoy();
    if (gastado + UNIDADES_POR_COMPROBACION <= TECHO_DIARIO_UNIDADES) return true;
    if (!this.avisadoDelTecho) {
      this.avisadoDelTecho = true;
      this.log.warn(
        `Techo diario de cuota alcanzado (${gastado}/${TECHO_DIARIO_UNIDADES}). ` +
          'El directo se seguirá detectando por el JSON estático.',
      );
    }
    return false;
  }

  private avisadoDelTecho = false;

  private gastar(unidades: number): void {
    try {
      localStorage.setItem(
        CLAVE_PRESUPUESTO,
        JSON.stringify({ dia: this.hoy(), unidades: this.gastoDeHoy() + unidades }),
      );
    } catch {
      /* Sin `localStorage` no se puede contar; `gastoDeHoy` ya cierra el paso. */
    }
  }

  private hoy(): string {
    const f = new Date();
    return `${f.getFullYear()}-${f.getMonth() + 1}-${f.getDate()}`;
  }

  /** ¿Hay alguien delante? (`document.hidden` en una pestaña en segundo plano). */
  private pestanaVisible(): boolean {
    return typeof document === 'undefined' || !document.hidden;
  }

  private fetchLocalData(): Observable<YtStaticData | null> {
    // Sin cache-buster: dejamos que el CDN de GitHub sirva la versión cacheada
    // (TTL ~5 min). Esto reduce a la mitad el tiempo de carga inicial.
    return this.http.get<YtStaticData>(this.jsonEndpoint).pipe(
      catchError((err: unknown) => {
        this.log.warn('JSON estático no disponible; usando la API directa.', err);
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
          catchError((err: unknown) => {
            this.log.error('Endpoint /videos (live) falló.', err);
            return of<YouTubeVideo | null | undefined>(undefined);
          }),
        );
      }),
      catchError((err: unknown) => {
        this.log.error('Endpoint /playlistItems (live) falló.', err);
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
      catchError((err: unknown) => {
        this.log.error('Endpoint de recientes (/playlistItems) falló o excedió cuota.', err);
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
