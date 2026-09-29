import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FamilyPrayerService,
  PrayerWeekView,
} from '../../../core/services/family-prayer.service';
import { FitToBoxDirective } from '../../../shared/fit-to-box/fit-to-box.directive';
import { FamilyPhotoComponent } from '../family-photo/family-photo.component';
import { JustifiedLayout, justifiedLayout } from './justified-layout';

/** Ancho mínimo de la columna de la lista, en unidades de diapositiva (u). */
const SIDE_MIN_U = 56;
/** Separación entre fotos y entre columna y collage (u). */
const GAP_U = 1.2;

/**
 * Resumen **proyectado** de la semana: el collage del PowerPoint de la
 * iglesia, hecho a medida.
 *
 *   ┌───────────────┬──────────────────────────────┐
 *   │ RUGĂCIUNE…    │  [foto]      [foto]           │
 *   │ 28 sept–4 oct │  [foto][foto][foto]           │
 *   │ Bena …        │                               │
 *   │ Bindea …      │   fotos enteras, a su         │
 *   │               │   proporción, sin huecos      │
 *   └───────────────┴──────────────────────────────┘   (a sangre: pantalla entera)
 *
 * Las fotos se colocan en filas justificadas (`justifiedLayout`): enteras,
 * a su proporción y cubriendo el máximo de la caja. La columna de la lista
 * se queda con **todo el ancho que el collage no usa**, así no queda hueco
 * ni con fotos muy verticales. Sin numeración: la lista va en el mismo orden
 * en que se leen las fotos (izquierda → derecha, arriba → abajo).
 *
 * Sólo proyección: la web usa `FamilySummaryComponent` (mosaico enlazado).
 */
@Component({
  selector: 'app-family-collage',
  imports: [TranslatePipe, FitToBoxDirective, FamilyPhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './family-collage.component.html',
  styleUrl: './family-collage.component.scss',
})
export class FamilyCollageComponent {
  protected readonly prayer = inject(FamilyPrayerService);
  /** La diapositiva entera (lista + collage): la caja que se reparte. */
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  private readonly week$ = signal<PrayerWeekView | null>(null);

  @Input({ required: true })
  set week(value: PrayerWeekView) {
    this.week$.set(value);
  }
  get week(): PrayerWeekView {
    return this.week$()!;
  }

  /** Caja del componente en px y la unidad de diapositiva en px. */
  private readonly box = signal<{ width: number; height: number; unit: number } | null>(null);

  constructor() {
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => zone.run(() => this.measure()));
      zone.runOutsideAngular(() => observer.observe(this.stage().nativeElement));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** El collage: filas justificadas en lo que deja la columna mínima de la lista. */
  protected readonly layout = computed<JustifiedLayout | null>(() => {
    const box = this.box();
    const week = this.week$();
    if (!box || !week) return null;
    const gap = GAP_U * box.unit;
    const width = box.width - SIDE_MIN_U * box.unit - gap;
    const ratios = week.families.map((family) => family.photo?.ratio ?? 0.8);
    return justifiedLayout(ratios, width, box.height, gap);
  });

  protected readonly gapPx = computed(() => (this.box()?.unit ?? 0) * GAP_U);


  private measure(): void {
    const { width, height } = this.stage().nativeElement.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    // La unidad de diapositiva (`--pj-u` = min(1vh, 0,5625vw)) en px.
    const unit = Math.min(window.innerHeight / 100, window.innerWidth * 0.005625);
    const current = this.box();
    if (current && current.width === width && current.height === height && current.unit === unit) return;
    this.box.set({ width, height, unit });
  }
}
