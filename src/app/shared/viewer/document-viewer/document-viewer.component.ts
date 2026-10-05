import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { IconComponent } from '../../icon/icon.component';
import { CATEGORIES, resolveCategory } from '../core/document-category';
import { DocumentSourceService } from '../core/document-source.service';
import { ViewerDocument, displayName } from '../core/viewer-document.model';
import { ImageEngineComponent } from '../engines/image-engine.component';
import { MediaEngineComponent } from '../engines/media-engine.component';
import { PdfEngineComponent } from '../engines/pdf-engine.component';
import { TextEngineComponent } from '../engines/text-engine.component';
import { UnsupportedEngineComponent } from '../engines/unsupported-engine.component';

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

/**
 * Visor universal de documentos — el *shell* (adaptado de
 * `app-visor-documento` de CemenWEB).
 *
 * Pinta una **barra única compacta** (insignia de tipo, nombre y datos a la
 * izquierda; estado en el centro; herramientas a la derecha), el área de
 * contenido, que delega en el **motor** de la categoría del documento, y un
 * **panel de información** superpuesto. Las herramientas visibles dependen
 * de las capacidades de la categoría (`CATEGORIES`), no de preguntar por el
 * formato: añadir un formato nuevo no toca la barra.
 *
 * Es presentacional: no sabe de listas ni de ventanas. La navegación entre
 * documentos (flechas ‹ ›) la pide a quien lo contiene (`prev` / `next`) y
 * se pinta con un tema oscuro a pantalla completa (`mode="overlay"`) o claro
 * embebido en una página (`mode="embedded"`).
 */
@Component({
  selector: 'app-document-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IconComponent,
    ImageEngineComponent,
    PdfEngineComponent,
    MediaEngineComponent,
    TextEngineComponent,
    UnsupportedEngineComponent,
  ],
  templateUrl: './document-viewer.component.html',
  styleUrl: './document-viewer.component.scss',
  host: {
    '[class.dv--overlay]': "mode() === 'overlay'",
    '(keydown)': 'onKeydown($event)',
  },
})
export class DocumentViewerComponent {
  private readonly source = inject(DocumentSourceService);
  private readonly language = inject(LanguageService);

  readonly document = input.required<ViewerDocument>();
  readonly mode = input<'overlay' | 'embedded'>('embedded');
  /** Botón de cerrar en la barra (se oculta si el contenedor ya lo pone). */
  readonly closable = input(true);
  /** Abre con el panel de información visible. */
  readonly showDetails = input(false);

  /** Navegación entre documentos (sólo si hay una lista detrás). */
  readonly navigable = input(false);
  readonly hasPrev = input(false);
  readonly hasNext = input(false);
  /** Posición en la lista («2 / 5»), si la hay. */
  readonly position = input<{ index: number; total: number } | null>(null);

  readonly closed = output<void>();
  readonly prev = output<void>();
  readonly next = output<void>();

  // ------------------------------------------------------------------
  // Documento y categoría
  // ------------------------------------------------------------------

  protected readonly category = computed(() => resolveCategory(this.document()));
  protected readonly caps = computed(() => CATEGORIES[this.category()]);
  protected readonly name = computed(() => displayName(this.document()));

  /** Fecha en el idioma activo (`dd-mm-aaaa`, como CemenWEB). */
  protected readonly date = computed(() => {
    const iso = this.document().date;
    if (!iso) return null;
    const locale = this.language.current() === 'es' ? 'es-ES' : 'ro-RO';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(`${iso}T12:00:00`),
    );
  });

  /** Datos de la cabecera tras el nombre: tipo, fecha y extras. */
  protected readonly meta = computed(() => [
    ...(this.document().meta ?? []),
    ...(this.date() ? [this.date() as string] : []),
  ]);

  // ------------------------------------------------------------------
  // Estado de la barra (compartido con los motores que lo admiten)
  // ------------------------------------------------------------------

  protected readonly zoom = signal(100);
  protected readonly rotation = signal(0);
  protected readonly fit = signal(true);
  protected readonly wrap = signal(true);
  protected readonly panelOpen = signal(false);

  constructor() {
    // Cada documento empieza ajustado, sin girar y con su panel por defecto.
    effect(() => {
      this.document();
      untracked(() => {
        this.zoom.set(100);
        this.rotation.set(0);
        this.fit.set(true);
        this.wrap.set(true);
        this.panelOpen.set(this.showDetails());
      });
    });
  }

  protected zoomIn(): void {
    if (!this.caps().zoom) return;
    this.fit.set(false);
    this.zoom.update((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }

  protected zoomOut(): void {
    if (!this.caps().zoom) return;
    this.fit.set(false);
    this.zoom.update((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }

  protected toggleFit(): void {
    this.fit.update((f) => !f);
    if (this.fit()) this.zoom.set(100);
  }

  protected rotate(step: 90 | -90): void {
    if (!this.caps().rotate) return;
    this.rotation.update((r) => (r + step + 360) % 360);
  }

  protected readonly zoomMin = ZOOM_MIN;
  protected readonly zoomMax = ZOOM_MAX;

  // ------------------------------------------------------------------
  // Acciones sobre el fichero
  // ------------------------------------------------------------------

  protected download(): void {
    this.source.download(this.document());
  }

  protected print(): void {
    this.source.print(this.document(), this.category());
  }

  protected openTab(): void {
    this.source.openInTab(this.document());
  }

  /**
   * Atajos (con el foco dentro del visor y fuera de campos de texto):
   * `+` / `-` zoom, `0` ajustar, `R` / `Shift+R` girar, `I` información.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, video, audio')) return;
    const actions: Record<string, () => void> = {
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '0': () => this.caps().zoom && !this.fit() && this.toggleFit(),
      r: () => this.rotate(90),
      R: () => this.rotate(-90),
      i: () => this.panelOpen.update((v) => !v),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }
}
