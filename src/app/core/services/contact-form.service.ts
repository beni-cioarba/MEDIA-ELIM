import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { CHURCH_CONFIG } from '../church.config';
import { LoggerService } from './logger.service';

/** Lo que escribe el visitante (ya validado por el formulario). */
export interface ContactMessage {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
  /** Idioma de la web al enviar (para contestar en el mismo). */
  readonly language: string;
}

/**
 * Resultado del envío:
 *  · `sent`           el servicio confirmó el envío.
 *  · `not-configured` falta la clave (`contact.form.accessKey`).
 *  · `failed`         error de red, tiempo agotado o rechazo del servicio.
 */
export type ContactSendResult = 'sent' | 'not-configured' | 'failed';

/** Respuesta de Web3Forms. */
interface Web3FormsResponse {
  readonly success: boolean;
  readonly message?: string;
}

/** Más de esto sin respuesta = fallo (la red del móvil puede colgarse). */
const TIMEOUT_MS = 15_000;

/**
 * Envía el formulario de contacto **por detrás**, sin abrir el gestor de
 * correo del visitante: `POST` JSON a Web3Forms, que lo entrega al buzón de la
 * iglesia (ver `ContactFormConfig` en `church.config.ts`).
 *
 * El correo sale con:
 *  · Asunto «[Web] <asunto> · <nombre>», para filtrarlo y reconocerlo.
 *  · «Responder a» = el visitante (Web3Forms usa el campo `email`): el pastor
 *    contesta desde Gmail sin copiar nada.
 *  · Remitente visible «Web Iglesia Elim».
 *
 * Nunca lanza: devuelve un resultado que la página traduce a un mensaje.
 */
@Injectable({ providedIn: 'root' })
export class ContactFormService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CHURCH_CONFIG);
  private readonly log = inject(LoggerService).prefix('contact-form');

  /** `false` mientras no haya clave: la página lo avisa antes de escribir. */
  readonly configured = this.config.contact.form.accessKey !== null;

  async send(msg: ContactMessage): Promise<ContactSendResult> {
    const { endpoint, accessKey } = this.config.contact.form;
    if (!accessKey) {
      this.log.warn('Formulario sin clave de Web3Forms (contact.form.accessKey).');
      return 'not-configured';
    }

    // Sin saltos de línea en lo que acaba en cabeceras del correo.
    const oneLine = (text: string) => text.replace(/[\r\n]+/g, ' ').trim();
    const name = oneLine(msg.name);
    const subject = oneLine(msg.subject) || 'Mensaje de contacto';

    try {
      const response = await firstValueFrom(
        this.http
          .post<Web3FormsResponse>(
            endpoint,
            {
              access_key: accessKey,
              subject: `[Web] ${subject} · ${name}`,
              from_name: 'Web Iglesia Elim',
              name,
              email: oneLine(msg.email),
              message: msg.message.trim(),
              language: msg.language,
              page: this.config.publicUrl,
            },
            { headers: { Accept: 'application/json' } },
          )
          .pipe(timeout(TIMEOUT_MS)),
      );
      if (response.success) return 'sent';
      this.log.warn('Web3Forms rechazó el envío.', response.message);
      return 'failed';
    } catch (err) {
      this.log.warn('No se pudo enviar el formulario.', err);
      return 'failed';
    }
  }
}
