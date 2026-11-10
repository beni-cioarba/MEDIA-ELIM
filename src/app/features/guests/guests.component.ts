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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  protected readonly languages = LANGUAGES;
  protected readonly sections = GUEST_SECTIONS;
  protected readonly steps = GUEST_STEPS;
  protected readonly faq = GUEST_FAQ;
  protected readonly heroImage = this.config.aboutImage;

  /** Ruta de la página (las anclas del índice la llevan delante: el `base href` resolvería `#x` contra la portada). */
  protected readonly pagePath = `/${APP_PATHS.guests}`;

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
    // El nombre del día, en el idioma de la interfaz («Domingo»); el título
    // del culto es contenido de la iglesia y va como se publica (en rumano).
    const [iso] = nextWeeklyDates(0, new Date(this.clock.now()), 1);
    this.language.current();
    return { ...program, dayName: this.weekday(iso) };
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

  /** Aviso accesible tras descargar el contacto. */
  protected readonly contactSaved = signal(false);
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.savedTimer) clearTimeout(this.savedTimer);
    });

  }

  protected setLanguage(code: AppLanguage): void {
    if (code === this.language.current()) return;
    void this.language.use(code);
    // La dirección refleja el idioma: quien la comparta ahora la comparte en
    // el idioma que ve (`?lang=es`; el rumano, por defecto, sin parámetro).
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lang: code === 'es' ? 'es' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      preserveFragment: true,
    });
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

  /** El próximo culto como evento de calendario (`.ics`). */
  protected addToCalendar(): void {
    const next = this.next();
    if (!next) return;
    const event: UpcomingEvent = {
      // El fichero y el UID ya llevan la fecha: `serviciu-2030-2026-11-09.ics`.
      id: `serviciu-${next.time.replace(':', '')}`,
      date: next.iso,
      time: next.time,
      title: this.translate.instant('guests.next.calendar_title', { service: next.service.title }) as string,
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
