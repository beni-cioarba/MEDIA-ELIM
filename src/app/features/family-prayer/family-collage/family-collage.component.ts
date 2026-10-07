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
import { EvenRowsLayout, evenRowsLayout } from './even-rows-layout';

/** Ancho mínimo de la columna de la lista, en unidades de diapositiva (u). */
const SIDE_MIN_U = 56;
/** Separación entre fotos (u). */
const GAP_U = 1.6;
/**
 * Margen alrededor del collage (u), igual en los cuatro lados: las fotos
 * flotan sobre el navy y ninguna toca el borde de la pantalla ni la lista
 * (si unas tocan el borde y otras no, el conjunto parece descuadrado).
 */
const PAD_U = 3;

/**
 * Resumen **proyectado** de la semana: el collage del PowerPoint de la
 * iglesia, hecho a medida.
 *
 *   ┌───────────────┬──────────────────────────────┐
 *   │ RUGĂCIUNE…    │ [   foto   ][  foto  ]        │
 *   │ 28 sept–4 oct │ [ foto ][ foto ][ foto ]       │
 *   │ Bena …        │                               │
 *   │ Biriș …       │  filas de la misma altura,     │
 *   │               │  bloque rectangular exacto     │
 *   └───────────────┴──────────────────────────────┘   (a sangre: pantalla entera)
 *
 * **Todas las familias pesan lo mismo**: todas las fotos tienen la misma
 * altura (las personas salen a la misma escala) y forman un rectángulo
 * exacto (`evenRowsLayout`, con el porqué y las alternativas descartadas).
 * Fotos siempre enteras; si un marco es algo más ancho que su foto, el margen
 * lo rellena ella misma difuminada. La columna de la lista se queda con
 * **todo el ancho que el collage no usa**. Sin numeración: la lista va en el mismo
 * orden en que se leen las fotos (izquierda → derecha, arriba → abajo).
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

  /** El collage: filas de igual altura en lo que deja la columna mínima de la lista. */
  protected readonly layout = computed<EvenRowsLayout | null>(() => {
    const box = this.box();
    const week = this.week$();
    if (!box || !week) return null;
    const gap = GAP_U * box.unit;
    const pad = PAD_U * box.unit;
    const width = box.width - SIDE_MIN_U * box.unit - 2 * pad;
    const ratios = week.families.map((family) => family.photo?.ratio ?? 0.8);
    return evenRowsLayout(ratios, width, box.height - 2 * pad, gap);
  });

  protected readonly gapPx = computed(() => (this.box()?.unit ?? 0) * GAP_U);
  protected readonly padPx = computed(() => (this.box()?.unit ?? 0) * PAD_U);

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
