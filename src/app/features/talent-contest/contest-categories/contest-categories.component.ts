import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  model,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { TalentContestService } from '../../../core/services/talent-contest.service';
import { CONTEST_CATEGORIES, contestCategory } from '../../../core/talent-contest.categories';
import { parseIsoDate } from '../../../core/util/iso-date';
import { CopyButtonComponent } from '../../../shared/copy-button/copy-button.component';

/**
 * Lo que tiene que estudiar cada categoría: libros, los diez versículos y la
 * memorización común.
 *
 * Selector como `radiogroup` con «roving tabindex» (una sola parada de Tab,
 * flechas para moverse), el patrón accesible para elegir uno entre varios.
 * La categoría elegida es de la página (`selected`, bidireccional): la usa
 * también el botón «Quiero participar» para decir en qué categoría te apuntas.
 */
@Component({
  selector: 'app-contest-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, CopyButtonComponent],
  templateUrl: './contest-categories.component.html',
  styleUrl: './contest-categories.component.scss',
})
export class ContestCategoriesComponent {
  protected readonly contest = inject(TalentContestService);
  private readonly language = inject(LanguageService);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  /** Id de la categoría elegida. */
  readonly selected = model.required<string>();

  protected readonly categories = CONTEST_CATEGORIES;
  protected readonly category = computed(() => contestCategory(this.selected()));

  /** Fecha de corte de «35+» («1 de enero de 2027»), en el idioma activo. */
  protected readonly cutoff = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { dateStyle: 'long' }).format(
      parseIsoDate(this.contest.config.seniorCutoff),
    ),
  );

  /** Lista para copiar y estudiar fuera (una línea por versículo). */
  protected readonly copyText = computed(() =>
    this.category()
      .verses.map((v) => `${v.ref} — ${v.text}`)
      .join('\n'),
  );

  protected pick(id: string): void {
    this.selected.set(id);
  }

  /** Flechas / Inicio / Fin dentro del grupo; el foco sigue a la selección. */
  protected onKeydown(event: KeyboardEvent, index: number): void {
    const last = this.categories.length - 1;
    const target =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    this.pick(this.categories[target].id);
    this.host.querySelectorAll<HTMLButtonElement>('.tcc__chip')[target]?.focus();
  }
}
