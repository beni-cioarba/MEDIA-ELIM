import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, UpcomingEvent } from '../../core/church.config';
import { DEPARTMENTS } from '../../core/departments.config';
import {
  GUEST_DEPARTMENTS,
  GUEST_EVENTS_MAX,
  GUEST_FAQ,
  GUEST_HOSTS,
  GUEST_SECTIONS,
  GUEST_STEPS,
  GUEST_TITLE_GLOSS_ES,
} from '../../core/guests.config';
import { PEOPLE_INDEX } from '../../core/leadership.config';
import { APP_PATHS, blockPath, departmentPath } from '../../core/navigation/app-paths';
import { CalendarService } from '../../core/services/calendar.service';
import { ClockService } from '../../core/services/clock.service';
import { AppLanguage, LanguageService } from '../../core/services/language.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { telHref, whatsappHref } from '../../core/util/contact-links';
import { formatIn } from '../../core/util/countdown';
import { toIsoDate } from '../../core/util/iso-date';
import { nextWeeklyDates } from '../../core/util/recurrence';
import { IconName } from '../../core/ui/icon-name';
import { CopyButtonComponent } from '../../shared/copy-button/copy-button.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { SocialIconComponent } from '../../shared/social-icon/social-icon.component';
import { ViewerDocument } from '../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../shared/viewer/viewable.directive';
import { WeekScheduleComponent } from '../../shared/week-schedule/week-schedule.component';
import { STORY_FACTS, STORY_FACTS_AS_OF } from '../about/about-story.data';
import { personPhoto, photoSource, PhotoSource } from '../leadership/person-photo';
import {
  buildVCard,
  glossTitle,
  googleCalendarUrl,
  guestsPath,
  guestsUrl,
  initialsOf,
  nextServiceState,
  NextServiceState,
} from './guests.view';

/** Anfitrión listo para pintar. */
interface HostView {
  readonly id: string;
  readonly name: string;
  readonly roleKey: string;
  readonly initials: string;
  readonly photo: PhotoSource | null;
  /** La foto entera, para el visor (`null` sin foto). */
  readonly viewer: ViewerDocument | null;
}

/** Departamento listo para pintar. */
interface DepartmentView {
  readonly id: string;
  readonly icon: IconName;
  readonly path: string;
}

/** Idiomas del selector de la portada, con su nombre en su propio idioma. */
const LANGUAGES: readonly { readonly code: AppLanguage; readonly name: string }[] = [
  { code: 'ro', name: 'Română' },
  { code: 'es', name: 'Español' },
];

/** Duración del culto del domingo (dato de la iglesia, 11/11/2026: 2 h). */
const SERVICE_DURATION_MIN = 120;

/** Cuánto se ve el aviso «contacto descargado» (ms). */
const SAVED_NOTICE_MS = 6000;

/**
 * «Invitați» (`/invitati`): la bienvenida para quien viene por primera vez.
 *
 * Página **oculta** (sin menú; acceso discreto en el pie, QR y dirección) que
 * responde a las dudas reales de un recién llegado, en el orden en que se las
 * hace: ¿cuándo? → ¿qué va a pasar? → ¿quiénes son? → ¿con quién hablo? →
 * ¿cómo llego? Todo sale de datos que la web ya publica (horario, eventos,
 * organigrama, dirección, contacto): nada se escribe dos veces ni se inventa.
 * Plan, decisiones y pendientes en `docs/ai/33-guests.md`.
 */
