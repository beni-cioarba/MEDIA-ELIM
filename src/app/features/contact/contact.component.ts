import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { IconComponent } from '../../shared/icon/icon.component';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
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

/**
 * Página de contacto.
 *
 * ── Por qué el formulario abre el gestor de correo ────────────────────
 * La web es **100 % estática** (GitHub Pages): no hay servidor que reciba un
 * `POST`. Las alternativas serían un servicio externo de formularios (una
 * dependencia más, datos personales en manos de un tercero y una cuenta que
 * mantener) o un `mailto:` compuesto. Se elige lo segundo: cero dependencias,
 * cero tratamiento de datos por nuestra parte y el visitante conserva copia de
 * lo que envía. La plantilla lo dice explícitamente para no engañar a nadie.
 *
 * Por eso tampoco hay captcha: no existe endpoint que proteger.
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TranslateModule,
    PageSectionComponent,
    IconComponent,
    CopyButtonComponent,
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(FormBuilder);

  protected readonly links = {
    weekly: blockPath('weekly'),
    donate: `/${APP_PATHS.donate}`,
    about: `/${APP_PATHS.about}`,
  } as const;

  protected readonly weeklyProgram = this.config.weeklyProgram;

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
      href: `tel:${this.config.contact.phone}`,
      copy: this.config.contact.phone,
      external: false,
    },
  ];

  /** Enlace de WhatsApp, o `null` si la iglesia no lo tiene dado de alta. */
  protected readonly whatsappUrl = this.config.contact.whatsapp
    ? `https://wa.me/${this.config.contact.whatsapp}`
    : null;

  /**
   * Mapa incrustado. Se marca como recurso de confianza porque la consulta
   * es una constante de `church.config.ts`: no hay entrada de usuario, así
   * que no existe superficie de inyección.
   */
  protected readonly mapEmbedUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(
        this.config.location.mapsQuery,
      )}&hl=es&z=16&output=embed`,
    );

  protected readonly form = this.fb.nonNullable.group({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    subject: new FormControl('', { nonNullable: true }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  /** Se ha lanzado el gestor de correo al menos una vez. */
  protected readonly sent = signal(false);

  protected submit(): void {
    if (this.form.invalid) {
      // Sin esto, los mensajes de error no aparecen hasta tocar cada campo.
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, subject, message } = this.form.getRawValue();

    // Los saltos de línea en el asunto rompen algunos clientes de correo.
    const cleanSubject = (subject.trim() || name.trim()).replace(/[\r\n]+/g, ' ');
    const body = `${message.trim()}\n\n—\n${name.trim()}\n${email.trim()}`;

    const href =
      `mailto:${this.config.contact.email}` +
      `?subject=${encodeURIComponent(cleanSubject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    this.sent.set(true);
  }

  /** `true` cuando el campo ya se ha tocado y sigue inválido. */
  protected invalid(field: 'name' | 'email' | 'subject' | 'message'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
