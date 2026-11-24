import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { FAQ_GROUPS, FAQ_INDEX, FaqGroup } from '../../core/faq.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { fold, queryTerms, stem } from '../../core/search/search-text';
import { LanguageService } from '../../core/services/language.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { telHref, whatsappHref } from '../../core/util/contact-links';
import { IconName } from '../../core/ui/icon-name';
import { IconComponent } from '../../shared/icon/icon.component';
import { FaqListComponent } from './public/faq-list/faq-list.component';
import { FaqParamsService } from './public/faq-params.service';
import { splitColumns } from './faq.view';

/** Un grupo con las preguntas que quedan tras buscar. */
interface GroupView {
  readonly id: string;
  readonly icon: IconName;
  readonly ids: readonly string[];
}

/** Con tantos resultados o menos, se abren: un resultado plegado no responde. */
const OPEN_RESULTS = 3;

/**
 * «Întrebări frecvente» (`/intrebari-frecvente`): todas las preguntas, por
 * temas y en dos columnas, con buscador y lo práctico a la vista (próximo
 * culto, dirección, teléfono, directo).
 *
 * Una pregunta tiene dirección propia: `#parking` la abre y baja a ella.
 * Estructura en `core/faq.config.ts`; textos en el paquete `faq`.
 */
@Component({
  selector: 'app-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, FaqListComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly schedule = inject(ScheduleService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly params = inject(FaqParamsService).params;
  private readonly document = inject(DOCUMENT);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly path = `/${APP_PATHS.faq}`;
  protected readonly groups = FAQ_GROUPS;

  protected readonly links = {
    weekly: blockPath('weekly'),
    streams: blockPath('streams'),
    location: blockPath('location'),
    tel: telHref(this.config.contact.phone),
    mailto: `mailto:${this.config.contact.email}`,
  } as const;

  // ---- Lo práctico ------------------------------------------------------

  protected readonly next = computed(() => {
    const next = this.schedule.nextService();
    if (!next) return null;
    this.language.current();
    const day = this.schedule.formatWeekdayLong(next.iso);
    return {
      live: next.isLive,
      today: next.daysAway === 0,
      day: day.charAt(0).toLocaleUpperCase() + day.slice(1),
      time: next.time,
      title: next.service.title,
    };
  });

  // ---- Buscador ---------------------------------------------------------

  protected readonly query = signal('');

  /** Texto plegado de cada pregunta: pregunta, respuesta y sinónimos (el tema no: «botez» traería el suyo entero). */
  private readonly haystack = computed<ReadonlyMap<string, string>>(() => {
    this.translate.currentLang();
    const t = (key: string): string => this.translate.instant(key, this.params());
    return new Map(
      FAQ_GROUPS.flatMap((group) =>
        group.items.map(({ id }): [string, string] => [
          id,
          fold(['q', 'a', 'k'].map((k) => t(`faq.items.${id}.${k}`)).join(' ')),
        ]),
      ),
    );
  });

  protected readonly filtering = computed(() => this.query().trim() !== '');

  private readonly found = computed<ReadonlySet<string>>(() => {
    if (!this.filtering()) return new Set(FAQ_INDEX.keys());
    const terms = queryTerms(this.query()).map((t) => stem(t.text));
    return new Set(
      [...this.haystack()].filter(([, text]) => terms.every((term) => text.includes(term))).map(([id]) => id),
    );
  });

  protected readonly count = computed(() => this.found().size);

  private readonly visible = computed<readonly GroupView[]>(() => {
    const found = this.found();
    return (FAQ_GROUPS as readonly FaqGroup[])
      .map((group) => ({
        id: group.id,
        icon: group.icon,
        ids: group.items.map((item) => item.id).filter((id) => found.has(id)),
      }))
      .filter((group) => group.ids.length > 0);
  });

  /** Dos columnas seguidas (se lee una y después la otra), equilibradas por filas. */
  protected readonly columns = computed(() => splitColumns(this.visible(), (group) => group.ids.length));

  /**
   * Preguntas a las que se ha llegado por enlace (`#parking`). Se suman: cerrar
   * la anterior movería la página justo cuando el router baja a la nueva.
   */
  private readonly targets = signal<readonly string[]>([]);

  /** Abiertas desde fuera (la del enlace y, al buscar, los pocos resultados); el resto lo lleva cada `<details>`. */
  protected readonly openIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set(this.targets());
    if (this.filtering() && this.count() <= OPEN_RESULTS) for (const id of this.found()) ids.add(id);
    return ids;
  });

  constructor() {
    // El router desplaza hasta el ancla; aquí sólo se abre (y, si había una
    // búsqueda puesta, se quita: podría estar escondiéndola).
    inject(ActivatedRoute)
      .fragment.pipe(takeUntilDestroyed())
      .subscribe((fragment) => {
        if (!fragment || !FAQ_INDEX.has(fragment)) return;
        this.query.set('');
        this.targets.update((ids) => [...ids, fragment]);
      });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.query.set('');
    this.input().nativeElement.focus();
  }

  /** Chat de WhatsApp con el mensaje ya escrito (llega traducido por el pipe). */
  protected whatsapp(text: string): string | null {
    const number = this.config.contact.whatsapp;
    return number ? whatsappHref(number, text) : null;
  }

  /** Baja a un tema sin ensuciar el historial (el `base href` rompe los `#ancla`). */
  protected goTo(event: Event, id: string): void {
    event.preventDefault();
    const target = this.document.getElementById(id);
    if (!target) return;
    const reduce = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
}
