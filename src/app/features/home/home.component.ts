import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { AnnouncementsService } from '../../core/services/announcements.service';
import { BibleReadingService } from '../../core/services/bible-reading.service';
import { LanguageService } from '../../core/services/language.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { CardCarouselComponent } from '../../shared/card-carousel/card-carousel.component';
import { HeroCarouselComponent } from '../../shared/hero-carousel/hero-carousel.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../core/ui/icon-name';



/**
 * Tarjeta de promoción del tablero de portada.
 *
 * La anatomía está calcada del carrusel de `play.google.com/store/apps`:
 * portada con foto, insignia superpuesta arriba a la izquierda, titular
 * grande sobre el fondo tonal de la tarjeta y barra inferior con el icono de
 * la sección, su nombre y el botón. Lo que cambia es el contenido: donde
 * Play pone el reclamo de una app, aquí va **lo más inmediato de la sección**
 * —el próximo culto, el anuncio vigente, el evento más cercano, la lectura de
 * hoy— y debajo las dos siguientes.
 */
/**
 * Fotos disponibles con **el tono derivado de cada una** (medido con canvas:
 * matiz de la imagen, saturación 0,32, luminosidad 0,20). Las tarjetas de
 * evento van tomando una distinta por orden, así dos seguidas nunca repiten
 * color ni imagen.
 */
const FOTOS = [
  { thumb: 'botez_2025-thumb.webp', image: 'botez_2025.webp', tone: 'is-blue' },
  { thumb: 'zambetul_cutie_2025-thumb.webp', image: 'zambetul_cutie_2025.webp', tone: 'is-plum' },
  { thumb: 'revelion_2025-thumb.webp', image: 'revelion_2025.webp', tone: 'is-slate' },
  { thumb: 'concert_copii_2025-thumb.webp', image: 'concert_copii_2025.webp', tone: 'is-clay' },
] as const;

const RUTA_MEDIA = 'assets/drive-media/';

/**
 * Tope de tarjetas de evento en el carrusel. Con más de cuatro deja de ser un
 * escaparate y se convierte en una lista horizontal interminable; el resto
 * está en su sección, a un clic.
 */
const MAX_EVENTOS = 4;

/**
 * Una línea de la franja de avisos. Cabe en 40 px de alto y lleva cinco datos:
 * día, mes, título, resumen y hora/lugar. La densidad sale de repartirlos en
 * columnas alineadas, no de encoger la letra.
 */
interface NoticeRow {
  readonly id: string;
  readonly day: string;
  readonly month: string;
  readonly title: string;
  readonly lead: string;
  readonly meta: string;
}

/** Una línea de la agenda comprimida que llevan las tarjetas de datos. */
interface BoardAgendaRow {
  readonly id: string;
  /** El cuándo (día de la semana). */
  readonly when: string;
  /** El qué (título del culto, pasaje del día). */
  readonly what: string;
  /** La hora, si el dato la tiene. */
  readonly time: string;
}

interface BoardCard {
  readonly id: string;
  /**
   * Qué enseña la portada:
   *  · `photo` — una foto de la vida de la iglesia (anuncios, eventos).
   *  · `data`  — el tono de la tarjeta con trama y **la agenda de la semana
   *    comprimida**. Se usa cuando el contenido de la sección ES una agenda:
   *    una foto de archivo no explica qué se estudia el miércoles, y el dato
   *    bien puesto informa más que cualquier imagen de relleno.
   */
  readonly cover: 'photo' | 'data' | 'poster';
  readonly icon: IconName;
  /** Tono de la tarjeta. Cada sección tiene el suyo, como en la referencia. */
  readonly tone: string;
  readonly thumb: string;
  readonly image: string;
  /** Cartel del evento, si lo tiene. Manda sobre la foto. */
  readonly poster: string;
  readonly titleKey: string;
  readonly link: string;
  /** Insignia sobre la foto (`null` si no hay nada que destacar). */
  readonly badge: string | null;
  /** Titular: el elemento más importante de la sección. */
  readonly headline: string;
  /**
   * Segunda línea sobre la foto (18 px en la referencia): la descripción del
   * elemento. Es la que convierte un título suelto en información —«Seară de
   * tineret» no dice nada; «Studiu biblic pentru tineri, sala mare» sí—.
   */
  readonly description: string;
  /**
   * Segunda línea del pie: el dato del titular (día y hora, fecha, cuenta
   * atrás). Va ahí y no bajo el titular porque es donde la referencia pone el
   * «editor · información», y porque deja el titular respirando.
   */
  readonly meta: string;
  /** Rótulo de la agenda (sólo en las portadas de datos). */
  readonly agendaKey: string;
  /** Agenda comprimida: lo que viene después de lo que va en el titular. */
  readonly agenda: readonly BoardAgendaRow[];
}

