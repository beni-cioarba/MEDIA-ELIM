import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { PresentationService } from '../../core/presentation.service';
import { YouTubeService } from '../../core/youtube.service';
import { CarouselService } from '../../core/services/carousel.service';
import { PresentationBlocksService } from '../../core/services/presentation-blocks.service';
import { StageBlockId, blockIdFromSlug } from '../../core/navigation/app-paths';
import { QrPanelComponent } from '../../shared/qr-panel/qr-panel.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';
import { PresentationSettingsComponent } from '../../shared/presentation-settings/presentation-settings.component';
import { SocialsBlockComponent } from './blocks/socials-block/socials-block.component';
import { StreamsBlockComponent } from './blocks/streams-block/streams-block.component';
import { GalleryBlockComponent } from './blocks/gallery-block/gallery-block.component';
import { WeeklyBlockComponent } from './blocks/weekly-block/weekly-block.component';
import { UpcomingBlockComponent } from './blocks/upcoming-block/upcoming-block.component';
import { LocationBlockComponent } from './blocks/location-block/location-block.component';

/**
 * Escenario multimedia (`.stage`) — el módulo que se proyecta en el templo.
 *
 * Sirve **tres** modos con un único componente (y por tanto un único chunk y
 * una única hoja de estilos):
 *  - `/media`          → todos los bloques, uno debajo de otro.
 *  - `/media/:blockId` → un bloque como página propia (enlaces del menú).
 *  - pantalla completa → carrusel con los bloques activos.
 *
 * El contenido vive en `./blocks/*` y el estado en `core/services`:
 *  - `CarouselService`           → slide activo, pausa, progreso.
 *  - `PresentationBlocksService` → qué bloques entran en la proyección.
 *  - `ScheduleService` / `ClockService` → datos temporales compartidos.
 *
 * `ViewEncapsulation.None`: `stage.component.scss` es la hoja del escenario
 * completo y necesita alcanzar el DOM de los bloques hijos (todas las clases
 * usan BEM namespaced, así que no hay riesgo de colisión).
 */
@Component({
  selector: 'app-stage',
  standalone: true,
  imports: [
    TranslateModule,
    BrandLogoComponent,
    QrPanelComponent,
    PresentationSettingsComponent,
    SocialsBlockComponent,
    StreamsBlockComponent,
    GalleryBlockComponent,
    WeeklyBlockComponent,
    UpcomingBlockComponent,
    LocationBlockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './stage.component.html',
  styleUrl: './stage.component.scss',
})
export class StageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly youtube = inject(YouTubeService);

  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly presentation = inject(PresentationService);
  protected readonly carousel = inject(CarouselService);
  protected readonly blocks = inject(PresentationBlocksService);

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** Todos los bloques de la web pública (los proyectables + ubicación). */
  private readonly allBlocks: readonly StageBlockId[] = [
    ...this.blocks.allBlockIds,
    'location',
  ];

  private readonly params = toSignal(this.route.paramMap);

  /** Bloque pedido por la URL (`/media/galerie`), o `null` para verlos todos. */
  protected readonly selectedBlock = computed<StageBlockId | null>(() =>
    blockIdFromSlug(this.params()?.get('blockId')),
  );

  /**
   * Bloques que se renderizan:
   *  - en proyección → sólo los activos, en el orden del carrusel;
   *  - con un bloque en la URL → sólo ése;
   *  - si no → todos (el filtro de bloques sólo afecta al Play).
   */
  protected readonly renderedBlocks = computed<readonly StageBlockId[]>(() => {
    if (this.fullscreen()) return this.carousel.slides();
    const selected = this.selectedBlock();
    return selected ? [selected] : this.allBlocks;
  });

  /** URL codificada en el QR (siempre la pública, aunque se sirva en local). */
  protected readonly qrData = computed<string>(() => this.config.publicUrl);

  ngOnInit(): void {
    this.youtube.start();
  }

  /** ¿Debe verse este bloque ahora mismo? */
  protected isBlockVisible(id: StageBlockId): boolean {
    if (!this.fullscreen()) return true;
    // `location` nunca entra en la proyección.
    return id !== 'location' && this.carousel.isActive(id);
  }

  /**
   * Atajos de teclado del portátil que controla la proyección:
   *  - `F`         → alterna pantalla completa.
   *  - `Esc`       → sale del modo simulado.
   *  - `←` / `→`   → navega entre bloques.
   *  - `Espacio`   → pausa / reanuda el auto-avance.
   *  - `1`…`9`     → salta al bloque n-ésimo *de los activos*.
   */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.presentation.isSimulated()) {
      event.preventDefault();
      this.presentation.exitSimulatedIfActive();
      return;
    }
    if (event.key === 'f' || event.key === 'F') {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      void this.presentation.toggle();
      return;
    }
    // El resto de atajos sólo aplica en proyección, para no entorpecer la
    // navegación normal del visitante en la web pública.
    if (!this.fullscreen()) return;

    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      this.carousel.setIndex(Number(event.key) - 1);
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault();
        this.carousel.next();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        this.carousel.prev();
        break;
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        this.carousel.togglePause();
        break;
    }
  }
}
