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
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { PresentationService } from '../../core/presentation.service';
import { YouTubeService } from '../../core/youtube.service';
import { CarouselService } from '../../core/services/carousel.service';
import { PresentationDisplayService } from '../../core/services/presentation-display.service';
import {
  PresentationBlocksService,
  PresentationSlide,
} from '../../core/services/presentation-blocks.service';
import { StageBlockId, blockIdFromSlug } from '../../core/navigation/app-paths';
import { QrPanelComponent } from '../../shared/qr-panel/qr-panel.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';
import { PresentationSettingsComponent } from '../../shared/presentation-settings/presentation-settings.component';
import { AnnouncementBlockComponent } from './blocks/announcement-block/announcement-block.component';
import { SocialsBlockComponent } from './blocks/socials-block/socials-block.component';
import { StreamsBlockComponent } from './blocks/streams-block/streams-block.component';
import { GalleryBlockComponent } from './blocks/gallery-block/gallery-block.component';
import { WeeklyBlockComponent } from './blocks/weekly-block/weekly-block.component';
import { UpcomingBlockComponent } from './blocks/upcoming-block/upcoming-block.component';
import { BibleBlockComponent } from './blocks/bible-block/bible-block.component';
import { LocationBlockComponent } from './blocks/location-block/location-block.component';

/**
 * Bloques que en la web tienen sección propia y por eso **no** entran en el
 * panel completo (`/media`): los anuncios viven en `/anunturi` y la lectura
 * bíblica en `/media/citirea-bibliei`. En la proyección siguen entrando.
 */
const WEB_PANEL_EXCLUDED: ReadonlySet<StageBlockId> = new Set<StageBlockId>(['announcements', 'bible']);

/**
 * Diapositiva del escenario: las del carrusel más `location`, que sólo
 * existe en la web pública.
 */
interface StageSlide extends Omit<PresentationSlide, 'block'> {
  readonly block: StageBlockId;
}

/**
 * Escenario multimedia (`.stage`) — el módulo que se proyecta en el templo.
 *
 * Sirve **tres** modos con un único componente (y por tanto un único chunk y
 * una única hoja de estilos):
 *  - `/media`          → todos los bloques, uno debajo de otro.
 *  - `/media/:blockId` → un bloque como página propia (enlaces del menú).
 *  - pantalla completa → carrusel con las diapositivas activas.
 *
 * El contenido vive en `./blocks/*` y el estado en `core/services`:
 *  - `CarouselService`             → diapositiva activa, pausa, progreso.
 *  - `PresentationBlocksService`   → qué bloques entran y cómo se expanden
 *                                    en diapositivas (un anuncio = una).
 *  - `PresentationDisplayService`  → QR visible y su tamaño.
 *  - `ScheduleService` / `ClockService` → datos temporales compartidos.
 *
 * `ViewEncapsulation.None`: `stage.component.scss` es la hoja del escenario
 * completo y necesita alcanzar el DOM de los bloques hijos (todas las clases
 * usan BEM namespaced, así que no hay riesgo de colisión).
 */
@Component({
    selector: 'app-stage',
    imports: [
        TranslatePipe,
        BrandLogoComponent,
        QrPanelComponent,
        PresentationSettingsComponent,
        AnnouncementBlockComponent,
        SocialsBlockComponent,
        StreamsBlockComponent,
        GalleryBlockComponent,
        WeeklyBlockComponent,
        UpcomingBlockComponent,
        BibleBlockComponent,
        LocationBlockComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    templateUrl: './stage.component.html',
    styleUrl: './stage.component.scss'
})
export class StageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly youtube = inject(YouTubeService);

  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly presentation = inject(PresentationService);
  protected readonly carousel = inject(CarouselService);
  protected readonly blocks = inject(PresentationBlocksService);
  protected readonly display = inject(PresentationDisplayService);

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** ¿Se pinta la columna del QR? Sólo proyectando y si el operador lo quiere. */
  protected readonly showQr = computed<boolean>(() => this.fullscreen() && this.display.qrVisible());

  /**
   * Bloques del panel completo de la web (`/media`): los proyectables en su
   * orden más la ubicación, **menos** los que ya tienen sección propia en la
   * web (`WEB_PANEL_EXCLUDED`), que en la web sólo se ven allí y en la proyección.
   */
  private readonly allBlocks = computed<readonly StageBlockId[]>(() => [
    ...this.blocks.allBlockIds().filter((id) => !WEB_PANEL_EXCLUDED.has(id)),
    'location',
  ]);

  private readonly params = toSignal(this.route.paramMap);

  /** Bloque pedido por la URL (`/media/galerie`), o `null` para verlos todos. */
  protected readonly selectedBlock = computed<StageBlockId | null>(() =>
    blockIdFromSlug(this.params()?.get('blockId')),
  );

  /**
   * Diapositivas que se renderizan:
   *  - en proyección → sólo las activas, en el orden del carrusel;
   *  - con un bloque en la URL → sólo las de ese bloque;
   *  - si no → todas (el filtro de bloques sólo afecta al Play).
   * En los tres casos el bloque de anuncios va expandido: una por anuncio.
   */
  protected readonly renderedSlides = computed<readonly StageSlide[]>(() => {
    if (this.fullscreen()) return this.carousel.slides();
    const selected = this.selectedBlock();
    const ids = selected ? [selected] : this.allBlocks();
    return ids.flatMap((id) => this.expand(id));
  });

  /** URL codificada en el QR (siempre la pública, aunque se sirva en local). */
  protected readonly qrData = computed<string>(() => this.config.publicUrl);

  ngOnInit(): void {
    /*
     * Modo **completo**: aquí sí se sondea el directo cada dos minutos.
     *
     * Es la página de las transmisiones y la que se proyecta en el templo, o
     * sea donde el «estamos emitiendo» tiene que aparecer al momento. Y es la
     * que menos gente deja abierta, así que la cuota da de sobra. La portada
     * va en modo ligero por el motivo contrario (ver `YouTubeService.start`).
     */
    this.youtube.start('completo');
  }

  /** ¿Debe verse esta diapositiva ahora mismo? */
  protected isSlideVisible(slide: StageSlide): boolean {
    if (!this.fullscreen()) return true;
    // `location` nunca entra en la proyección.
    return slide.block !== 'location' && this.carousel.isActive(slide.key);
  }

  /**
   * Atajos de teclado del portátil que controla la proyección:
   *  - `F`         → alterna pantalla completa.
   *  - `Esc`       → sale del modo simulado.
   *  - `←` / `→`   → navega entre diapositivas.
   *  - `Espacio`   → pausa / reanuda el auto-avance.
   *  - `Q`         → muestra / oculta el código QR.
   *  - `1`…`9`     → salta a la diapositiva n-ésima *de las activas*.
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
      case 'q':
      case 'Q':
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        this.display.toggleQr();
        break;
    }
  }

  /**
   * Expansión para la web pública: `location` no es un bloque del carrusel y
   * los anuncios ocultos por el operador sí se publican (`projection = false`).
   */
  private expand(id: StageBlockId): readonly StageSlide[] {
    if (id === 'location') return [{ key: id, block: id, titleKey: 'location.title' }];
    return this.blocks.expand(id, 'web');
  }
}
