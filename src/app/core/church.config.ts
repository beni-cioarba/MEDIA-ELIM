import { InjectionToken } from '@angular/core';
import { SocialLink } from './social-link.model';
import { IconName } from './ui/icon-name';
import type { DepartmentId } from './navigation/app-paths';
import type { MonthlyRule } from './util/recurrence';
import { ANNOUNCEMENTS } from './content/announcements.content';
import { UPCOMING_EVENTS } from './content/events.content';
import { WEEKLY_PROGRAM, REHEARSALS } from './content/weekly.content';
import { MEDIA_GALLERY_URL, MEDIA_EVENTS } from './content/gallery.content';
import { ABOUT_IMAGE, HERO_SLIDES } from './content/photos.content';
import { PUBLIC_URL } from './site';

/**
 * Evento del directorio público de fotos/vídeos de la iglesia.
 * Cada uno se corresponde con una subcarpeta de Google Drive y se
 * representa visualmente con un gradient + icono + i18n key para nombre.
 */
export interface MediaEvent {
  readonly id: string;
  /** Sub-clave dentro de `gallery.events.*` (name, date) en los JSON i18n. */
  readonly i18nKey: string;
  /** Imagen representativa principal (1600px webp). */
  readonly image: string;
  /** Variante intermedia (960px webp): la que se sirve en móvil. */
  readonly medium: string;
  /** Variante miniatura (480px webp) para el grid del mosaico. */
  readonly thumb: string;
  /** Color medio de la foto, medido con canvas (fondo mientras carga). */
  readonly tone: string;
  /** Gradient de fondo de la card como tinte de color de marca [from, to]. */
  readonly gradient: readonly [string, string];
  /**
   * ID de la subcarpeta pública de Drive del evento (lo que va tras
   * `/drive/folders/` en su enlace). Sólo el ID, nunca la URL: la construye
   * `driveFolderUrl()`. Si falta o no es válido, el botón abre la carpeta
   * principal (`mediaGalleryUrl`). Lo verifica `npm run check:drive`.
   */
  readonly driveFolderId?: string;
  /**
   * Fecha `YYYY-MM-DD` de esta edición. Obligatoria cuando el álbum tiene
   * `pastEditions`: con ella se rotula cada edición en el selector.
   */
  readonly date?: string;
  /**
   * Ediciones anteriores del mismo álbum (los bautizos de otros años, cada
   * concierto de colinde…), **de la más reciente a la más antigua**. La
   * entrada en sí es siempre la edición más reciente: es la que se ve al
   * llegar al álbum, la portada del menú y la del resumen de Media. Ver
   * `docs/ai/40-styling.md` § Galería → «Álbumes con ediciones».
   */
  readonly pastEditions?: readonly MediaEdition[];
}

/**
 * Una edición pasada de un álbum de la galería (`MediaEvent.pastEditions`).
 * Mismos campos de imagen y carpeta que el álbum; el nombre es el del álbum
 * y la fecha se rotula a partir de `date` en el idioma activo.
 */
export interface MediaEdition {
  readonly id: string;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly image: string;
  readonly medium: string;
  readonly thumb: string;
  readonly tone: string;
  readonly driveFolderId?: string;
}

/**
 * Configuración estática de la iglesia.
 *
 * Centralizar aquí URLs y datos no traducibles (handles, IDs de YouTube…)
 * permite a un no-desarrollador actualizar el contenido sin tocar plantillas.
 * Los textos visibles viven en `assets/i18n/*.json`.
 */
/**
 * Día de la semana (formato compatible con `Date.getDay()`):
 * 0=Duminică, 1=Luni, 2=Marți, 3=Miercuri, 4=Joi, 5=Vineri, 6=Sâmbătă.
 *
 * Centralizar la representación en numérico permite calcular fácilmente
 * "es hoy" sin depender del idioma activo.
 */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Slot de la programación semanal recurrente de la iglesia.
 * Los textos visibles se mantienen en `church.config.ts` (no traducibles
 * porque cada cuvant/predica es propia del servicio); las etiquetas UI
 * (cabecera, badges) sí van por i18n.
 */
