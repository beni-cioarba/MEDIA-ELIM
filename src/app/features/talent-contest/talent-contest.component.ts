import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { CalendarService } from '../../core/services/calendar.service';
import { LanguageService } from '../../core/services/language.service';
import {
  ContestPhaseView,
  TalentContestService,
} from '../../core/services/talent-contest.service';
import { contestCategory } from '../../core/talent-contest.categories';
import { ContestExamPart } from '../../core/talent-contest.config';
import { formatIsoRange, parseIsoDate } from '../../core/util/iso-date';
import { telHref, whatsappHref } from '../../core/util/contact-links';
import { youtubeThumbFallback } from '../../core/youtube-thumb';
import { IconComponent } from '../../shared/icon/icon.component';
import { ContestCategoriesComponent } from './contest-categories/contest-categories.component';

/** Parámetro de la URL con la categoría elegida (`?categoria=8-9`). */
const CATEGORY_PARAM = 'categoria';

/**
 * «Talantul în Negoț» — página `/talantul-in-negot`.
 *
 * Para **quien quiere participar** desde la iglesia: qué es, cuándo es cada
 * fase (con cuenta atrás), qué estudia su categoría, cómo es el examen, qué
 * gana y cómo se apunta. Nada de la parte de líderes (plataforma, escaneo).
 *
 * Todo el dato sale de `TALENT_CONTEST` (una edición = un fichero) y el
 * estado temporal de `TalentContestService`. La categoría elegida viaja en la
 * URL para poder enviar «mira lo tuyo» a un niño o a sus padres.
 */
@Component({
  selector: 'app-talent-contest',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, RouterLink, IconComponent, ContestCategoriesComponent],
  templateUrl: './talent-contest.component.html',
  styleUrl: './talent-contest.component.scss',
})
export class TalentContestComponent {
  protected readonly contest = inject(TalentContestService);
  private readonly church = inject(CHURCH_CONFIG);
  private readonly calendar = inject(CalendarService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly location = inject(Location);

  protected readonly config = this.contest.config;
  protected readonly phases = this.contest.phases;
  protected readonly focus = this.contest.focusPhase;

  /** Categoría elegida: la de la URL o la primera. */
  protected readonly category = signal(
    contestCategory(inject(ActivatedRoute).snapshot.queryParamMap.get(CATEGORY_PARAM)).id,
  );

  /** «talantulinnegot.com»: el dominio a la vista, para saber adónde se va. */
  protected readonly officialDomain = new URL(this.config.website).hostname.replace(/^www\./, '');
  protected readonly thumbFallback = youtubeThumbFallback;

  /** Tramos de la barra de puntos: ancho = peso en el total (100). */
  protected readonly examParts = this.config.exam.map((part) => ({
    ...part,
    total: part.items * part.points,
    share: (part.items * part.points * 100) / this.contest.examTotal,
  }));

  /** Pasos de «Cómo participar» (índices de `talent_contest.how.steps`). */
  protected readonly howSteps = [0, 1, 2, 3] as const;

  /** «13.500» con separador de miles del idioma activo (ES y RO usan punto). */
  protected readonly participants = computed(() =>
    new Intl.NumberFormat(this.language.current()).format(this.config.lastEdition.participants),
  );

  /** Primera fase (la de la iglesia), para el paso «Primera fase: sábado, 20 de marzo». */
  protected readonly firstPhaseDate = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { weekday: 'long', day: 'numeric', month: 'long' }).format(
      parseIsoDate(this.config.phases[0].start),
    ),
  );

  constructor() {
    // La URL sigue a la categoría sin navegar (el router volvería arriba).
    // La primera ejecución es la carga: la URL ya es la que es.
    let initial = true;
    effect(() => {
      const id = this.category();
      if (initial) {
        initial = false;
        return;
      }
      const params = new URLSearchParams({ [CATEGORY_PARAM]: id }).toString();
      this.location.replaceState(`/${APP_PATHS.talentContest}`, params);
    });
  }

  /** Fecha corta de una fase («20 mar.» / «6 – 8 de agosto de 2027»). */
  protected phaseDate(phase: ContestPhaseView): string {
    const lang = this.language.current();
    if (phase.end) return formatIsoRange(lang, phase.start, phase.end);
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(parseIsoDate(phase.start));
  }

  /** Fecha larga con día de la semana («sábado, 20 de marzo de 2027»). */
  protected longDate(iso: string): string {
    return new Intl.DateTimeFormat(this.language.current(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parseIsoDate(iso));
  }

  /** Clave i18n de un apartado del examen. */
  protected partKey(part: ContestExamPart, field: 'parts' | 'parts_desc'): string {
    return `talent_contest.exam.${field}.${part.id}`;
  }

  /**
   * Enlaces de las personas que inscriben (`TALENT_CONTEST.enrollers`): el
   * WhatsApp lleva el mensaje ya escrito con la edición y la categoría elegida
   * (llega traducido desde la plantilla, así cambia con el idioma).
   */
  protected readonly telHref = telHref;
  protected readonly whatsappHref = whatsappHref;

  /** Las cinco fases a un `.ics` (eventos de día completo con aviso). */
  protected addToCalendar(): void {
    const edition = this.config.edition;
    const url = `${this.church.publicUrl.replace(/\/$/, '')}/${APP_PATHS.talentContest}`;
    this.calendar.downloadAllDay(
      this.config.phases.map((phase) => ({
        id: `talantul-${edition}-${phase.id}`,
        start: phase.start,
        end: phase.end,
        title: this.translate.instant('talent_contest.calendar.event', {
          phase: this.translate.instant(`talent_contest.phases.${phase.id}`),
        }),
        description: this.translate.instant('talent_contest.calendar.description', { edition, url }),
        url,
      })),
      this.translate.instant('talent_contest.calendar.name', { edition }),
      `talantul-in-negot-${edition}.ics`,
    );
  }
}
