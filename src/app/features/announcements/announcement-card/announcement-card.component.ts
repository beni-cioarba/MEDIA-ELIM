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
import { parseIsoDate } from '../../../core/util/iso-date';
import { IconComponent } from '../../../shared/icon/icon.component';
import { FitToBoxDirective } from '../fit-to-box.directive';

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

  /**
   * Secciones que se pintan: todas en la web; en proyección se omiten las
   * marcadas `webOnly` (detalle que no cabe legible en el cartel).
   */
  protected readonly sections = computed<readonly AnnouncementSection[]>(() => {
    const all = this.current()?.sections ?? [];
    return this.presentation.isFullscreen() ? all.filter((s) => !s.webOnly) : all;
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