export interface WeeklyProgram {
  readonly id: string;
  readonly day: WeekDay;
  /** Etiqueta del día tal como aparece (ej: "Luni", "Duminică"). */
  readonly dayLabel: string;
  /** Hora en formato libre (ej: "20:30" sau "10:00 & 18:00"). */
  readonly time: string;
  readonly title: string;
  readonly description: string;
  /**
   * Excepciones mensuales fijas: en la ocurrencia de `rule` (p. ej. el primer
   * domingo), la sesión de `time` se llama `title` en vez del título de
   * siempre. `time` debe ser una de las horas de `time` del día: no añade
   * cultos, sólo los renombra. `ScheduleService` lo resuelve por fecha, así
   * que la portada, el programa, la proyección y la cuenta atrás lo dicen
   * todos a la vez.
   */
  readonly monthly?: readonly WeeklyMonthlySession[];
}

/**
 * Repetiții (ensayos) en la iglesia. Sólo se enseñan en la página del
 * programa semanal (`/media/program`), en un bloque aparte: no son cultos,
 * no entran en la cuenta atrás, la portada ni la proyección.
 */
export interface Rehearsal {
  readonly id: string;
  /** Quién ensaya, tal como se lee («Cor», «Fanfară»). */
  readonly group: string;
  /** Matiz de la fila («săptămână intensivă»). Opcional. */
  readonly label?: string;
  /** Departamento al que enlaza la fila. */
  readonly department?: DepartmentId;
  /** Días y hora, en el orden de la semana («Luni – Vineri» · «19:00»). */
  readonly slots: readonly { readonly days: string; readonly time: string }[];
  /**
   * Sólo la última semana de cada mes: de lunes al último sábado del mes.
   * La web calcula las fechas y marca la fila cuando toca.
   */
  readonly lastWeekOfMonth?: boolean;
}

/** Sesión de un culto semanal que cambia de nombre una vez al mes. */
export interface WeeklyMonthlySession {
  readonly rule: MonthlyRule;
  readonly time: string;
  readonly title: string;
  /**
   * Departamentos del evento que se genera solo con la próxima vez que toca
   * (`ScheduleService`): sale en «Evenimente viitoare» sin cargarlo a mano.
   */
  readonly departments?: readonly DepartmentId[];
}

/**
 * Evento puntual programat în viitor (botez, evanghelizare, conferință…).
 * `date` se almacena como `YYYY-MM-DD` para permitir cálculos confiabili
 * de "días restantes" sin parsing de zonas horarias.
 */
export interface UpcomingEvent {
  readonly id: string;
  /** ISO date `YYYY-MM-DD`. Se compara contra hoy para mostrar contador. */
  readonly date: string;
  /** Hora libre (ej: "10:00", "18:00"). */
  readonly time: string;
  readonly title: string;
  readonly description: string;
  /** Versículo bíblico representativ (opțional). */
  readonly verse?: string;
  /** Nombre del predicador / predica. */
  readonly preacher?: string;
  /** Nombre del responsabil de cantare/închinare. */
  readonly worshipLead?: string;
  /**
   * Cartel del evento (el que se publica en redes), en `assets/posters/`.
   *
   * Cuando existe, **es la portada de la tarjeta**: el cartel ya lleva la
   * identidad del evento, su fecha y su invitado, y ninguna foto de archivo
   * compite con eso. Como los carteles son cuadrados o verticales y la
   * portada es 16:9, se muestran **enteros** sobre una copia desenfocada de
   * sí mismos (`promo__cover--poster`): recortarlos les cortaría el texto.
   */
  readonly poster?: string;
  /**
   * Departamentos que organizan el evento. La página de cada departamento
   * enseña sus eventos futuros (`/departamente/<slug>` → «Evenimente»).
   */
  readonly departments?: readonly DepartmentId[];
}