@Component({
  selector: 'app-guests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    SocialIconComponent,
    CopyButtonComponent,
    ViewableDirective,
    WeekScheduleComponent,
  ],
  templateUrl: './guests.component.html',
  styleUrl: './guests.component.scss',
})
export class GuestsComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly schedule = inject(ScheduleService);
  protected readonly language = inject(LanguageService);
  private readonly calendar = inject(CalendarService);
  private readonly translate = inject(TranslateService);
  private readonly clock = inject(ClockService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  protected readonly languages = LANGUAGES;
  /** Índice: «Ce urmează» sólo cuando hay eventos (sin ellos, la sección no se pinta). */
  protected readonly sections = computed(() =>
    GUEST_SECTIONS.filter((s) => s.id !== 'events' || this.events().length > 0),
  );
  protected readonly steps = GUEST_STEPS;
  protected readonly faq = GUEST_FAQ;
  protected readonly heroImage = this.config.aboutImage;

  /**
   * Ruta de la página en el idioma activo (`/invitati` o `/invitati/es`).
   * Las anclas del índice la llevan delante: el `base href` resolvería `#x`
   * contra la portada.
   */
  protected readonly pagePath = computed(() => guestsPath(this.language.current()));

  /** Glosa en español bajo los títulos rumanos del programa (sólo en español). */
  protected readonly gloss = computed(() =>
    this.language.current() === 'es'
      ? (title: string) => glossTitle(title, GUEST_TITLE_GLOSS_ES)
      : null,
  );

  protected readonly links = {
    leadership: `/${APP_PATHS.leadership}`,
    about: `/${APP_PATHS.about}`,
    credo: `/${APP_PATHS.credo}`,
    baptisms: `/${APP_PATHS.baptisms}`,
    upcoming: blockPath('upcoming'),
    program: blockPath('weekly'),
  } as const;

  protected readonly tel = telHref(this.config.contact.phone);
  protected readonly mailto = `mailto:${this.config.contact.email}`;
  protected readonly whatsapp = this.config.contact.whatsapp;

  // ---- Próximo culto --------------------------------------------------

  protected readonly next = this.schedule.nextService;

  protected readonly nextState = computed<NextServiceState | null>(() => {
    const next = this.next();
    return next ? nextServiceState(next) : null;
  });

  /** «2 h 15 min» hasta el culto de hoy (sólo en el estado `today`). */
  protected readonly nextIn = computed(() => {
    const next = this.next();
    return next && next.minutesUntil > 0 ? formatIn(next.minutesUntil) : '';
  });

  /**
   * El culto del domingo (el que se recomienda a quien viene por primera vez),
   * del programa semanal: horas y título tal como se publican.
   */
  protected readonly sunday = computed(() => {
    const program = this.schedule.weeklyProgram().find((p) => p.day === 0);
    if (!program) return null;
    // El domingo que viene: hoy si es domingo y aún queda culto (lo próximo
    // es domingo); si hoy es domingo y ya pasó, el de la semana siguiente.
    const now = new Date(this.clock.now());
    const next = this.next();
    const from = now.getDay() === 0 && next?.day !== 0 ? new Date(now.getTime() + 86_400_000) : now;
    const [iso] = nextWeeklyDates(0, from, 1);
    // Título de **ese** domingo (el primero del mes es «Cina Domnului · Seară
    // de tineret»), si cae en la semana en curso; si no, el de siempre.
    const ofThatDay = this.schedule.week().find((d) => d.iso === iso)?.services[0]?.title;
    const parts = this.schedule.formatDayParts(iso);
    // El nombre del día, en el idioma de la interfaz («Domingo»); el título
    // del culto es contenido de la iglesia y va como se publica (en rumano).
    this.language.current();
    return {
      ...program,
      iso,
      title: ofThatDay ?? program.title,
      dayName: this.weekday(iso),
      dateLabel: `${parts.day} ${parts.month}`,
    };
  });

  /** Lo próximo no es el domingo: la tarjeta pone el domingo delante y lo de hoy/mañana debajo. */
  protected readonly sundayFirst = computed(() => {
    const next = this.next();
    return !!this.sunday() && (!next || next.day !== 0);
  });

  /** Eventos de hoy (los del calendario, no los del programa fijo). */
  protected readonly todayEvents = computed(() => {
    const today = toIsoDate(new Date(this.clock.now()));
    return this.schedule.eventsByDate().get(today) ?? [];
  });

  // ---- Secciones con datos ---------------------------------------------

  /** Años desde la fundación (mismo cálculo que «Despre noi»). */
  protected readonly years = computed(
    () => new Date(this.clock.now()).getFullYear() - this.config.foundedYear,
  );

  protected readonly facts = STORY_FACTS;

  /** «octombrie 2026»: de cuándo son las cifras (una cifra sin fecha acaba mintiendo). */
  protected readonly factsAsOf = computed(() => {
    const [year, month] = STORY_FACTS_AS_OF.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(this.language.current(), { month: 'long', year: 'numeric' }).format(
        new Date(year, month - 1, 1),
      );
    } catch {
      return STORY_FACTS_AS_OF;
    }
  });

  protected readonly hosts: readonly HostView[] = GUEST_HOSTS.flatMap((host) => {
    const person = PEOPLE_INDEX.get(host.person);
    if (!person) return [];
    const photo = personPhoto(host.person);
    return [
      {
        id: host.person,
        name: person.name,
        roleKey: host.roleKey,
        initials: initialsOf(person.name),
        photo: photo ? photoSource(photo, 'card') : null,
        viewer: photo
          ? { src: photoSource(photo, null).src, srcset: photoSource(photo, null).srcset, name: person.name, alt: person.name }
          : null,
      },
    ];
  });

  /** El pastor (primer anfitrión): la persona con la que hablar. */
  protected readonly pastorName = this.hosts[0]?.name ?? '';

  protected readonly departments: readonly DepartmentView[] = GUEST_DEPARTMENTS.flatMap((id) => {
    const department = DEPARTMENTS.find((d) => d.id === id);
    return department ? [{ id, icon: department.icon, path: departmentPath(id) }] : [];
  });

  protected readonly events = computed(() =>
    this.schedule.upcomingEvents().slice(0, GUEST_EVENTS_MAX),
  );

  /** Mapa incrustado (el mismo de Contact), en el idioma activo. */
  protected readonly mapEmbedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${encodeURIComponent(this.config.location.mapsQuery)}&hl=${this.language.current()}&z=16&output=embed`,
    ),
  );

  /**
   * El mapa de Google se carga **a petición**: hasta que se pulsa, ni cookies
   * de terceros ni ~1 MB de scripts. Debajo ya está la dirección y «Abrir en
   * Google Maps», que es lo que usa casi todo el mundo desde el teléfono.
   */
  protected readonly mapLoaded = signal(false);

  /** Aviso accesible tras descargar el contacto. */
  protected readonly contactSaved = signal(false);
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.savedTimer) clearTimeout(this.savedTimer);
    });

  }

  protected async setLanguage(code: AppLanguage): Promise<void> {
    if (code === this.language.current()) return;
    await this.language.use(code);
    // La dirección refleja el idioma (`/invitati` ↔ `/invitati/es`): quien
    // la comparta ahora la comparte en el idioma que ve, y cada idioma tiene
    // su página estática (la tarjeta de WhatsApp sale en ese idioma).
    void this.router.navigateByUrl(guestsPath(code), { replaceUrl: true });
  }

  /**
   * Chat de WhatsApp con el mensaje ya escrito. Recibe el texto por el pipe
   * `translate` de la plantilla: así cambia en cuanto llega el paquete del
   * idioma nuevo (un `instant` en un `computed` se quedaría con el anterior).
   */
  protected whatsappLink(text: string): string | null {
    return this.whatsapp ? whatsappHref(this.whatsapp, text) : null;
  }

  /** Día de la semana con mayúscula inicial («Duminică»), para la tarjeta. */
  protected weekday(iso: string): string {
    const day = this.schedule.formatWeekdayLong(iso);
    return day.charAt(0).toLocaleUpperCase(this.language.current()) + day.slice(1);
  }

  /** Baja suavemente a una sección (sin tocar la URL: el `base href` rompe los `#ancla`). */
  protected goTo(event: Event, id: string): void {
    event.preventDefault();
    const target = this.document.getElementById(id);
    if (!target) return;
    const reduce = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // El foco acompaña al salto (teclado y lector de pantalla).
    target.focus({ preventScroll: true });
  }

  /**
   * Qué culto se guarda en el calendario: el **domingo**, que es al que se
   * invita a quien viene por primera vez. Si lo próximo ya es un domingo
   * (hoy a las 18:00, por ejemplo), esa sesión; si no, la primera hora del
   * domingo que viene (10:00). Un miércoles de estudio bíblico no es la
   * primera visita que se le propone a nadie.
   */
  protected readonly calendarTarget = computed<{ iso: string; time: string; title: string } | null>(() => {
    const next = this.next();
    if (next?.day === 0) return { iso: next.iso, time: next.time, title: next.service.title };
    const sun = this.sunday();
    if (!sun) return null;
    return { iso: sun.iso, time: sun.time.split('&')[0].trim(), title: sun.title };
  });

  /**
   * El mismo domingo en **Google Calendar** (enlace con el evento ya
   * rellenado). En Android, que es la mayoría, el `.ics` se queda en
   * Descargas y nadie lo abre; el enlace abre la app de Calendar directamente.
   */
  protected readonly googleCalendarHref = computed(() => {
    const target = this.calendarTarget();
    if (!target) return null;
    this.language.current();
    return googleCalendarUrl({
      title: this.translate.instant('guests.next.calendar_title', { service: target.title }) as string,
      iso: target.iso,
      time: target.time,
      durationMin: SERVICE_DURATION_MIN,
      details: this.translate.instant('guests.next.calendar_description', {
        url: guestsUrl(this.config.publicUrl, this.language.current()),
      }) as string,
      location: this.config.location.mapsQuery,
    });
  });

  /** El domingo como evento de calendario (`.ics`). */
  protected addToCalendar(): void {
    const target = this.calendarTarget();
    if (!target) return;
    const event: UpcomingEvent = {
      // El fichero y el UID ya llevan la fecha: `serviciu-1000-2026-11-15.ics`.
      id: `serviciu-${target.time.replace(':', '')}`,
      date: target.iso,
      time: target.time,
      title: this.translate.instant('guests.next.calendar_title', { service: target.title }) as string,
      description: this.translate.instant('guests.next.calendar_description', {
        url: guestsUrl(this.config.publicUrl, this.language.current()),
      }) as string,
    };
    this.calendar.downloadEvent(event);
  }

  /** Descarga la tarjeta de contacto de la iglesia (`.vcf`). */
  protected saveContact(): void {
    const { contact, location, publicUrl } = this.config;
    const vcard = buildVCard({
      name: this.translate.instant('footer.church') as string,
      phone: contact.phone,
      email: contact.email,
      address: location.address,
      region: location.city,
      country: 'España',
      url: publicUrl,
      note: this.translate.instant('guests.first.contact.note') as string,
    });
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = 'biserica-elim-arganda.vcf';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    this.contactSaved.set(true);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.contactSaved.set(false), SAVED_NOTICE_MS);
  }
}
