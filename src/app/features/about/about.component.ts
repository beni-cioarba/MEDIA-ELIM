import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ViewableDirective } from '../../shared/viewer/viewable.directive';
import { ViewerDocument } from '../../shared/viewer/core/viewer-document.model';
import { TranslateService } from '@ngx-translate/core';
import { IconName } from '../../core/ui/icon-name';
import { CREDO_ARTICLE_COUNT, CREDO_PARTS, citarArticulo } from '../credo/credo.data';
import { ScheduleService } from '../../core/services/schedule.service';
import { LanguageService } from '../../core/services/language.service';
import {
  STORY_CHAPTERS,
  STORY_ERAS,
  STORY_FACTS,
  STORY_FACTS_AS_OF,
  STORY_WORKS,
  StoryEra,
  StoryMilestone,
} from './about-story.data';

/** Pilar de identidad (misión, visión, valores…). */
interface Pillar {
  readonly id: string;
  readonly icon: IconName;
  /**
   * Artículo de la confesión de fe que sostiene este pilar.
   *
   * No es decoración: es lo que separa «cuatro frases bonitas que valdrían
   * para cualquier congregación» de **lo que esta iglesia confiesa por
   * escrito**. El texto de la tarjeta resume el artículo y el enlace lleva a
   * leerlo entero, abierto por el ancla.
   */
  readonly article: string;
}

/** Hito listo para pintar: fecha en el idioma activo y enlace a la grabación. */
interface MilestoneView extends StoryMilestone {
  readonly label: string;
  readonly iso: string;
  readonly url: string | null;
}

/** Época lista para pintar (numeral romano y hitos resueltos). */
interface EraView extends Omit<StoryEra, 'milestones'> {
  readonly numeral: string;
  readonly milestones: readonly MilestoneView[];
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Un pilar con su artículo ya resuelto (número y enlace). */
interface PillarView extends Pillar {
  readonly n: number;
  readonly fragment: string;
}

/**
 * «Quiénes somos»: historia, identidad, confesión de fe y qué esperar en una
 * primera visita.
 *
 * Los identificadores de los bloques (`pillars`, `expectations`) viven aquí
 * como datos; los textos, en `about.*` de los ficheros i18n. La confesión de
 * fe sólo se resume: el documento íntegro es su propia página
 * (`features/credo`), porque son 30 artículos y aquí sólo cabe el mapa.
 */
@Component({
    selector: 'app-about',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TranslatePipe, PageSectionComponent, IconComponent, ViewableDirective],
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss'
})
export class AboutComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly schedule = inject(ScheduleService);

  /** «Povestea noastră»: capítulos, cifras y obras (`about-story.data.ts`). */
  protected readonly chapters = STORY_CHAPTERS;
  protected readonly facts = STORY_FACTS;
  protected readonly works = STORY_WORKS;

  /**
   * Cronología por épocas, con la fecha de cada hito en el idioma activo:
   * «2001», «nov. 2001» / «nov 2001» o «18 oct. 2026», según lo que se sepa.
   */
  protected readonly eras = computed<readonly EraView[]>(() => {
    const lang = this.language.current();
    const month = new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric' });
    const day = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' });
    const label = (date: string): string => {
      const [y, m, d] = date.split('-').map(Number);
      if (!m) return String(y);
      return (d ? day : month).format(new Date(y, m - 1, d || 1));
    };
    return STORY_ERAS.map((era, i) => ({
      ...era,
      numeral: NUMERALS[i] ?? String(i + 1),
      milestones: era.milestones.map((m) => ({
        ...m,
        label: label(m.date),
        iso: m.date,
        url: m.video ? `https://www.youtube.com/watch?v=${m.video}` : null,
      })),
    }));
  });
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  /** La foto de la historia, para el visor (nombre = su `alt`, en el idioma activo). */
  protected readonly storyPhoto = computed<ViewerDocument>(() => {
    this.language.current();
    return {
      src: this.config.aboutImage.src,
      srcset: this.config.aboutImage.srcset,
      name: this.translate.instant('about.story.image_alt'),
    };
  });
  /** «2026-10» → «octombrie 2026» / «octubre de 2026», en el idioma activo. */
  protected readonly factsAsOf = computed(() => {
    const [year, month] = STORY_FACTS_AS_OF.split('-').map(Number);
    return new Intl.DateTimeFormat(this.language.current(), { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1),
    );
  });

  protected readonly links = {
    leadership: `/${APP_PATHS.leadership}`,
    credo: `/${APP_PATHS.credo}`,
    weekly: blockPath('weekly'),
    location: blockPath('location'),
  } as const;

  /**
   * Los cinco pilares: **las obras que el artículo 16 da a la Iglesia**.
   *
   * No son un encuadre elegido por nosotros. El artículo 16 las enumera
   * literalmente —«sus obras principales son la adoración, el anuncio del
   * Evangelio, la formación de discípulos, el servicio y la comunión»— y ésta
   * es esa lista, en ese orden.
   *
   * Antes había cuatro pilares con nombres de manual de empresa
   * (misión / visión / comunidad / servicio) y textos que valdrían para
   * cualquier congregación del mundo. Que una iglesia diga lo que hace con
   * las palabras de su propia confesión es más honesto y más concreto.
   *
   * Cada uno remite además al artículo que desarrolla esa obra, no al 16 cinco
   * veces: el 16 dice *qué* hace la Iglesia, y estos dicen *qué significa*.
   */
  private readonly pillarData: readonly Pillar[] = [
    // La adoración no tiene artículo propio: el 16 es donde se la nombra.
    { id: 'worship', icon: 'music', article: 'church' },
    // El Evangelio se recibe «por fe y arrepentimiento» (art. 9).
    { id: 'gospel', icon: 'megaphone', article: 'conversion' },
    // Hacer discípulos es acompañar la santificación (art. 11).
    { id: 'discipleship', icon: 'book', article: 'sanctification' },
    // Servir es amar a todos sin discriminación (art. 29).
    { id: 'service', icon: 'heart', article: 'love' },
    // La Cena «fortalece la unidad de los creyentes» (art. 19).
    { id: 'fellowship', icon: 'users', article: 'lords_supper' },
  ];

  /**
   * Los pilares con el número de artículo resuelto desde `credo.data.ts`.
   *
   * El número se busca, no se escribe a mano: si mañana se reordena la
   * confesión, la referencia sigue apuntando al artículo correcto en vez de
   * quedarse mintiendo.
   */
  protected readonly pillars: readonly PillarView[] = this.pillarData.map((pilar) => ({
    ...pilar,
    ...citarArticulo(pilar.article),
  }));

  /**
   * Partes de la confesión de fe, sólo para el avance de esta página.
   * La fuente única sigue siendo `features/credo/credo.data.ts`.
   */
  protected readonly credoParts = CREDO_PARTS;
  protected readonly credoTotal = CREDO_ARTICLE_COUNT;

  /**
   * Qué encontrará alguien que nos visita por primera vez, **en orden**.
   *
   * Son ids a secas, sin icono: antes se tipaban como `Pillar` y arrastraban
   * un icono cada uno que la plantilla nunca pintó —cuatro datos muertos—.
   * Ahora el bloque se numera, y el número lo pone el propio índice del
   * bucle, así que la lista no necesita nada más que el orden.
   */
  protected readonly expectations: readonly string[] = ['welcome', 'worship', 'word', 'family'];

  protected readonly years = computed(
    () => new Date().getFullYear() - this.config.foundedYear,
  );
}