/**
 * Línea de una sección de anuncio.
 *  - `label`  lo que se lee («Adult», «Halas Petrică», «Sâmbătă 26, 18:00»).
 *  - `value`  el dato destacado, opcional («26 €», «Timișoara»). Se pinta a la
 *             derecha y en negrita: es lo que la gente busca con la vista.
 *  - `note`   aclaración en letra pequeña, opcional.
 */
export interface AnnouncementItem {
  readonly label: string;
  readonly value?: string;
  readonly note?: string;
}

/**
 * Cómo se maqueta una sección. Decide la relación entre `label` y `value`:
 *  - `list`      líneas sueltas; `value` como detalle en la misma línea.
 *  - `prices`    tarifa: `label` … línea de puntos … `value` (26 €).
 *  - `people`    nombres; `value` es el acompañante o el origen («cu soția»,
 *                «Timișoara»). Con más de cinco, la lista fluye en dos columnas.
 *  - `schedule`  programa: `label` es el cuándo (en negrita) y `value` el qué.
 */
export type AnnouncementSectionKind = 'list' | 'prices' | 'people' | 'schedule';

/**
 * Sección de un anuncio: un epígrafe corto y sus líneas. En proyección un
 * anuncio es **una sola diapositiva** (cartel): hasta dos secciones van en
 * columnas y con tres o más se apilan; lo que no cabe se encoge hasta el mínimo
 * legible y, si sigue sin caber, la sección que sea detalle se marca `webOnly`.
 */
export interface AnnouncementSection {
  /** Epígrafe en versalitas («Meniu», «Înscrieri la», «Invitați»). */
  readonly heading: string;
  /** Maquetación de las líneas. Por defecto `list`. */
  readonly kind?: AnnouncementSectionKind;
  readonly items: readonly AnnouncementItem[];
  /**
   * Sólo en la web (`/anunturi`), no en la proyección: para el detalle que no
   * cabe legible en el cartel (listas largas de nombres, condiciones…). Quien
   * lo quiera lo tiene a un escaneo del QR.
   */
  readonly webOnly?: boolean;
  /**
   * Parte de la proyección en la que va (1 por defecto). Si alguna sección
   * va en la 2, el anuncio se proyecta en **dos diapositivas** («1/2», «2/2»)
   * en vez de dejar texto sólo para la web. Es la excepción a «un anuncio =
   * una diapositiva»: para cuando todo el texto importa y no cabe legible en
   * una. La parte 1 lleva el resumen; la última, la nota y el versículo.
   */
  readonly part?: number;
  /**
   * Sección destacada: en proyección, panel navy a toda la altura de la
   * diapositiva (sólo con dos secciones en columnas). Para lo que se pide o el
   * dato clave («Ce cerem pentru ei»), y para que una columna más corta no
   * deje un hueco vacío debajo.
   */
  readonly highlight?: boolean;
}

/**
 * Anuncio de la congregación. Se muestra en la web (`/anunturi`, con enlace
 * propio `/anunturi/<id>`) y como diapositiva del panel de medios mientras
 * esté vigente. Es **contenido estructurado**, no texto libre: el mismo
 * modelo sirve para precios, listas de personas, programas o avisos, y el
 * renderizador garantiza que quepa en la pantalla del templo.
 *
 * El texto va en rumano y no se traduce (como el programa y los eventos):
 * son avisos propios de la iglesia.
 */
