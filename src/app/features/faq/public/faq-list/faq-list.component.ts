import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';
import { FAQ_INDEX, FaqItem } from '../../../../core/faq.config';
import { APP_PATHS } from '../../../../core/navigation/app-paths';
import { LanguageService } from '../../../../core/services/language.service';
import { telHref, whatsappHref } from '../../../../core/util/contact-links';
import { withShareLang } from '../../../../core/util/share-lang';
import { CopyButtonComponent } from '../../../../shared/copy-button/copy-button.component';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { FaqParamsService } from '../faq-params.service';

const NONE: ReadonlySet<string> = new Set();

/**
 * Lista de preguntas desplegables. La misma en la página, en Invitați y en la
 * portada: se le dan los ids y ella pone texto, respuesta y acciones.
 *
 * `<details>` nativo: accesible, indexable, sin JavaScript y «buscar en la
 * página» del navegador abre la respuesta que coincide.
 *
 * Los textos van en el paquete `faq`: quien la use lo carga antes
 * (`routePacks('faq')` o `TranslationPackService`).
 */
@Component({
  selector: 'app-faq-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, CopyButtonComponent, IconComponent],
  templateUrl: './faq-list.component.html',
  styleUrl: './faq-list.component.scss',
})
export class FaqListComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly language = inject(LanguageService);
  protected readonly params = inject(FaqParamsService).params;

  /** Preguntas, en orden. */
  readonly ids = input.required<readonly string[]>();
  /** Preguntas abiertas desde fuera (enlace directo, búsqueda). */
  readonly openIds = input<ReadonlySet<string>>(NONE);
  /** Con nombre, sólo una abierta a la vez entre las listas que lo compartan. */
  readonly exclusive = input<string | null>(null);
  /** Pone el ancla de cada pregunta y el botón de copiar su enlace (sólo en la página). */
  readonly anchors = input(false);

  protected readonly items = computed<readonly FaqItem[]>(() =>
    this.ids().flatMap((id) => FAQ_INDEX.get(id) ?? []),
  );

  protected readonly tel = telHref(this.config.contact.phone);
  protected readonly external = {
    youtube: this.config.youtubeChannelUrl,
    maps: this.config.location.mapsShareUrl,
  } as const;

  /** Chat de WhatsApp con el mensaje ya escrito (llega traducido por el pipe). */
  protected whatsapp(text: string): string | null {
    const number = this.config.contact.whatsapp;
    return number ? whatsappHref(number, text) : null;
  }

  /** Dirección pública de una respuesta, en el idioma en que se lee. */
  protected linkOf(id: string): string {
    const base = this.config.publicUrl.replace(/\/+$/, '');
    return withShareLang(`${base}/${APP_PATHS.faq}/#${id}`, this.language.current());
  }
}
