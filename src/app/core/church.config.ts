import { InjectionToken } from '@angular/core';
import { SocialLink } from './social-link.model';
import { IconName } from './ui/icon-name';
import type { DepartmentId } from './navigation/app-paths';

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
  readonly aboutImage: string;
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

export const CHURCH_CONFIG = new InjectionToken<ChurchConfig>('CHURCH_CONFIG');

/**
 * La dirección como se escribe en pantalla: sin `https://`, `www.` ni barra
 * final (`elimarganda.com`, `elimarganda.com/talantul-in-negot`). Para que
 * quien no escanea el QR la pueda teclear.
 */
export function displayAddress(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export const DEFAULT_CHURCH_CONFIG: ChurchConfig = {
  youtubeChannelUrl: 'https://www.youtube.com/@ElimArganda',
  youtubeStreamsUrl: 'https://www.youtube.com/@ElimArganda/streams',
  youtubeLiveUrl: 'https://www.youtube.com/@ElimArganda/live',
  youtubeChannelId: 'UCJqLlk6CS6uNtJWS5r-7P9g',
  youtubeApiKey: 'AIzaSyCliQqAiyf0qZuKoOi76MbU-NOrQrDcCoA',
  publicUrl: 'https://elimarganda.com/',
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
  mediaGalleryUrl:
    'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
  // Eventos destacados ordenados aproximadamente por relevancia litúrgica.
  // Para añadir un nuevo evento manualmente:
  //  1. Sube la imagen JPG/WebP a `src/assets/drive-media/`.
  //  2. Añade aquí una entrada con `image` apuntando a la nueva ruta.
  //  3. Añade los textos en `assets/i18n/ro.json` y `assets/i18n/es.json`
  //     bajo `gallery.events.<i18nKey>` (campos `name` y `date`).
  //  4. `driveFolderId`: el ID de su subcarpeta en «ELIM - ACCES PUBLIC»
  //     (compartida como «cualquiera con el enlace»). Después
  //     `npm run check:drive`. Receta completa: docs/ai/20-content-i18n.md.
  mediaEvents: [
    {
      id: 'botez_2025_11_30',
      i18nKey: 'botez_2025_11_30',
      image: 'assets/drive-media/botez_2025.webp',
      medium: 'assets/drive-media/botez_2025-960.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
      tone: '#91979f',
      gradient: ['#1e3a8a', '#3b82f6'],
      // Drive: «BOTEZ 2025-11-30»
      driveFolderId: '1neyEzyRpK9wnlSJ4cXp_JMi7jlu5lNfU',
    },
    {
      id: 'concert_colinde_copii',
      i18nKey: 'concert_colinde_copii',
      image: 'assets/drive-media/concert_copii_2025.webp',
      medium: 'assets/drive-media/concert_copii_2025-960.webp',
      thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
      tone: '#797474',
      gradient: ['#7c3aed', '#ec4899'],
      // Drive: «Concert Colinde Copi»
      driveFolderId: '1ME9BBG20zQtqm7esd5elx9pwSRdqHHoH',
    },
    {
      id: 'concert_colinde_elim',
      i18nKey: 'concert_colinde_elim',
      image: 'assets/drive-media/concert_colinde_2025.webp',
      medium: 'assets/drive-media/concert_colinde_2025-960.webp',
      thumb: 'assets/drive-media/concert_colinde_2025-thumb.webp',
      tone: '#777e7e',
      gradient: ['#b45309', '#f59e0b'],
      // Drive: «Concert De Colinde Elim»
      driveFolderId: '1vnZxeXBrojLXcghG6o8HcgE5vbJ7MFUl',
    },
    {
      id: 'seara_revelion',
      i18nKey: 'seara_revelion',
      image: 'assets/drive-media/revelion_2025.webp',
      medium: 'assets/drive-media/revelion_2025-960.webp',
      thumb: 'assets/drive-media/revelion_2025-thumb.webp',
      tone: '#5e6163',
      gradient: ['#831843', '#f43f5e'],
      // Drive: «Revelion - 2026»
      driveFolderId: '1RCc6LWKTb-vG2jxtFSV6fjD9-qEp2rbi',
    },
    {
      id: 'zambetul_din_cutie',
      i18nKey: 'zambetul_din_cutie',
      image: 'assets/drive-media/zambetul_cutie_2025.webp',
      medium: 'assets/drive-media/zambetul_cutie_2025-960.webp',
      thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
      tone: '#736d74',
      gradient: ['#9d174d', '#f472b6'],
      // Drive: «Zambetul din cutie - 2025»
      driveFolderId: '1ADjG_UdCDXSEthe6Hr1GcYNXIWRKxXw-',
    },
    {
      id: 'ancorat_2026',
      // También es la crónica de Tineret (`departments.config.ts`): mismas
      // fotos optimizadas, sin duplicar peso.
      i18nKey: 'ancorat_2026',
      image: 'assets/drive-media/ancorat_2026_sala.webp',
      medium: 'assets/drive-media/ancorat_2026_sala-960.webp',
      thumb: 'assets/drive-media/ancorat_2026_sala-thumb.webp',
      tone: '#776760',
      gradient: ['#0f2440', '#d4af37'],
      // Drive: «ELIM - MEDIA POZE › ANCORAT › POZE CONFERINTA - NAOMI»
      driveFolderId: '1bzwggHsitKUKdterJ_wkie7vbQsXdpQO',
    },
  ],
  // ---------------------------------------------------------------------
  // Programare săptămânală a serviciilor religioase fixe.
  // El campo `day` sigue `Date.getDay()` (0=Duminică ... 6=Sâmbătă) para
  // poder calcular "es hoy" sin parseo de strings.
  // ---------------------------------------------------------------------
  weeklyProgram: [
    {
      id: 'luni',
      day: 1,
      dayLabel: 'Luni',
      time: '20:30',
      title: 'Rugăciune și stăruință după Duhul Sfânt',
      description: '',
    },
    {
      id: 'marti',
      day: 2,
      dayLabel: 'Marți',
      time: '20:30',
      title: 'Rugăciune',
      description: '',
    },
    {
      id: 'miercuri',
      day: 3,
      dayLabel: 'Miercuri',
      time: '20:30',
      title: 'Învățătură · Studiu biblic',
      description: '',
    },
    {
      id: 'joi',
      day: 4,
      dayLabel: 'Joi',
      time: '20:30',
      title: 'Rugăciune și învățătură',
      description: '',
    },
    {
      id: 'vineri',
      day: 5,
      dayLabel: 'Vineri',
      time: '20:30',
      title: 'Seară de tineret',
      description: '',
    },
    {
      id: 'duminica',
      day: 0,
      dayLabel: 'Duminică',
      time: '10:00 & 18:00',
      title: 'Închinare și învățătură',
      description: '',
    },
  ],
  // ---------------------------------------------------------------------
  // Evenimente puntuale viitoare. Se muestran ordenados por proximidad
  // y con un contador "faltan X días". El cálculo se hace en el componente
  // (no aquí) para reaccionar a la fecha actual sin recargar la app.
  // Formato `date`: ISO YYYY-MM-DD (sin hora, sin zona horaria).
  // ---------------------------------------------------------------------
  upcomingEvents: [
    {
      id: 'ancorat_2026_09_26',
      departments: ['youth'],
      poster: 'assets/posters/conferinta-ancorat-2026.webp',
      date: '2026-09-26',
      time: '18:00',
      title: 'Conferință de tineret "ANCORAT"',
      description:
        'Organizată de Departamentul de tineret. După mesaj, întrebări și răspunsuri.',
      verse: '',
      preacher: 'Daniel Popa (Timișoara)',
      worshipLead: '',
    },
    {
      id: 'evanghelizare_2026_09_27',
      departments: ['evangelism'],
      poster: 'assets/posters/conferinta-ancorat-2026.webp',
      date: '2026-09-27',
      time: '10:00 & 18:00',
      title: 'Evanghelizare',
      description: 'Fratele Daniel Popa slujește la ambele programe ale zilei.',
      verse: '',
      preacher: 'Daniel Popa (Timișoara)',
      worshipLead: '',
    },
    {
      id: 'aniversare_25_2026_10_18',
      poster: 'assets/posters/aniversare-25-ani-2026.webp',
      date: '2026-10-18',
      time: '10:00',
      title: 'Aniversare: 25 de ani de la înființarea Bisericii Elim',
      description:
        'Sărbătoare în biserică, apoi masă festivă la restaurantul Oma Bodas din Arganda del Rey (cu înscriere).',
      verse: '',
      preacher: 'Simion Bumbar',
      worshipLead: '',
    },
    {
      id: '2',
      date: '2026-06-21',
      time: '10:00',
      title: 'Laudă şi închinare',
      description: '',
      verse: '',
      preacher: '',
      worshipLead: 'Andrei şi Andreea Mois',
    },
    {
      id: '1',
      date: '2026-06-28', 
      time: '18:00',
      title: 'Laudă şi închinare',
      description: '',
      verse: '',
      preacher: '',
      worshipLead: 'Adi Kovaci',
    },
    {
      id: '3',
      date: '2026-07-05',
      time: '10:00',
      title: 'Cina Domnului',
      description: '',
      verse: '',
      preacher: '',
      worshipLead: '',
    },
    {
      id: '4',
      departments: ['youth'],
      date: '2026-07-05',
      time: '18:00',
      title: 'Seară de tineret',
      description: '',
      verse: '',
      preacher: '',
      worshipLead: '',
    },
    /* {
      id: 'botez_2026_05_31',
      date: '2026-05-31',
      time: '10:00',
      title: 'Botez Nou Testamental',
      description: '',
      verse:
        'Romani 6:4: „Noi deci, prin botezul în moartea Lui, am fost îngropaţi împreună cu El, pentru ca, după cum Hristos a înviat din morţi, prin slava Tatălui, tot aşa şi noi să trăim o viaţă nouă.”',
      preacher: '',
      worshipLead: '',
    }, */
    /* 
    {
      id: 'botez_2026_05_31',
      date: '2026-05-31',
      time: '10:00',
      title: 'Botez Nou Testamental',
      description: 'Luptele creștinilor în timpurile de azi',
      verse:
        'Faptele Apostolilor 2:38: „Pocăiți-vă, le-a zis Petru, și fiecare din voi să fie botezat în Numele lui Isus Hristos, spre iertarea păcatelor voastre; apoi veți primi darul Sfântului Duh.”',
      preacher: 'Ioan Szaz',
      worshipLead: 'Beni Cioarba',
    },
    {
      id: 'evanghelizare_2026_06_07',
      departments: ['evangelism'],
      date: '2026-06-07',
      time: '18:00',
      title: 'Evanghelizare',
      description:
        'Cine ești tu omule — Prin botezul în moartea Lui, am fost îngropați împreună cu El, pentru ca, după cum Hristos a înviat din morți, prin slava Tatălui, tot așa și noi să trăim o viață nouă.',
      verse: '',
      preacher: 'Beni Cioarba',
      worshipLead: 'Beni Cioarba',
    }, 
    */
  ],
  // ---------------------------------------------------------------------
  // Anunțuri. Reglas (detalle en `docs/ai/35-announcements.md`):
  //  · `expiresOn` es el último día que se muestra; después desaparece solo.
  //  · Título de una frase; `lead` de 1-2 frases (lo que se lee en voz alta).
  //  · Máximo 3 `sections` y ~7 líneas por sección: en proyección cada
  //    sección es una columna y todo tiene que leerse desde el fondo.
  //  · Texto en rumano, revisado (diacríticos, «18:00» y no «18;OO»).
  // ---------------------------------------------------------------------
  announcements: [
    /*
     * Semana de intercesión por el ministerio de música.
     *
     * El texto original llegó con erratas de tecleo (biserici→Bisericii,
     * jerfa→jertfă, los→lor, todeauna→totdeauna, «pe unul fie care»→«pe
     * fiecare», y el versículo entero sin diacríticos). Corregido y
     * estructurado: el aviso en el `lead`, a quién se ora y qué se pide en
     * dos listas, y el texto bíblico en su campo propio.
     */
    {
      id: 'mijlocire_slujirea_prin_cantare',
      title: 'Săptămână de rugăciune pentru slujirea prin cântare',
      lead: 'Săptămâna aceasta, Grupul de Mijlocire și Post stă în rugăciune și jertfă pentru cei ce ne slujesc prin cântare.',
      sections: [
        {
          heading: 'Îi aducem înaintea Domnului',
          kind: 'list',
          items: [
            { label: 'Corul' },
            { label: 'Fanfara' },
            { label: 'Grupurile de laudă' },
            { label: 'Dirijorii de cor și de fanfară' },
          ],
        },
        {
          heading: 'Ce cerem pentru ei',
          kind: 'list',
          items: [
            { label: 'Mult har în slujire' },
            { label: 'Duhul Sfânt să fie peste ei' },
            { label: 'Ungere proaspătă în tot ce slujesc' },
            { label: 'Binecuvântare peste ei și peste familiile lor' },
          ],
        },
      ],
      verse: {
        text: 'Voi înșivă ne veți ajuta cu rugăciunile voastre…',
        reference: '2 Corinteni 1:11',
      },
      publishedOn: '2026-09-26',
      // Cede el sitio el domingo 04/10 al de ordine, sunet și proiecție (pasa al archivo).
      expiresOn: '2026-10-03',
    },
    /*
     * Semana de intercesión por quienes sirven en el orden, el sonido, la
     * transmisión y la proyección (04/10 → 10/10).
     *
     * El original llegó sin diacríticos y con erratas (aducen→aducem,
     * sai→să-i, «Sta»→stă, pt→pentru, Duhul sau cel sfânt→Duhul Său cel
     * Sfânt). Misma estructura que la semana anterior: a quién se ora y qué
     * se pide en dos listas; la oración por la iglesia, al pie.
     */
    {
      id: 'mijlocire_ordine_sunet_proiectie',
      title: 'Săptămână de rugăciune pentru frații de la ordine, sunet și proiecție',
      lead: 'În săptămâna care ne stă în față îi aducem în rugăciune pe frații care ne slujesc în aceste lucrări.',
      sections: [
        {
          heading: 'Îi aducem înaintea Domnului',
          kind: 'list',
          items: [
            { label: 'Cei care slujesc la ordine în biserică' },
            { label: 'Cei de la amplificare și transmisia live' },
            { label: 'Cei care slujesc la videoproiector' },
          ],
        },
        {
          heading: 'Ce cerem pentru ei',
          kind: 'list',
          items: [
            { label: 'Binecuvântare pentru ei și familiile lor' },
            { label: 'Putere și înțelepciune' },
            { label: 'Lumină în slujire' },
          ],
        },
      ],
      footnote: 'Continuăm să ne rugăm pentru o înviorare în Biserica Elim, prin Duhul Sfânt.',
      publishedOn: '2026-10-04',
      expiresOn: '2026-10-10',
    },
    {
      id: 'aniversare_25_ani',
      title: 'Sărbătoare: 25 de ani de la înființarea Bisericii Elim',
      date: '2026-10-18',
      time: '10:00',
      place: 'Biserica Elim · masă festivă la restaurantul Oma Bodas, Arganda del Rey',
      lead:
        'Continuăm sărbătoarea și la masă. Înscrierea este necesară pentru fiecare loc, inclusiv pentru copiii mici care au nevoie de scaun lângă părinți.',
      sections: [
        {
          heading: 'Meniu',
          kind: 'prices',
          items: [
            { label: 'Adult', value: '26 €' },
            { label: 'Copil sub 10 ani', value: '13 €' },
            {
              label: 'Copil sub 4 ani',
              value: 'gratuit',
              note: 'fără meniu; cu meniu 13 €. Se înscrie dacă are nevoie de loc.',
            },
          ],
        },
        {
          heading: 'Înscrieri la frații',
          kind: 'people',
          items: [
            { label: 'Halas Petrică' },
            { label: 'Sidor Ionel' },
            { label: 'Bogdan Samuel' },
            { label: 'Șanta Pavel' },
            { label: 'Vasile Vălean' },
            { label: 'Silviu Dobre' },
            { label: 'Aurel Burdeț' },
          ],
        },
        {
          heading: 'Vor fi împreună cu noi',
          kind: 'people',
          // Se proyecta entero (petición del usuario, 03/10/2026): en la
          // segunda diapositiva, con la nota del mensaje principal. La 1/2
          // queda para lo práctico (menú e inscripciones).
          part: 2,
          items: [
            { label: 'Pastor Gavrilă Zăgrean', value: 'cu sora Ana' },
            { label: 'Pastor Mircea Coptil', value: 'cu soția' },
            { label: 'Prezbiter Adrian Mureșan', value: 'cu soția' },
            { label: 'Prezbiter Nicu Răducanu' },
            { label: 'Prezbiter Ioan Șuiu', value: 'cu Maria' },
            { label: 'Prezbiter Daniel Oros', value: 'cu Camelia' },
            { label: 'Diacon Dan Cifor', value: 'cu Dana' },
          ],
        },
      ],
      footnote:
        'Mesajul de bază: pastorul Simion Bumbar, secretarul Cultului Creștin Penticostal din România.',
      expiresOn: '2026-10-18',
    },
    {
      id: 'ancorat_2026',
      title: 'Conferință de tineret "ANCORAT"',
      date: '2026-09-26',
      time: '18:00',
      place: 'Biserica Elim',
      lead: '',
      sections: [
        {
          heading: 'Invitat',
          kind: 'people',
          items: [{ label: 'Daniel Popa', value: 'Timișoara' }],
        },
        {
          heading: 'Program',
          kind: 'schedule',
          items: [
            { label: 'Sâmbătă 26 septembrie, 18:00', value: 'Mesaj, apoi întrebări și răspunsuri' },
            { label: 'Duminică 27 septembrie, 10:00 & 18:00', value: 'Evanghelizare cu fratele Daniel Popa' },
          ],
        },
      ],
      expiresOn: '2026-09-26',
    },
  ],
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

  // ---------------------------------------------------------------------
  // Carrusel de portada. Reutiliza las fotos ya optimizadas de la galería
  // para no duplicar peso. Para cambiarlas: sube la foto a
  // `src/assets/drive-media/`, ejecuta `node scripts/optimize-images.js`
  // y apunta aquí a los `.webp` generados.
  // ---------------------------------------------------------------------
  /**
   * Foto de «Nuestra historia» (página Quiénes somos).
   *
   * Tiene entrada propia y **no se lee de `heroSlides[0]`**, que es lo que
   * hacía antes: al reordenar el carrusel de portada, esta página cambiaba de
   * foto sola y sin que nadie se enterara. Una ilustración elegida para un
   * texto concreto no puede depender del orden de otra cosa.
   *
   * Se escoge la sala llena porque el texto habla de pasar de unas pocas
   * familias a una comunidad: la foto tiene que enseñar la comunidad.
   */
  aboutImage: 'assets/drive-media/concert_copii_2025.webp',

  heroSlides: [
    // El orden es deliberado: abre el concierto de niños (la foto con más
    // gente y más luz, que es la primera impresión), sigue el tineret en
    // alabanza (segunda, a petición del usuario, 04/10/2026) y, agrupados por
    // tema, la música (coro y fanfara) y el bautismo (candidatos y bautismo).
    // Después Fin de Año y acción social, y cierra la velada de villancicos.
    // Cambiarlo es cambiar lo primero que ve quien entra.
    {
      id: 'hero_children',
      i18nKey: 'children',
      image: 'assets/drive-media/concert_copii_2025.webp',
      medium: 'assets/drive-media/concert_copii_2025-960.webp',
      thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
      tone: '#797474',
    },
    {
      // El tineret dirigiendo la alabanza: la letra en pantalla, el coro y
      // la sala.
      id: 'hero_youth',
      i18nKey: 'youth',
      image: 'assets/drive-media/inchinare_tineret_2026.webp',
      medium: 'assets/drive-media/inchinare_tineret_2026-960.webp',
      thumb: 'assets/drive-media/inchinare_tineret_2026-thumb.webp',
      tone: '#6b645f',
      // Con `upper` mandaba la pantalla con la letra y el tineret quedaba
      // cortado por la cabeza en escritorio: centrado entran las dos cosas.
      focus: 'center',
    },
    {
      // El coro, con el director de espaldas y la sala delante.
      id: 'hero_choir',
      i18nKey: 'choir',
      image: 'assets/drive-media/cor_2026.webp',
      medium: 'assets/drive-media/cor_2026-960.webp',
      thumb: 'assets/drive-media/cor_2026-thumb.webp',
      tone: '#78716d',
    },
    {
      // La fanfara tocando, con la letra en la pantalla y la sala llena.
      id: 'hero_brass',
      i18nKey: 'brass',
      image: 'assets/drive-media/fanfara_2026.webp',
      medium: 'assets/drive-media/fanfara_2026-960.webp',
      thumb: 'assets/drive-media/fanfara_2026-thumb.webp',
      tone: '#7d7976',
    },
    {
      id: 'hero_baptism',
      i18nKey: 'baptism',
      image: 'assets/drive-media/botez_2025.webp',
      medium: 'assets/drive-media/botez_2025-960.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
      tone: '#91979f',
    },
    {
      // Los candidatos al bautismo, de blanco, en primera fila.
      id: 'hero_baptism_candidates',
      i18nKey: 'baptism_candidates',
      image: 'assets/drive-media/candidati_botez_2026.webp',
      medium: 'assets/drive-media/candidati_botez_2026-960.webp',
      thumb: 'assets/drive-media/candidati_botez_2026-thumb.webp',
      tone: '#918880',
      // Las caras están en el tercio de arriba: con `upper` se cortaban las
      // cabezas en escritorio.
      focus: 'top',
    },
    {
      id: 'hero_community',
      i18nKey: 'community',
      image: 'assets/drive-media/revelion_2025.webp',
      medium: 'assets/drive-media/revelion_2025-960.webp',
      thumb: 'assets/drive-media/revelion_2025-thumb.webp',
      tone: '#5e6163',
      // Arriba del todo: con `center`, en escritorio (marco ~2,25:1 sobre una
      // foto 3:2) el recorte se llevaba 211 px de arriba y cortaba las cabezas
      // de los que están de pie. Abajo sólo hay suelo y cajas.
      focus: 'top',
    },
    {
      id: 'hero_outreach',
      i18nKey: 'outreach',
      image: 'assets/drive-media/zambetul_cutie_2025.webp',
      medium: 'assets/drive-media/zambetul_cutie_2025-960.webp',
      thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
      tone: '#736d74',
      // Los chicos de delante tienen la cabeza pegada al borde de arriba: con
      // `upper` (28 %) se les cortaba el pelo. Abajo sólo hay cajas.
      focus: 'top',
    },
    {
      id: 'hero_worship',
      i18nKey: 'worship',
      image: 'assets/drive-media/concert_colinde_2025.webp',
      medium: 'assets/drive-media/concert_colinde_2025-960.webp',
      thumb: 'assets/drive-media/concert_colinde_2025-thumb.webp',
      tone: '#777e7e',
    },
  ],

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