export interface Announcement {
  readonly id: string;
  /** Título corto, en una frase: es lo que se lee de lejos. */
  readonly title: string;
  /** Fecha del hecho anunciado (`YYYY-MM-DD`), si lo tiene. */
  readonly date?: string;
  /** Hora libre («18:00», «10:00 & 18:00»). */
  readonly time?: string;
  readonly place?: string;
  /** Resumen de 1-2 frases: lo que se lee en voz alta antes del programa. */
  readonly lead: string;
  readonly sections: readonly AnnouncementSection[];
  /** Nota de cierre (invitado principal, aviso importante…). */
  readonly footnote?: string;
  /**
   * Versículo de cierre.
   *
   * Campo propio y no `footnote`: el pie es una caja de aviso —fondo dorado,
   * peso 600— para lo que hay que recordar, y un texto bíblico no es un
   * aviso, es una cita. Se pinta como tal, en la serif que el sistema de
   * diseño reserva para la marca y la Escritura. Muchos anuncios de la
   * congregación terminan con uno, así que el modelo lo contempla.
   */
  readonly verse?: {
    readonly text: string;
    readonly reference: string;
  };
  /** Cartel del anuncio, si lo tiene. Mismas reglas que `UpcomingEvent.poster`. */
  readonly poster?: string;
  /**
   * Sólo en la web: el anuncio sigue en `/anunturi` y en la portada, pero no
   * sale en la presentación ni en el panel de control. Para lo que se quiere
   * tener publicado sin leerlo en el templo.
   */
  readonly webOnly?: boolean;
  /** Primer día en que se muestra (`YYYY-MM-DD`, incluido). Sin valor: ya. */
  readonly publishedOn?: string;
  /** Último día en que se muestra (`YYYY-MM-DD`, incluido). Obligatorio. */
  readonly expiresOn: string;
}

/**
 * Ubicación física de la iglesia. Centraliza la dirección y los enlaces
 * de mapa para mostrar el punto, compartir y abrir indicaciones.
 */
export interface ChurchLocation {
  /** Dirección legible completa (una sola línea). */
  readonly address: string;
  /** Localidad / referencia secundaria opcional. */
  readonly city: string;
  /** Enlace corto para compartir (maps.app.goo.gl). */
  readonly mapsShareUrl: string;
  /** Consulta usada para el mapa incrustado y las indicaciones. */
  readonly mapsQuery: string;
}

/**
 * Zona de la foto que **nunca** debe recortarse.
 *
 * Una foto de 3:2 metida en una banda panorámica siempre pierde altura: no es
 * un fallo, es geometría. Lo único que se puede decidir es *qué* se pierde.
 * Con fotos de grupo lo correcto casi siempre es `upper` (las caras están en
 * el tercio superior), que es el valor por defecto; el resto son escapes para
 * fotos con el motivo descentrado.
 */
export type ImageFocus = 'top' | 'upper' | 'center' | 'lower' | 'bottom';

/**
 * Diapositiva del carrusel de portada (hero).
 * Reutiliza las fotos ya optimizadas de `assets/drive-media/`: son imágenes
 * reales de la iglesia y no añaden peso nuevo al repositorio.
 */
export interface HeroSlide {
  readonly id: string;
  /** Sub-clave dentro de `home.hero.slides.*` (title, subtitle). */
  readonly i18nKey: string;
  /** Imagen a resolución completa (1600px webp). */
  readonly image: string;
  /** Variante intermedia (960px webp) para móviles de densidad doble. */
  readonly medium: string;
  /**
   * Variante grande (2560px webp) para pantallas anchas y de alta densidad.
   * Opcional: sólo existe si el original medía al menos 2400 px. Sin ella, en
   * un monitor de 1920 la foto de 1600 se amplía un 20-80 % y se ve blanda.
   */
  readonly large?: string;
  /** Miniatura (480px webp) usada como LQIP/preview. */
  readonly thumb: string;
  /**
   * Color medio de la foto, medido con canvas.
   *
   * Es el fondo del escenario mientras la imagen viaja por la red: en vez del
   * navy de marca —que no se parece a nada de lo que va a aparecer— se ve el
   * tono de la propia foto, así que la entrada no da un salto de color. Cuesta
   * cero bytes.
   */
  readonly tone: string;
  /** Encuadre. Por defecto `upper`; sólo se declara si la foto lo pide. */
  readonly focus?: ImageFocus;
}

