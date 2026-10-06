import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { ContactFormService } from '../../core/services/contact-form.service';
import { LanguageService } from '../../core/services/language.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { telHref, whatsappHref } from '../../core/util/contact-links';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { IconComponent } from '../../shared/icon/icon.component';
import { CopyButtonComponent } from '../../shared/copy-button/copy-button.component';
import { IconName } from '../../core/ui/icon-name';

/** Una vía de contacto de la columna lateral. */
interface Channel {
  readonly id: string;
  readonly icon: IconName;
  /** Valor que se muestra (dirección, correo, teléfono). */
  readonly value: string;
  /** Destino del enlace: `mailto:`, `tel:` o el mapa. `null` = sólo texto. */
  readonly href: string | null;
  /** Se copia al portapapeles; `null` si no tiene sentido copiarlo. */
  readonly copy: string | null;
  /** Se abre fuera de la app (mapas, WhatsApp). */
  readonly external: boolean;
}

/** Un humano tarda más que esto en rellenar el formulario; un bot, no. */
const MIN_FILL_MS = 3000;

/**
 * Página de contacto.
 *
 * ── Envío automático (30/09/2026) ──────────────────────────────────────
 * Antes el botón componía un `mailto:` y abría el gestor de correo del
 * visitante. Ahora se envía **por detrás** (`ContactFormService`, Web3Forms):
 * sin ventanas, con confirmación en la propia página y el aviso de que la
 * respuesta llegará por correo. La web sigue siendo estática y sin secretos:
 * la clave del servicio es pública por diseño (sólo envía al buzón de la
 * iglesia).
 *
 * Antispam sin captcha (fricción cero para una persona): campo trampa
 * invisible y tiempo mínimo de relleno; a un bot se le simula el éxito.
 * RGPD: casilla obligatoria de consentimiento con la finalidad explicada.
 */
@Component({
    selector: 'app-contact',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        ReactiveFormsModule,
        TranslatePipe,
        IconComponent,
        CopyButtonComponent,
    ],
    templateUrl: './contact.component.html',
    styleUrl: './contact.component.scss'
})
export class ContactComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(FormBuilder);
  private readonly contactForm = inject(ContactFormService);
  private readonly language = inject(LanguageService);

  protected readonly links = {
    weekly: blockPath('weekly'),
    donate: `/${APP_PATHS.donate}`,
    about: `/${APP_PATHS.about}`,
    /** Acciones directas de la cabecera. */
    tel: telHref(this.config.contact.phone),
    mailto: `mailto:${this.config.contact.email}`,
    maps: this.config.location.mapsShareUrl,
  } as const;

  /**
   * Horario: la semana en curso como calendario (lunes → domingo, con fecha
   * y días sin culto) y el culto en curso o siguiente. Misma fuente que el
   * bloque «Program săptămânal»: los dos no pueden decir cosas distintas.
   */
  protected readonly schedule = inject(ScheduleService);
  protected readonly next = this.schedule.nextService;

  /** «Hoy» / «Mañana» se traducen en la plantilla; el resto, día de la semana. */
  protected readonly nextDayLabel = computed(() => {
    const next = this.next();
    return next ? this.schedule.formatWeekdayLong(next.iso) : '';
  });

  /**
   * Vías de contacto. Se construyen aquí (y no en la plantilla) para que el
   * `href` de cada una viva junto a su validación de formato.
   */
  protected readonly channels: readonly Channel[] = [
    {
      id: 'address',
      icon: 'map-pin',
      value: `${this.config.location.address} · ${this.config.location.city}`,
      href: this.config.location.mapsShareUrl,
      copy: this.config.location.address,
      external: true,
    },
    {
      id: 'email',
      icon: 'mail',
      value: this.config.contact.email,
      href: `mailto:${this.config.contact.email}`,
      copy: this.config.contact.email,
      external: false,
    },
    {
      id: 'phone',
      icon: 'phone',
      value: this.config.contact.phoneDisplay,
      href: telHref(this.config.contact.phone),
      copy: this.config.contact.phone,
      external: false,
    },
  ];

  /** Número de WhatsApp, o `null` si la iglesia no lo tiene dado de alta. */
  protected readonly whatsapp = this.config.contact.whatsapp;

  /** Chat de WhatsApp con el saludo ya escrito (el texto llega traducido). */
  protected whatsappLink(number: string, text: string): string {
    return whatsappHref(number, text);
  }

  /**
   * Mapa incrustado. Se marca como recurso de confianza porque la consulta
   * es una constante de `church.config.ts`: no hay entrada de usuario, así
   * que no existe superficie de inyección.
   */
  protected readonly mapEmbedUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(
        this.config.location.mapsQuery,
      )}&hl=${this.language.current()}&z=16&output=embed`,
    );

  /** Longitudes máximas: coinciden con el `maxlength` de la plantilla. */
  protected readonly max = { name: 100, email: 254, subject: 150, message: 5000 } as const;

  protected readonly form = this.fb.nonNullable.group({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(this.max.name)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(this.max.email)],
    }),
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.max.subject)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(this.max.message)],
    }),
    /** RGPD: consentimiento explícito para usar los datos sólo para responder. */
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    /**
     * Campo trampa: invisible y fuera del tabulador. Una persona no lo ve;
     * un bot que rellena todo, sí. Si llega con valor, no se envía nada.
     */
    website: new FormControl('', { nonNullable: true }),
  });

  /**
   * Estado del envío. `sent` sustituye el formulario por la confirmación;
   * `error` deja el formulario (con lo escrito) y ofrece reintentar.
   */
  protected readonly status = signal<'idle' | 'sending' | 'sent' | 'error' | 'unavailable'>('idle');

  /** Nombre y correo del último envío correcto, para la confirmación. */
  protected readonly sentTo = signal<{ name: string; email: string } | null>(null);

  /** Momento en que se mostró el formulario (ver `MIN_FILL_MS`). */
  private shownAt = Date.now();

  protected async submit(): Promise<void> {
    if (this.status() === 'sending') return;
    if (this.form.invalid) {
      // Sin esto, los mensajes de error no aparecen hasta tocar cada campo.
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, subject, message, website } = this.form.getRawValue();

    // Bot (campo trampa o formulario rellenado en menos de 3 s): se simula
    // el éxito sin enviar nada, para no darle pistas de que se le ha pillado.
    if (website || Date.now() - this.shownAt < MIN_FILL_MS) {
      this.confirm(name, email);
      return;
    }

    this.status.set('sending');
    const result = await this.contactForm.send({
      name,
      email,
      subject,
      message,
      language: this.language.current(),
    });

    if (result === 'sent') {
      this.confirm(name, email);
    } else {
      // Sin clave no es un fallo de conexión: no se le pide al visitante que
      // revise su red, se le da el correo directo.
      this.status.set(result === 'not-configured' ? 'unavailable' : 'error');
    }
  }

  /** Vuelve al formulario vacío para escribir otro mensaje. */
  protected another(): void {
    this.form.reset();
    this.sentTo.set(null);
    this.status.set('idle');
    this.shownAt = Date.now();
  }

  private confirm(name: string, email: string): void {
    this.sentTo.set({ name: name.trim().split(/\s+/)[0], email: email.trim() });
    this.status.set('sent');
    this.form.reset();
  }

  /** `true` cuando el campo ya se ha tocado y sigue inválido. */
  protected invalid(field: 'name' | 'email' | 'subject' | 'message' | 'consent'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
