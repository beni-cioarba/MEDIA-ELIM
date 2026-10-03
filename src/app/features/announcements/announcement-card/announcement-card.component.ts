import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Announcement, AnnouncementSection } from '../../../core/church.config';
import { PresentationService } from '../../../core/presentation.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import type { SlidePage } from '../../../core/services/presentation-blocks.service';
import { parseIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';
import { FitToBoxDirective } from '../../../shared/fit-to-box/fit-to-box.directive';

/**
 * Tarjeta de anuncio — **el único renderizador** de un `Announcement`.
 *
 * La misma tarjeta se pinta en tres sitios: la página `/anunturi`, el enlace
 * propio `/anunturi/<id>` y la diapositiva proyectada en el templo. Por eso:
 *
 *  - Es contenido **estructurado** (ficha de fecha, insignia, título, meta,
 *    resumen, secciones en columnas con su tipo —precios, personas,
 *    programa—, nota) y no HTML libre: así cualquier anuncio nuevo sale bien
 *    sin diseñar una plantilla a medida, y la proyección puede garantizar
 *    que cabe (`appFitToBox`).
 *  - Usa `ViewEncapsulation.None` con clases BEM `.announcement__*`, como los
 *    bloques del escenario: la hoja de proyección necesita alcanzar estas
 *    clases para reescalarlas con la unidad `--pj-u`. Los overrides de
 *    proyección viven **en esta misma hoja** (`.stage.is-fullscreen
 *    .announcement…`), porque el componente es dueño de sus dos contextos y
 *    la hoja del escenario está al límite de su presupuesto.
 */
@Component({
    selector: 'app-announcement-card',
    imports: [TranslatePipe, IconComponent, FitToBoxDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    templateUrl: './announcement-card.component.html',
    styleUrl: './announcement-card.component.scss'
})
export class AnnouncementCardComponent {
  protected readonly schedule = inject(ScheduleService);
  private readonly translate = inject(TranslateService);
  private readonly presentation = inject(PresentationService);

  private readonly current = signal<Announcement | null>(null);
  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  @Input({ required: true }) set announcement(value: Announcement) {
    this.current.set(value);
  }
  get announcement(): Announcement {
    // `required` garantiza que el input llega antes del primer render.
    return this.current() as Announcement;
  }

  private readonly currentPart = signal<SlidePage | null>(null);

  /**
   * Parte proyectada de un anuncio en varias diapositivas («1/2», «2/2»), o
   * `null` si se pinta entero (la web, o un anuncio de una sola parte).
   */
  @Input() set part(value: SlidePage | null) {
    this.currentPart.set(value);
  }

  /** La parte en curso, si el anuncio se proyecta en varias. */
  protected readonly page = computed<SlidePage | null>(() =>
    this.presentation.isFullscreen() ? this.currentPart() : null,
  );

  /** La primera parte (o el anuncio entero) lleva el resumen. */
  protected readonly isFirstPart = computed<boolean>(() => (this.page()?.index ?? 0) === 0);

  /** La última parte (o el anuncio entero) lleva la nota y el versículo. */
  protected readonly isLastPart = computed<boolean>(() => {
    const page = this.page();
    return !page || page.index === page.total - 1;
  });

  /**
   * Secciones que se pintan: todas en la web; en proyección se omiten las
   * marcadas `webOnly` y, si el anuncio va en partes, sólo las de esta parte.
   */
  protected readonly sections = computed<readonly AnnouncementSection[]>(() => {
    const all = this.current()?.sections ?? [];
    if (!this.presentation.isFullscreen()) return all;
    const page = this.page();
    return all.filter((s) => !s.webOnly && (!page || (s.part ?? 1) === page.index + 1));
  });

  /** Día del mes para la ficha de fecha («18»). */
  protected readonly day = computed<string>(() => {
    const iso = this.current()?.date;
    return iso ? String(parseIsoDate(iso).getDate()) : '';
  });

  /** Mes abreviado y localizado para la ficha («oct»); se recalcula al cambiar de idioma. */
  protected readonly monthShort = computed<string>(() => {
    this.langChange();
    const iso = this.current()?.date;
    if (!iso) return '';
    const lang = this.translate.getCurrentLang() ?? this.translate.getFallbackLang() ?? 'ro';
    try {
      return new Intl.DateTimeFormat(lang, { month: 'short' })
        .format(parseIsoDate(iso))
        .replace(/\.$/, '');
    } catch {
      return iso.slice(5, 7);
    }
  });
}