/** Cifra destacada de la sección «quiénes somos». */
export interface ChurchStat {
  readonly id: string;
  /** Sub-clave dentro de `about.stats.*` (label). */
  readonly i18nKey: string;
  /** Valor mostrado tal cual (admite «25+», «7»…). */
  readonly value: string;
  readonly icon: IconName;
}

/** Departamento o ministerio de la iglesia. */
export interface Ministry {
  readonly id: string;
  /** Sub-clave dentro de `leadership.ministries.*` (name, description). */
  readonly i18nKey: string;
  readonly icon: IconName;
}

/**
 * Canales de contacto directo.
 *
 * Datos reales (ver `CHURCH_CONFIG.contact`). Los enlaces `tel:` y de
 * WhatsApp se componen con `core/util/contact-links.ts`.
 */
export interface ChurchContact {
  /** Buzón público de la iglesia. Se usa en `mailto:`. */
  readonly email: string;
  /** Teléfono en formato internacional sin espacios: alimenta `tel:`. */
  readonly phone: string;
  /** El mismo teléfono, ya formateado para leerse en pantalla. */
  readonly phoneDisplay: string;
  /** Número de WhatsApp (sólo dígitos, con prefijo país) o `null`. */
  readonly whatsapp: string | null;
  /** Horario de atención, en clave i18n bajo `contact.office.*`. */
  readonly officeHoursKey: string;
  /** Envío automático del formulario de contacto (ver `ContactFormConfig`). */
  readonly form: ContactFormConfig;
}

/**
 * Envío del formulario de contacto **sin abrir el gestor de correo**.
 *
 * La web es estática (GitHub Pages): no hay servidor propio que mande
 * correos, y una contraseña o clave privada en el bundle sería pública. Se usa
 * Web3Forms, un servicio de envío para webs estáticas:
 *  · `accessKey` es **pública por diseño**: sólo permite enviar al buzón con
 *    el que se creó (el de la iglesia); no da acceso a nada más.
 *  · El correo llega con «Responder a» = el visitante: se contesta desde el
 *    propio Gmail, sin copiar direcciones.
 *
 * Cómo obtener la clave (una vez): en https://web3forms.com, «Create Access
 * Key» con el correo de `contact.email`; llega por email y se pega aquí.
 * Mientras sea `null`, el formulario no envía y ofrece escribir directamente.
 */
export interface ContactFormConfig {
  readonly endpoint: string;
  readonly accessKey: string | null;
}

/** Una cuenta bancaria de la iglesia para donativos. */
export interface DonationAccount {
  readonly id: string;
  /** Código ISO 4217: EUR, RON, USD… Se muestra tal cual. */
  readonly currency: string;
  /** IBAN agrupado de cuatro en cuatro (así se lee y se dicta mejor). */
  readonly iban: string;
}

/**
 * Datos para donar. Igual que `ChurchContact`, los valores por defecto son
 * **de demostración** (IBAN de ceros): imposible confundirlos con reales.
 */
export interface DonationInfo {
  /** Titular de las cuentas, tal y como figura en el banco. */
  readonly holder: string;
  /** Nombre comercial del banco, o `null` si no se ha facilitado (no se pinta). */
  readonly bank: string | null;
  /** BIC / SWIFT (transferencias internacionales), o `null` si no se ha facilitado. */
  readonly bic: string | null;
  /** Teléfono asociado a Bizum, o `null` si no está dado de alta. */
  readonly bizum: string | null;
  readonly accounts: readonly DonationAccount[];
}

