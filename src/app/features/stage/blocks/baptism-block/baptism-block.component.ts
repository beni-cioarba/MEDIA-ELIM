import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BaptismView, BaptismsService, CandidateView } from '../../../../core/services/baptisms.service';
import { FitToBoxDirective } from '../../../../shared/fit-to-box/fit-to-box.directive';

/** Hasta este número de candidatos el resumen los pone en una sola fila. */
const ONE_ROW_MAX = 7;

/**
 * Caracteres (mărturie + versículo) que caben en el panel a un tamaño que se
 * lee desde el fondo (≥ 3,2u). Medido a 1080p con las mărturii del
 * 22/11/2026: por encima, la diapositiva proyecta la frase destacada como
 * cita; la mărturie entera sigue en el perfil web. Una diapositiva es un
 * cartel, no un documento (`30-presentation.md` → Legibilidad).
 */
const FULL_TESTIMONY_MAX_CHARS = 480;

/**
 * Diapositiva «Botez» (sólo proyección, a sangre): **los candidatos juntos
 * y, detrás, uno por diapositiva** (`PresentationBlocksService.expand`).
 *
 *  · Candidato: el retrato de estudio entero (4:5) pegado al borde, a todo
 *    el alto, y al lado un panel navy con su nombre, sus padres, su mărturie
 *    y el versículo que eligió. El panel se ajusta entero (`appFitToBox`):
 *    la jerarquía no cambia, crece o encoge según lo que haya escrito.
 *  · Resumen: la fecha del botez y todos los retratos en fila, del mayor
 *    tamaño que cabe (una fila hasta siete; más, en dos).
 *
 * Los datos y los retratos son los del registro `/botezuri`: lo que se
 * proyecta y lo que se abre en el móvil es lo mismo. La edad y la ciudad no
 * se publican (`34-baptisms.md`), tampoco aquí.
 */
@Component({
  selector: 'app-baptism-block',
  imports: [TranslatePipe, FitToBoxDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './baptism-block.component.html',
  styleUrl: './baptism-block.component.scss',
})
export class BaptismBlockComponent {
  private readonly baptisms = inject(BaptismsService);

  readonly baptism = input<BaptismView | null>(null);
  readonly candidate = input<CandidateView | null>(null);
  readonly candidates = input<readonly CandidateView[]>([]);

  /** «duminică, 22 noiembrie 2026» en el idioma de la proyección. */
  protected readonly date = computed(() => {
    const baptism = this.baptism();
    if (!baptism) return '';
    return `${this.baptisms.formatDate(baptism.date, 'day')}, ${this.baptisms.formatDate(baptism.date)}`;
  });

  /** Fecha corta para el rótulo del candidato («22 noiembrie 2026»). */
  protected readonly shortDate = computed(() => {
    const baptism = this.baptism();
    return baptism ? this.baptisms.formatDate(baptism.date) : '';
  });

  /** Columnas y filas del resumen. */
  protected readonly grid = computed(() => {
    const n = Math.max(1, this.candidates().length);
    const cols = n <= ONE_ROW_MAX ? n : Math.ceil(n / 2);
    return { cols, rows: Math.ceil(n / cols) };
  });

  /** Nombre de pila y apellido por separado (el apellido, en la segunda línea). */
  protected nameParts(candidate: CandidateView): { readonly given: string; readonly family: string } {
    const words = candidate.name.trim().split(/\s+/);
    if (words.length < 2) return { given: candidate.name, family: '' };
    return { given: words.slice(0, -1).join(' '), family: words.at(-1) as string };
  }

  /**
   * Qué se proyecta de su mărturie: entera si cabe; si es larga, la frase
   * destacada como cita (`quote`). Sin mărturie, la frase sola (si la hay).
   */
  protected story(candidate: CandidateView): { readonly paragraphs: readonly string[]; readonly quote: string | null } {
    const story = candidate.story;
    const paragraphs = story?.testimony ?? [];
    const chars = paragraphs.join(' ').length + (story?.verse?.text.length ?? 0);
    if (paragraphs.length && (chars <= FULL_TESTIMONY_MAX_CHARS || !story?.summary)) {
      return { paragraphs, quote: null };
    }
    return { paragraphs: [], quote: story?.summary ?? null };
  }
}
