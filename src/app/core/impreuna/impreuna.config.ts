/**
 * Proiectul Împreună — enlaces y datos fijos del proyecto (no generados).
 *
 * Lo generado (lecturas de cada día, vídeos ya publicados) está en `data/` y
 * lo escribe `npm run impreuna:sync`. Auditoría de las fuentes y receta para
 * una edición nueva: `docs/ai/32-impreuna.md`.
 */

/** Web oficial del proyecto (WordPress: una entrada por día con vídeo y motivos de oración). */
export const IMPREUNA_SITE = 'https://proiectulimpreuna.ro/';

/** API REST de esa web: la página completa los vídeos que aún no están en `data/`. */
export const IMPREUNA_WP_API = 'https://proiectulimpreuna.ro/wp-json/wp/v2/posts';

/** Entrada de un día en la web del proyecto (WordPress redirige `?p=` a su URL). */
export const impreunaPostUrl = (postId: number): string => `${IMPREUNA_SITE}?p=${postId}`;

/**
 * Lista de subidas del canal del Cult (`UU` + id del canal
 * `UCqKwJYXPbht3Oh0riWfT1bg`, verificado con la API el 12/11/2026). Es la
 * **fuente principal** del vídeo del día: lo suben a las 22:15 UTC (23:15 en
 * España) con el título «Ziua 316 Paul Răducanu», horas antes de que la web
 * del proyecto publique su entrada.
 */
export const IMPREUNA_YOUTUBE_UPLOADS = 'UUqKwJYXPbht3Oh0riWfT1bg';

/** `playlistItems.list` de la YouTube Data API v3 (1 unidad de cuota por llamada). */
export const YOUTUBE_PLAYLIST_ITEMS_API = 'https://www.googleapis.com/youtube/v3/playlistItems';

/** Canal de YouTube del Cultul Creștin Penticostal, donde se publica cada meditación. */
export const IMPREUNA_YOUTUBE = {
  channel: 'https://www.youtube.com/@cultulcrestinpenticostal',
  videos: 'https://www.youtube.com/@cultulcrestinpenticostal/videos',
  subscribe: 'https://www.youtube.com/@cultulcrestinpenticostal?sub_confirmation=1',
  watch: (id: string): string => `https://www.youtube.com/watch?v=${id}`,
  /**
   * Reproductor sin cookies hasta que se pulsa (y sólo entonces se carga):
   * la página no habla con YouTube si nadie reproduce.
   */
  embed: (id: string): string => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
  /**
   * Miniaturas, de mejor a peor. Medido (11/2026, 7 vídeos repartidos por el
   * año): este canal **no tiene** `hq720` ni `maxresdefault` (404), así que no
   * se piden. `sddefault` (640 × 480) sí: lleva franjas negras arriba y abajo
   * que el `object-fit: cover` del marco 16:9 recorta justas. `mqdefault`
   * existe siempre. Ojo: el 404 de YouTube es una imagen gris de 120 × 90 y no
   * dispara `error`; el componente mira el ancho al cargar.
   */
  thumbs: (id: string): readonly string[] =>
    ['sddefault', 'mqdefault'].map((size) => `https://i.ytimg.com/vi/${id}/${size}.jpg`),
} as const;

/** Plan de lectura en YouVersion (la app Biblia) que sigue el proyecto. */
export const youversionPlanUrl = (planId: number): string => `https://www.bible.com/reading-plans/${planId}`;
export const youversionDayUrl = (planId: number, day: number): string =>
  `https://www.bible.com/reading-plans/${planId}/day/${day}`;

/** Cultul Creștin Penticostal (organiza el proyecto). */
export const IMPREUNA_CULT_URL = 'https://cultulpenticostal.ro/';

/**
 * Fuente oficial del **ayuno del primer jueves**: el artículo del presidente
 * del Cult que lo convoca y dice para qué se ayuna («Postul Împreună»). Los
 * cinco motivos generales de la página (`impreuna.fast.purpose_*`) lo resumen.
 */
export const IMPREUNA_FAST_SOURCE = 'https://cultulpenticostal.ro/proiectul-impreuna-punct-si-de-la-capat/';

/** El tema concreto de un día de ayuno, cuando el Cult lo publica. */
export interface FastingTheme {
  /** El primer jueves del mes, `YYYY-MM-DD`. */
  readonly date: string;
  /** Tema de la convocatoria, en rumano (como los anuncios: no se traduce). */
  readonly theme: string;
  /** Motivos de oración concretos; sin ellos se muestran los cinco generales. */
  readonly reasons?: readonly string[];
  /** Dónde se publicó (post de Facebook, vídeo de YouTube…). */
  readonly source?: string;
}

/**
 * Temas del ayuno mensual. **Se rellena a mano**: el Cult publica la
 * «chemarea lunară la post» sólo en Facebook y YouTube, que no se pueden
 * leer de forma automática (Facebook pide sesión; YouTube, consentimiento de
 * cookies). Sin entrada para un día, la página muestra el motivo general.
 *
 * Ejemplo:
 *   { date: '2026-12-03', theme: 'Pentru familiile din biserici',
 *     reasons: ['…', '…'], source: 'https://www.facebook.com/…' },
 */
export const IMPREUNA_FASTING_THEMES: readonly FastingTheme[] = [];

/**
 * **Amintire zilnică** (web push con OneSignal): hora de envío y etiqueta con
 * que se apunta cada suscripción.
 *
 *  · `hour` + `timeZone`: sale a las 08:00 **de España** (la hora de la
 *    iglesia), a todos a la vez; quien esté en Rumanía la ve a las 09:00. No se
 *    usa la entrega por zona horaria de OneSignal: no consta que entre en su
 *    plan gratuito y, si el aviso se crea tarde, lo deja para el día siguiente.
 *  · `topic`: etiqueta de OneSignal cuyo valor es el idioma (`impreuna: 'ro'`):
 *    una sola etiqueta dice que la quiere y en qué idioma (el plan gratuito
 *    admite 6).
 *
 * La usan el interruptor (`features/impreuna/reminder/`) y el envío diario
 * (`scripts/impreuna-push.mjs`, GitHub Action). docs/ai/32-impreuna.md.
 */
export const IMPREUNA_REMINDER = {
  topic: 'impreuna',
  hour: 8,
  timeZone: 'Europe/Madrid',
} as const;

/** Año en que empezó el proyecto: 2026 es su cuarta edición. */
export const IMPREUNA_SINCE = 2023;

/** Calendario de la edición, por idioma (lo genera el script en `assets/calendars/`). */
export const impreunaCalendarFile = (year: number, lang: 'ro' | 'es'): string =>
  `impreuna-${year}-${lang}.ics`;