export interface ChurchConfig {
  readonly youtubeChannelUrl: string;
  readonly youtubeStreamsUrl: string;
  /**
   * Enlace estable a la emisión en directo del canal: YouTube lo redirige al
   * directo en curso (o al programado). Es lo que codifica el QR cuando el
   * operador activa el aviso «hoy también en directo».
   */
  readonly youtubeLiveUrl: string;
  /** YouTube channel ID (UC...). Necesario para llamadas a YouTube Data API. */
  readonly youtubeChannelId: string;
  /** API Key restringida por HTTP referrer; segura para uso en cliente. */
  readonly youtubeApiKey: string;
  /**
   * App ID de OneSignal (web push): la amintire zilnică de Proiectul Împreună.
   * Es público (va en el navegador). **Vacío = función apagada**: no se pinta
   * el interruptor ni se envía nada. La clave secreta de envío NO va aquí:
   * es el secreto `ONESIGNAL_API_KEY` de GitHub. Activación paso a paso:
   * docs/ai/32-impreuna.md → Notificaciones.
   */
  readonly oneSignalAppId: string;
  /**
   * Safari Web ID que OneSignal genera para la app (`web.onesignal.auto.…`,
   * público: va en su fragmento oficial). Sólo lo usa el Safari antiguo de
   * macOS; se pasa igual para arrancar el SDK exactamente como lo indican.
   */
  readonly oneSignalSafariWebId: string;
  /**
   * URL pública canónica (`https://elimarganda.com/`). De ella salen los QR,
   * la dirección escrita en la proyección (`publicHost`), los enlaces que se
   * comparten, `og:url` y el calendario.
   */
  readonly publicUrl: string;
  readonly socials: readonly SocialLink[];
  /** URL raíz al directorio público de fotos en Google Drive. */
  readonly mediaGalleryUrl: string;
  /** Eventos destacados del departamento de media. */
  readonly mediaEvents: readonly MediaEvent[];
  /** Programación semanal recurrente (servicii religioase fixe). */
  readonly weeklyProgram: readonly WeeklyProgram[];
  /** Repetiții de cor y fanfara (sólo en la página del programa). */
  readonly rehearsals: readonly Rehearsal[];
  /** Evenimente viitoare puntuale (botezuri, conferințe, etc.). */
  readonly upcomingEvents: readonly UpcomingEvent[];
  /**
   * Anunțuri vigentes. Cada uno se muestra en la web y se proyecta hasta su
   * `expiresOn` (incluido); después desaparece solo, no hay que borrarlo.
   */
  readonly announcements: readonly Announcement[];
  /** Ubicación física de la iglesia (mapa + dirección). */
  readonly location: ChurchLocation;
  /** Canales de contacto directo (correo, teléfono, WhatsApp). */
  readonly contact: ChurchContact;
  /** Datos bancarios para donativos. */
  readonly donations: DonationInfo;
  /** Año de fundación — se usa para calcular «años de historia». */
  readonly foundedYear: number;
  /** Diapositivas del carrusel de portada. */
  /**
   * Foto de «Nuestra historia» en la página Quiénes somos. Entrada propia y
   * no `heroSlides[0]`: reordenar el carrusel no puede cambiar la
   * ilustración de un texto que no tiene nada que ver.
   */
  readonly aboutImage: { readonly src: string; readonly srcset: string };
  readonly heroSlides: readonly HeroSlide[];
  /** Cifras destacadas de la sección «quiénes somos». */
  readonly stats: readonly ChurchStat[];
  /**
   * Departamentos / ministerios activos, en versión «invitación a servir»
   * para la portada. El organigrama real (personas y cargos) vive aparte,
   * en `leadership.config.ts`.
   */
  readonly ministries: readonly Ministry[];
}

/**
 * La configuración de la iglesia, inyectable.
 *
 * `providedIn: 'root'` con fábrica, y **no** un proveedor en `app.config.ts`:
 * así el contenido (anuncios, eventos, fotos…) sólo viaja en los chunks de
 * las páginas que lo usan, no en el arranque de todas (16/11/2026: 24 kB del
 * inicial). Los tests siguen pudiendo sustituirla con
 * `{ provide: CHURCH_CONFIG, useValue: … }`.
 */
