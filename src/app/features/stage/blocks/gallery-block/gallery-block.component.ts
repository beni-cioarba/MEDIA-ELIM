import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG, MediaEvent } from '../../../../core/church.config';
import { PresentationService } from '../../../../core/presentation.service';
import { CarouselService } from '../../../../core/services/carousel.service';
import { ClockService } from '../../../../core/services/clock.service';

/** Cadencia del sub-carrusel de eventos destacados de la galería. */
const FEATURED_ROTATION_MS = 4_500;

/**
 * Bloque «Galería»: hero rotatorio con el evento destacado + mosaico de
 * miniaturas seleccionables que enlazan al directorio público de Drive.
 */
@Component({
  selector: 'app-gallery-block',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-block.component.html',
  styles: [':host { display: contents; }'],
})
export class GalleryBlockComponent {
  protected readonly config = inject(CHURCH_CONFIG);
  private readonly presentation = inject(PresentationService);
  private readonly carousel = inject(CarouselService);
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fullscreen = this.presentation.isFullscreen;
  protected readonly featuredEventIndex = signal<number>(0);

  constructor() {
    const timer = setInterval(() => {
      if (!this.clock.pageVisible()) return;
      // En proyección sólo rota mientras la galería es el slide visible;
      // fuera de proyección todo está a la vista, así que rota siempre.
      if (this.fullscreen() && !this.carousel.isActive('gallery')) return;
      const total = this.config.mediaEvents.length;
      if (total === 0) return;
      this.featuredEventIndex.update((i) => (i + 1) % total);
    }, FEATURED_ROTATION_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected selectFeaturedEvent(index: number): void {
    this.featuredEventIndex.set(index);
  }

  protected eventGradient(event: MediaEvent): string {
    const [from, to] = event.gradient;
    return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  }
}
