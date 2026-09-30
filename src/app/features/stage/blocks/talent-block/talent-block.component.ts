import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../../core/church.config';
import { APP_PATHS } from '../../../../core/navigation/app-paths';
import { LanguageService } from '../../../../core/services/language.service';
import { TalentContestService } from '../../../../core/services/talent-contest.service';
import { CONTEST_CATEGORY_IDS } from '../../../../core/talent-contest.config';
import { parseIsoDate } from '../../../../core/util/iso-date';
import { QrPanelComponent } from '../../../../shared/qr-panel/qr-panel.component';

/**
 * Diapositiva «Talantul în Negoț»: el cartel del concurso para quien quiera
 * inscribirse desde la iglesia.
 *
 * Todo en una diapositiva y de un vistazo (presupuesto de legibilidad de
 * `30-presentation.md`, nada por debajo de 3,2u):
 *  · Izquierda: qué es, las cinco fases con fecha y estado, las ocho
 *    categorías y la memorización común.
 *  · Derecha: cuenta atrás a la fase que toca y un QR a la página del
 *    concurso (`/talantul-in-negot`): inscripción, su categoría y los
 *    versículos, en el móvil.
 *
 * A sangre (`StageComponent.bleed`): superficie oscura entera con rejilla
 * técnica y halo oro, la misma línea que la página. Los versículos no se
 * cargan aquí: basta con los ids de las categorías (`CONTEST_CATEGORY_IDS`).
 */
@Component({
  selector: 'app-talent-block',
  imports: [TranslatePipe, QrPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './talent-block.component.html',
  styleUrl: './talent-block.component.scss',
})
export class TalentBlockComponent {
  private readonly contest = inject(TalentContestService);
  private readonly language = inject(LanguageService);

  protected readonly config = this.contest.config;
  protected readonly phases = this.contest.phases;
  protected readonly focus = this.contest.focusPhase;
  protected readonly categories = CONTEST_CATEGORY_IDS;

  /** QR a la página del concurso en producción (no a la URL del navegador). */
  protected readonly qrUrl = `${inject(CHURCH_CONFIG).publicUrl.replace(/\/$/, '')}/${APP_PATHS.talentContest}`;

  /**
   * «20 mar.» o, si dura varios días, «6 – 8 aug.»: corta, en una línea. La
   * forma larga («6 – 8 de agosto de 2027») ocupaba tres líneas en la columna.
   */
  protected phaseDate(start: string, end?: string): string {
    const short = new Intl.DateTimeFormat(this.language.current(), { day: 'numeric', month: 'short' });
    if (!end) return short.format(parseIsoDate(start));
    return `${parseIsoDate(start).getDate()} – ${short.format(parseIsoDate(end))}`;
  }

  /** Fecha larga de la fase que toca («sâmbătă, 20 martie»). */
  protected readonly focusDate = computed(() => {
    const phase = this.focus();
    return phase
      ? new Intl.DateTimeFormat(this.language.current(), { weekday: 'long', day: 'numeric', month: 'long' }).format(
          parseIsoDate(phase.start),
        )
      : '';
  });
}
