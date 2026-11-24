import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FAQ_INDEX, HOME_FAQ } from '../../../../core/faq.config';
import { routePackLoader } from '../../../../core/i18n/route-packs';
import { TranslationPackService } from '../../../../core/i18n/translation-pack.service';
import { APP_PATHS } from '../../../../core/navigation/app-paths';
import { IconComponent } from '../../../../shared/icon/icon.component';
import { FaqListComponent } from '../faq-list/faq-list.component';

/**
 * Cierre de la portada para quien aún no ha venido: seis preguntas que se
 * contestan ahí mismo y la puerta a todas. Va con `@defer (on viewport)`: ni
 * el componente ni sus textos (paquete `faq`) pesan en la carga inicial.
 */
@Component({
  selector: 'app-faq-teaser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, FaqListComponent, IconComponent],
  templateUrl: './faq-teaser.component.html',
  styleUrl: './faq-teaser.component.scss',
})
export class FaqTeaserComponent {
  protected readonly path = `/${APP_PATHS.faq}`;
  protected readonly total = FAQ_INDEX.size;

  /** Dos columnas independientes: abrir una respuesta no mueve la otra. */
  protected readonly columns = [
    HOME_FAQ.slice(0, Math.ceil(HOME_FAQ.length / 2)),
    HOME_FAQ.slice(Math.ceil(HOME_FAQ.length / 2)),
  ];

  /** Los textos ya están: hasta entonces, sólo el hueco. */
  protected readonly ready = signal(false);

  constructor() {
    inject(TranslationPackService)
      .load('faq', routePackLoader('faq'))
      .then(() => this.ready.set(true))
      // Sin red y sin caché, la franja no sale: no hay nada que enseñar.
      .catch(() => undefined);
  }
}
