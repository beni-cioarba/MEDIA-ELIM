import { InjectionToken } from '@angular/core';
import { SocialLink } from './social-link.model';
import { IconName } from './ui/icon-name';

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
  /** Variante miniatura (480px webp) para el grid del mosaico. */
  readonly thumb: string;
  /** Gradient de fondo de la card como tinte de color de marca [from, to]. */
  readonly gradient: readonly [string, string];
  /** URL pública directa a la subcarpeta de Drive. */
  readonly driveUrl: string;
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
  /** Miniatura (480px webp) usada como LQIP/preview. */
  readonly thumb: string;
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
 * ⚠️ Los valores por defecto son **de demostración**: sirven para ver la
 * página terminada y para saber en qué formato hay que escribir los reales.
 * Antes de publicar, sustitúyelos (ver los `TODO(iglesia)` más abajo).
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
  /** Nombre comercial del banco. */
  readonly bank: string;
  /** BIC / SWIFT, necesario para transferencias internacionales. */
  readonly bic: string;
  /** Teléfono asociado a Bizum, o `null` si no está dado de alta. */
  readonly bizum: string | null;
  readonly accounts: readonly DonationAccount[];
}

export interface ChurchConfig {
  readonly logo: string;
  readonly youtubeChannelUrl: string;
  readonly youtubeStreamsUrl: string;
  /** YouTube channel ID (UC...). Necesario para llamadas a YouTube Data API. */
  readonly youtubeChannelId: string;
  /** API Key restringida por HTTP referrer; segura para uso en cliente. */
  readonly youtubeApiKey: string;
  /** URL pública canónica — fallback para el QR si no hay `window`. */
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
  /** Ubicación física de la iglesia (mapa + dirección). */
  readonly location: ChurchLocation;
  /** Canales de contacto directo (correo, teléfono, WhatsApp). */
  readonly contact: ChurchContact;
  /** Datos bancarios para donativos. */
  readonly donations: DonationInfo;
  /** Año de fundación — se usa para calcular «años de historia». */
  readonly foundedYear: number;
  /** Diapositivas del carrusel de portada. */
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

export const DEFAULT_CHURCH_CONFIG: ChurchConfig = {
  logo: 'assets/logo-elim.webp',
  youtubeChannelUrl: 'https://www.youtube.com/@ElimArganda',
  youtubeStreamsUrl: 'https://www.youtube.com/@ElimArganda/streams',
  youtubeChannelId: 'UCJqLlk6CS6uNtJWS5r-7P9g',
  youtubeApiKey: 'AIzaSyCliQqAiyf0qZuKoOi76MbU-NOrQrDcCoA',
  publicUrl: 'https://beni-cioarba.github.io/MEDIA-ELIM/',
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
  mediaEvents: [
    {
      id: 'botez_2025_11_30',
      i18nKey: 'botez_2025_11_30',
      image: 'assets/drive-media/botez_2025.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
      gradient: ['#1e3a8a', '#3b82f6'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'concert_colinde_copii',
      i18nKey: 'concert_colinde_copii',
      image: 'assets/drive-media/concert_copii_2025.webp',
      thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
      gradient: ['#7c3aed', '#ec4899'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'concert_colinde_elim',
      i18nKey: 'concert_colinde_elim',
      image: 'assets/drive-media/concert_colinde_2025.webp',
      thumb: 'assets/drive-media/concert_colinde_2025-thumb.webp',
      gradient: ['#b45309', '#f59e0b'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'seara_revelion',
      i18nKey: 'seara_revelion',
      image: 'assets/drive-media/revelion_2025.webp',
      thumb: 'assets/drive-media/revelion_2025-thumb.webp',
      gradient: ['#831843', '#f43f5e'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'zambetul_din_cutie',
      i18nKey: 'zambetul_din_cutie',
      image: 'assets/drive-media/zambetul_cutie_2025.webp',
      thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
      gradient: ['#9d174d', '#f472b6'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
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
      title: 'Învățătură · Studiu biblic',
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
  // ⚠️ DATOS DE DEMOSTRACIÓN — NO SON REALES
  //
  // Están puestos para que la página de contacto se vea terminada y para
  // mostrar el formato exacto que espera cada campo.
  //
  // TODO(iglesia): sustituir `email`, `phone`, `phoneDisplay` y `whatsapp`
  // por los datos reales. Reglas:
  //   · `phone`     → formato internacional, sin espacios ni guiones
  //                   (es lo que se pone en `tel:`).
  //   · `whatsapp`  → sólo dígitos, con prefijo de país y sin «+»
  //                   (es lo que espera `wa.me/`). `null` si no se usa.
  //   · `phoneDisplay` es el único que se lee en pantalla: escríbelo
  //                   como se dicta en voz alta.
  // ---------------------------------------------------------------------
  contact: {
    email: 'contacto@example.org',
    phone: '+34600000000',
    phoneDisplay: '+34 600 00 00 00',
    whatsapp: '34600000000',
    officeHoursKey: 'contact.office.hours',
  },

  // ---------------------------------------------------------------------
  // ⚠️ DATOS BANCARIOS DE DEMOSTRACIÓN — NO SON REALES
  //
  // Los IBAN son todo ceros a propósito: así es imposible confundirlos con
  // los verdaderos ni hacer una transferencia por error.
  //
  // TODO(iglesia): sustituir por las cuentas reales. Reglas:
  //   · `iban`     → agrupado de cuatro en cuatro; el botón de copiar quita
  //                  los espacios automáticamente.
  //   · `currency` → código ISO 4217 (EUR, RON, USD…). Se muestra tal cual.
  //   · `bizum`    → sólo dígitos, o `null` si la iglesia no lo tiene.
  //   · Borra las cuentas que no existan: la página se adapta sola.
  // ---------------------------------------------------------------------
  donations: {
    holder: 'Iglesia Evangélica Elim Arganda del Rey',
    bank: 'Banco Ejemplo, S.A.',
    bic: 'XXXXESMMXXX',
    bizum: '600000000',
    accounts: [
      { id: 'eur', currency: 'EUR', iban: 'ES00 0000 0000 0000 0000 0000' },
      { id: 'ron', currency: 'RON', iban: 'RO00 XXXX 0000 0000 0000 0000' },
    ],
  },

  // TODO(iglesia): confirmar el año real de fundación de la congregación.
  foundedYear: 2000,

  // ---------------------------------------------------------------------
  // Carrusel de portada. Reutiliza las fotos ya optimizadas de la galería
  // para no duplicar peso. Para cambiarlas: sube la foto a
  // `src/assets/drive-media/`, ejecuta `node scripts/optimize-images.js`
  // y apunta aquí a los `.webp` generados.
  // ---------------------------------------------------------------------
  heroSlides: [
    {
      id: 'hero_worship',
      i18nKey: 'worship',
      image: 'assets/drive-media/concert_colinde_2025.webp',
      thumb: 'assets/drive-media/concert_colinde_2025-thumb.webp',
    },
    {
      id: 'hero_baptism',
      i18nKey: 'baptism',
      image: 'assets/drive-media/botez_2025.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
    },
    {
      id: 'hero_children',
      i18nKey: 'children',
      image: 'assets/drive-media/concert_copii_2025.webp',
      thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
    },
    {
      id: 'hero_community',
      i18nKey: 'community',
      image: 'assets/drive-media/revelion_2025.webp',
      thumb: 'assets/drive-media/revelion_2025-thumb.webp',
      // Los músicos ocupan la franja central; con `upper` se comía la
      // cabecera de la carpa y se perdían los acordeones.
      focus: 'center',
    },
    {
      id: 'hero_outreach',
      i18nKey: 'outreach',
      image: 'assets/drive-media/zambetul_cutie_2025.webp',
      thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
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