/** Tarjeta de acceso rápido a un módulo de la app. */
interface QuickLink {
  readonly id: string;
  readonly icon: IconName;
  readonly path: string;
}

/**
 * Portada pública de la iglesia.
 *
 * Es la primera impresión para quien llega desde el QR o desde una búsqueda:
 * presenta la iglesia, dice cuándo nos reunimos y ofrece accesos claros al
 * resto de módulos. **No** contiene lógica de negocio: consume
 * `ScheduleService` y `CHURCH_CONFIG` y delega la presentación en componentes
 * reutilizables (`app-hero-carousel`, `app-page-section`).
 */
@Component({
    selector: 'app-home',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        TranslatePipe,
        CardCarouselComponent,
        HeroCarouselComponent,
        IconComponent,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly schedule = inject(ScheduleService);
  protected readonly announcements = inject(AnnouncementsService);
  protected readonly bible = inject(BibleReadingService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  /** Rutas usadas en la plantilla — nunca literales sueltos. */
  protected readonly links = {
    about: `/${APP_PATHS.about}`,
    leadership: `/${APP_PATHS.leadership}`,
    media: `/${APP_PATHS.media}`,
    announcements: `/${APP_PATHS.announcements}`,
    bible: blockPath('bible'),
    weekly: blockPath('weekly'),
    upcoming: blockPath('upcoming'),
    gallery: blockPath('gallery'),
    streams: blockPath('streams'),
    socials: blockPath('socials'),
    location: blockPath('location'),
  } as const;

  /** Accesos rápidos de la portada (orden = prioridad para el visitante). */
  protected readonly quickLinks: readonly QuickLink[] = [
    { id: 'weekly', icon: 'calendar', path: this.links.weekly },
    { id: 'upcoming', icon: 'sparkles', path: this.links.upcoming },
    { id: 'streams', icon: 'play', path: this.links.streams },
    { id: 'gallery', icon: 'image', path: this.links.gallery },
    { id: 'socials', icon: 'share', path: this.links.socials },
    { id: 'location', icon: 'map-pin', path: this.links.location },
  ];

  /** Primeros ministerios a modo de aperitivo de la página de liderazgo. */
  protected readonly featuredMinistries = computed(() =>
    this.config.ministries.slice(0, 6),
  );

  /**
   * Las tres columnas del **tablero de portada** («Ce urmează»): programa,
   * anuncios y eventos. Es el patrón de bloque agrupado de las referencias
   * (Coursera): una banda con tres listas cortas y su enlace a la sección
   * completa, para que el visitante vea de un vistazo lo que pasa esta
   * semana sin bajar por toda la página.
   *
   * Tres filas por columna: es lo que cabe sin que la banda crezca más que
   * el hero y lo que se lee de una ojeada.
   */
  /**
   * Las cuatro tarjetas del tablero de portada, ya resueltas.
   *
   * Se construyen aquí y no en la plantilla a propósito: cuatro bloques de
   * marcado casi iguales se desincronizan a la primera. Con un modelo común
   * la plantilla es un único bucle y añadir una quinta sección es añadir un
   * objeto.
   *
   * El tono y la foto de cada tarjeta son fijos por sección, como en la
   * referencia: la tarjeta se reconoce por su color antes de leerla.
   */
  protected readonly boardCards = computed<readonly BoardCard[]>(() => {
    // Se lee el idioma activo para que el cálculo se rehaga al cambiarlo: los
    // textos de aquí se resuelven con `instant`, que por sí solo no reacciona.
    this.language.current();
    // Los anuncios NO están aquí: tienen su propia franja encima del
    // carrusel (ver `noticeItems`). Repetirlos en los dos sitios en la misma
    // pantalla es ruido, no énfasis.
    // Un evento, una tarjeta. Es como resuelve la referencia el «que se vean
    // todos»: no un carrusel dentro de otro —dos zonas de deslizamiento
    // anidadas se pelean por el gesto y son un problema de accesibilidad—,
    // sino una tarjeta por elemento real, cada una con su foto y su tono.
    return [this.weeklyCard(), ...this.eventCards(), this.bibleCard()];
  });

  private weeklyCard(): BoardCard {
    const featured = this.schedule.featuredProgram();
    const rest = this.schedule.weeklyProgram().filter((item) => item.id !== featured?.id);
    return {
      id: 'weekly',
      cover: 'data',
      icon: 'calendar',
      tone: 'is-teal',
      poster: '',
      thumb: '',
      image: '',
      titleKey: 'nav.weekly',
      link: this.links.weekly,
      badge: this.schedule.todayProgram() ? this.translate.instant('weekly.today') : null,
      headline: featured ? `${featured.dayLabel} · ${featured.time}` : '',
      description: featured?.title ?? this.translate.instant('nav.weekly_desc'),
      // La descripción del culto si la tiene (hoy están vacías en el config) y,
      // si no, la de la sección: es el «editor · información» de la
      // referencia. `||` y no `??` — una cadena vacía también es «sin dato».
      meta: featured?.description || this.translate.instant('nav.weekly_desc'),
      agendaKey: 'home.board.rest_week',
      // El resto de la semana: lo que hace que la tarjeta responda «¿cuándo
      // nos reunimos?» sin abrir nada. Tres líneas es lo que cabe legible.
      agenda: rest.slice(0, 3).map((item) => ({
        id: item.id,
        when: item.dayLabel,
        what: item.title,
        time: item.time,
      })),
    };
  }

  private eventCards(): readonly BoardCard[] {
    return this.schedule
      .upcomingEvents()
      .slice(0, MAX_EVENTOS)
      .map((evento, indice) => {
        const foto = FOTOS[indice % FOTOS.length];
        // La cuenta atrás encabeza el pie y la fecha va en la insignia: así no
        // se repite el dato y «3 zile rămase» no tiene que caber en 32 px.
        const datos = [this.daysLeftLabel(evento), evento.time, evento.preacher ?? null].filter(
          Boolean,
        );
        return {
          id: `event-${evento.id}`,
          // Si el evento tiene cartel, manda el cartel: ya lleva su identidad,
          // su fecha y su invitado.
          cover: evento.poster ? ('poster' as const) : ('photo' as const),
          icon: 'sparkles' as const,
          tone: foto.tone,
          // Con cartel, `poster` es la portada y la foto queda de respaldo.
          poster: evento.poster ?? '',
          thumb: RUTA_MEDIA + foto.thumb,
          image: RUTA_MEDIA + foto.image,
          titleKey: 'nav.upcoming',
          link: this.links.upcoming,
          badge: evento.isToday
            ? this.translate.instant('upcoming.today')
            : this.schedule.formatEventDateShort(evento.date),
          headline: evento.title,
          description: evento.description,
          meta: datos.join(' · '),
          agendaKey: '',
          agenda: [],
        };
      });
  }

  private bibleCard(): BoardCard {
    const week = this.bible.announcedWeek();
    // Desde hoy: a media semana, lo que tocaba el lunes ya no ayuda a nadie.
    const days = week?.days ?? [];
    const todayIndex = Math.max(
      0,
      days.findIndex((day) => day.isToday),
    );
    const today = days[todayIndex];
    return {
      id: 'bible',
      cover: 'data',
      icon: 'book',
      tone: 'is-clay',
      poster: '',
      thumb: '',
      image: '',
      titleKey: 'nav.bible',
      link: this.links.bible,
      /*
       * La insignia dice **cuándo**, no en qué semana del plan estamos: con
       * «Săpt. 91» arriba y un pasaje grande sin rótulo debajo, no había forma
       * de saber que ese pasaje era el de hoy. El número de semana pasa a la
       * descripción, que es donde sitúa sin estorbar.
       */
      badge: today?.isToday
        ? this.translate.instant('weekly.today')
        : (today ? this.schedule.formatWeekdayShort(today.date) : null),
      headline: today?.passage ?? this.translate.instant('bible.empty'),
      // «Semana 91 · Isaia 57-66, Ieremia 1-4»: el tramo suelto se leía como
      // otra lectura más, no como el alcance de la semana.
      description: week
        ? `${this.translate.instant('bible.week_label')} ${week.number} · ${week.summary}`
        : this.translate.instant('nav.bible_desc'),
      meta: today
        ? `${this.schedule.formatWeekdayShort(today.date)} · ${this.schedule.formatEventDateShort(today.date)}`
        : this.translate.instant('nav.bible_desc'),
      agendaKey: 'home.board.rest_readings',
      agenda: days.slice(todayIndex + 1, todayIndex + 4).map((day) => ({
        id: day.date,
        when: this.schedule.formatWeekdayShort(day.date),
        what: day.passage,
        time: day.newTestament ?? '',
      })),
    };
  }

  /**
   * Franja de avisos: los anuncios vigentes, arriba del todo.
   *
   * Por qué salen del carrusel y suben aquí: un anuncio es lo único de la
   * portada con **fecha de caducidad**. Lo demás (el programa, el plan de
   * lectura) sigue ahí la semana que viene; un aviso o se ve hoy o no sirve.
   * Dentro del carrusel se podía pasar de largo sin verlo.
   *
   * Tres como mucho: a partir de ahí deja de ser una franja y se convierte en
   * una lista, y el resto está a un clic en su sección.
   */
  protected readonly noticeItems = computed<readonly NoticeRow[]>(() =>
    this.announcements
      .active()
      .slice(0, 3)
      .map((aviso) => {
        const fecha = aviso.date ? this.schedule.formatDayParts(aviso.date) : null;
        return {
          id: aviso.id,
          day: fecha?.day ?? '',
          month: fecha?.month ?? '',
          title: aviso.title,
          // El resumen que ya traía el modelo: es lo que convierte una lista
          // de títulos en algo que de verdad informa.
          lead: aviso.lead,
          // Hora y lugar a la derecha, sólo lo que exista: un «·» suelto
          // delata el dato que falta.
          meta: [aviso.time ?? null, aviso.place ?? null].filter(Boolean).join(' · '),
        };
      }),
  );

  /** Cuántos quedan fuera de la franja. */
  protected readonly noticeMore = computed(() =>
    Math.max(0, this.announcements.active().length - this.noticeItems().length),
  );

  /**
   * Carteles que no han podido cargarse. Mientras el fichero no esté en
   * `assets/posters/`, la tarjeta cae a su portada de foto en vez de enseñar
   * una imagen rota. Vale para el hueco de ahora y para una ruta mal escrita
   * mañana: un cartel que falta nunca debe estropear la portada.
   */
  private readonly postersCaidos = signal<ReadonlySet<string>>(new Set());

  /** Portada real de una tarjeta, ya descontados los carteles que fallaron. */
  protected coverFor(card: BoardCard): BoardCard['cover'] {
    if (card.cover !== 'poster') return card.cover;
    return this.postersCaidos().has(card.id) ? 'photo' : 'poster';
  }

  protected onPosterError(card: BoardCard): void {
    this.postersCaidos.update((previos) => new Set(previos).add(card.id));
  }

  /** «Hoy» o «faltan N días», que es como se mide un evento próximo. */
  private daysLeftLabel(event: { readonly isToday: boolean; readonly daysLeft: number }): string {
    if (event.isToday) return this.translate.instant('upcoming.today');
    const unit = event.daysLeft === 1 ? 'upcoming.day_left' : 'upcoming.days_left';
    return `${event.daysLeft} ${this.translate.instant(unit)}`;
  }

  /** Próximo evento (o `null` si no queda ninguno). */
  protected readonly nextEvent = computed(() => this.schedule.upcomingEvents()[0] ?? null);

  /** Años de historia de la congregación, calculados en tiempo real. */
  protected readonly years = computed(
    () => new Date().getFullYear() - this.config.foundedYear,
  );

  /** Enlace de indicaciones a Google Maps. */
  protected readonly directionsUrl = computed(
    () =>
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        this.config.location.mapsQuery,
      )}`,
  );
}