export const CHURCH_CONFIG = new InjectionToken<ChurchConfig>('CHURCH_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_CHURCH_CONFIG,
});

/**
 * La dirección como se escribe en pantalla: sin `https://`, `www.` ni barra
 * final (`elimarganda.com`, `elimarganda.com/talantul-in-negot`). Para que
 * quien no escanea el QR la pueda teclear.
 */
export function displayAddress(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/**
 * La configuración completa. **Identidad** (canales, contacto, ubicación,
 * donativos) aquí mismo; el **contenido** que cambia cada semana vive en
 * `core/content/`, un fichero por dominio:
 *   · `announcements.content.ts`  anunțuri
 *   · `events.content.ts`         evenimente
 *   · `weekly.content.ts`         programa semanal y ensayos
 *   · `gallery.content.ts`        galería (Drive)
 *   · `photos.content.ts`         carrusel de portada y foto de «Cine suntem»
 */
export const DEFAULT_CHURCH_CONFIG: ChurchConfig = {
  youtubeChannelUrl: 'https://www.youtube.com/@ElimArganda',
  youtubeStreamsUrl: 'https://www.youtube.com/@ElimArganda/streams',
  youtubeLiveUrl: 'https://www.youtube.com/@ElimArganda/live',
  youtubeChannelId: 'UCJqLlk6CS6uNtJWS5r-7P9g',
  youtubeApiKey: 'AIzaSyCliQqAiyf0qZuKoOi76MbU-NOrQrDcCoA',
  oneSignalAppId: '438db2da-b582-4eca-8b0e-8bd24bf61e9b',
  oneSignalSafariWebId: 'web.onesignal.auto.66a57acb-1f7c-44c2-af57-20e68d9690d6',
  publicUrl: PUBLIC_URL,
  socials: [
    {
      id: 'instagram_main',
      i18nKey: 'instagram_main',
      handle: '@elimarganda',
      url: 'https://www.instagram.com/elimarganda/',
      icon: 'instagram',
      gradient: ['#f58529', '#dd2a7b'],
    },
    {
      id: 'instagram_youth',
      i18nKey: 'instagram_youth',
      handle: '@tineretelimarganda',
      url: 'https://www.instagram.com/tineretelimarganda/',
      icon: 'instagram',
      gradient: ['#8a3ab9', '#e95950'],
    },
    {
      id: 'facebook_main',
      i18nKey: 'facebook_main',
      handle: 'elimargandaoficial',
      url: 'https://www.facebook.com/elimargandaoficial',
      icon: 'facebook',
      gradient: ['#1877f2', '#0a52c4'],
    },
    {
      id: 'youtube_main',
      i18nKey: 'youtube_main',
      handle: '@ElimArganda',
      url: 'https://www.youtube.com/@ElimArganda',
      icon: 'youtube',
      gradient: ['#ff0000', '#a30000'],
    },
  ],
  mediaGalleryUrl: MEDIA_GALLERY_URL,
  mediaEvents: MEDIA_EVENTS,
  weeklyProgram: WEEKLY_PROGRAM,
  rehearsals: REHEARSALS,
  upcomingEvents: UPCOMING_EVENTS,
  announcements: ANNOUNCEMENTS,

  // ---------------------------------------------------------------------
  // Ubicación de la iglesia. `mapsQuery` se usa tanto para el mapa
  // incrustado (iframe) como para construir el enlace de indicaciones.
  // `mapsShareUrl` es el enlace corto oficial para compartir.
  // ---------------------------------------------------------------------
  location: {
    address: 'Av. de Madrid, 30, 28500 Arganda del Rey',
    city: 'Madrid',
    mapsShareUrl: 'https://maps.app.goo.gl/TAhrCAV6qvN3Abdv5',
    mapsQuery: 'Av. de Madrid, 30, 28500 Arganda del Rey, Madrid',
  },

  // ---------------------------------------------------------------------
  // Datos REALES desde el 29/09/2026 (correo y teléfono del pastor, facilitados
  // por la iglesia). El mismo número atiende WhatsApp (confirmado). Reglas:
  //   · `phone`     → formato internacional, sin espacios ni guiones
  //                   (es lo que se pone en `tel:`).
  //   · `whatsapp`  → sólo dígitos, con prefijo de país y sin «+»
  //                   (es lo que espera `wa.me/`). `null` si no se usa.
  //   · `phoneDisplay` es el único que se lee en pantalla: escríbelo
  //                   como se dicta en voz alta.
  // ---------------------------------------------------------------------
  contact: {
    email: 'pavelnegrusier@gmail.com',
    phone: '+34678668977',
    phoneDisplay: '+34 678 66 89 77',
    whatsapp: '34678668977',
    officeHoursKey: 'contact.office.hours',
    form: {
      endpoint: 'https://api.web3forms.com/submit',
      // TODO(iglesia): pegar la clave de Web3Forms creada con `email` (ver
      // `ContactFormConfig`). Sin ella, el formulario no puede enviar.
      accessKey: null,
    },
  },

  // ---------------------------------------------------------------------
  // Datos para donar — REALES (facilitados por la iglesia el 29/09/2026).
  //
  // Es todo lo que hay de momento: una cuenta en euros y el titular tal y
  // como figura en el banco. IBAN comprobado (dígitos de control correctos).
  // Lo que falte va a `null` y la tarjeta de donación no lo pinta.
  //   · `iban`     → agrupado de cuatro en cuatro; el botón de copiar quita
  //                  los espacios automáticamente.
  //   · `currency` → código ISO 4217 (EUR, RON…). Se muestra tal cual.
  //   · `bank`/`bic` → BBVA (confirmado por la iglesia; es la entidad 0182
  //                  del IBAN). BIC único de BBVA en España: BBVAESMMXXX.
  //   · `bizum`    → sólo dígitos, o `null` si la iglesia no lo tiene.
  // ---------------------------------------------------------------------
  donations: {
    holder: 'IGLESIA APOSTOLICA ELIM',
    bank: 'BBVA',
    bic: 'BBVAESMMXXX',
    bizum: null,
    accounts: [{ id: 'eur', currency: 'EUR', iban: 'ES55 0182 4888 1302 0152 0073' }],
  },

  // TODO(iglesia): confirmar el año real de fundación de la congregación.
  // 2001, no 2000: la iglesia cumple **25 años el 18 de octubre de 2026**
  // (es el evento `aniversare_25_2026_10_18`), así que se fundó en 2001. Con
  // 2000 la portada anunciaba 26 años de servicio, uno de más.
  foundedYear: 2001,
  aboutImage: ABOUT_IMAGE,
  heroSlides: HERO_SLIDES,

  // Cifras de la sección "quiénes somos". Son datos, no textos: las
  // etiquetas viven en `about.stats.*` de los ficheros i18n.
  stats: [
    { id: 'services', i18nKey: 'services', value: '7', icon: 'calendar' },
    { id: 'departments', i18nKey: 'departments', value: '8', icon: 'users' },
  ],

  // ---------------------------------------------------------------------
  // Departamentos activos. Estructurales y estables: se pueden mostrar
  // aunque todavía no haya nombres de responsables.
  ministries: [
    { id: 'worship', i18nKey: 'worship', icon: 'music' },
    { id: 'youth', i18nKey: 'youth', icon: 'sparkles' },
    { id: 'children', i18nKey: 'children', icon: 'heart' },
    { id: 'media', i18nKey: 'media', icon: 'image' },
    { id: 'mission', i18nKey: 'mission', icon: 'share' },
    { id: 'charity', i18nKey: 'charity', icon: 'heart' },
    { id: 'prayer', i18nKey: 'prayer', icon: 'church' },
    { id: 'women', i18nKey: 'women', icon: 'users' },
  ],
};
