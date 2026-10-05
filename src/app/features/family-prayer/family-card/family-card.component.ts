import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
} from '@angular/core';
import { PresentationService } from '../../../core/presentation.service';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FamilyPrayerService,
  PrayerFamilyView,
} from '../../../core/services/family-prayer.service';
import { FitToBoxDirective } from '../../../shared/fit-to-box/fit-to-box.directive';
import { FamilyPhotoComponent } from '../family-photo/family-photo.component';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';

/** A partir de esta proporción (ancho / alto) la foto se trata como apaisada. */
const LANDSCAPE_RATIO = 1.2;

/** Caracteres de mensaje + versículo a partir de los cuales la foto cede ancho. */
const LONG_TEXT_CHARS = 260;

/** Ficha web a dos columnas desde `lg` (igual que en la hoja de estilos). */
const TWO_COLUMNS_QUERY = '(min-width: 1024px)';

/**
 * Ancho mínimo de la columna de la foto, en fracción de la ficha, según el
 * ajuste de la familia (`photo.size`): la foto nunca queda en una tira.
 */
const MIN_PHOTO_SHARE = { compact: 0.3, normal: 0.34, large: 0.44 } as const;

/** Ancho mínimo de la columna de la foto y de la del texto, en rem. */
const MIN_PHOTO_REM = 15;
const MIN_TEXT_REM = 20;

/** Pasos del barrido de anchos (ver `fitPhotoColumn`). */
const SWEEP_STEPS = 16;

/**
 * Panorámica (de 1,45 en adelante): en la web va en «banda», arriba y a todo
 * el ancho, con el texto debajo en dos columnas. Al lado del texto quedaba
 * del alto del texto (~300 px) y la gente se veía diminuta.
 */
const PANORAMIC_RATIO = 1.45;

/**
 * Alto de referencia de la foto «al lado» y en «revista»: el menor entre el
 * 75 % de la ventana y 36 rem. Evita que una vertical de móvil (9:16) con
 * poco texto estire la ficha a 700 px sólo por cumplir el ancho mínimo.
 */
const PHOTO_MAX_VH = 0.75;
const PHOTO_MAX_REM = 36;

/** En «revista», la foto no pasa de esta fracción de la ficha. */
const WRAP_MAX_SHARE = 0.5;

/**
 * Alto mínimo común de la foto «al lado»: el menor entre 24 rem y el 55 % de
 * la ventana. Sin él, una familia con poco texto salía con la foto del alto
 * de su texto (~300 px) junto a otras de 550: parecían de otra categoría.
 * Nunca se amplía por encima de la resolución real de la foto (ver
 * `fitPhotoColumn`): mejor algo más pequeña que borrosa.
 */
const MIN_PHOTO_HEIGHT_REM = 24;
const MIN_PHOTO_HEIGHT_VH = 0.55;

/**
 * Ficha de una familia: foto + quiénes son + su motivo de oración.
 *
 * **Un solo renderizador para la web y la proyección** (como la tarjeta de
 * anuncio): lo que se proyecta el domingo y lo que se lee en el móvil tras
 * escanear el QR es la misma ficha. La hoja es global (`ViewEncapsulation.None`,
 * BEM `.fcard__*`) con sus dos contextos:
 *
 *   · Web: tarjeta de dos columnas (foto a sangre de arriba abajo · panel),
 *     apilada en móvil.
 *   · Proyección: a sangre, foto a su proporción real y panel navy con un
 *     bloque tipográfico fijo que se ajusta entero (`appFitToBox`) y se
 *     centra en vertical. Sin iconos, filetes ni numeración.
 *
 * Las acciones de la web (compartir) llegan por `<ng-content>`.
 */
@Component({
  selector: 'app-family-card',
  imports: [TranslatePipe, FitToBoxDirective, FamilyPhotoComponent, ViewableDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  protected readonly prayer = inject(FamilyPrayerService);
  /** Proyectando: la ficha usa la hoja de proyección, no la web (`.fcard--web`). */
  protected readonly fullscreen = inject(PresentationService).isFullscreen;

  @Input({ required: true }) family!: PrayerFamilyView;

  /**
   * Documentos que abre la foto en el visor (todas las fotos de la semana,
   * para pasar de una familia a otra) y la posición de esta familia. Sólo en la web: en la proyección el
   * visor queda desactivado.
   */
  @Input() viewerItems: readonly ViewerDocument[] | null = null;
  @Input() viewerIndex = 0;
  /** Primera ficha visible al abrir: su foto no se difiere. */
  @Input() eager = false;

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private scheduled = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const card = this.host.querySelector<HTMLElement>('.fcard');
      if (!card) return;

      // Sólo cuenta el ancho: el alto lo cambia el propio ajuste.
      let lastWidth = -1;
      const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        if (width === lastWidth) return;
        lastWidth = width;
        this.schedulePhotoColumn();
      });
      observer.observe(card);
      // Con la fuente definitiva el texto ocupa otro alto.
      void document.fonts?.ready.then(() => this.schedulePhotoColumn());

      destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(this.scheduled);
      });
    });

    // Al entrar o salir de la proyección la ficha cambia de maquetación.
    effect(() => {
      this.fullscreen();
      this.schedulePhotoColumn();
    });
  }

  /**
   * Foto apaisada (de 6:5 en adelante): proyectada cambia la maquetación
   * (foto arriba, mensaje a la derecha). En la web basta la columna, cuyo
   * ancho ya sale de la proporción de la foto.
   */
  protected get landscape(): boolean {
    return (this.family.photo?.ratio ?? 0) >= LANDSCAPE_RATIO;
  }

  /**
   * Panorámica: en la web, formato «banda» (`.fcard--banner`, ≥ lg). Sale sólo
   * del dato, así que va en la plantilla y se pinta bien desde el primer
   * fotograma, sin esperar a medir.
   */
  protected get panoramic(): boolean {
    return (this.family.photo?.frameRatio ?? 0) >= PANORAMIC_RATIO;
  }

  /** Mensaje largo: en proyección la foto cede ancho al texto (`.fcard--long`). */
  protected get longText(): boolean {
    const chars =
      this.family.message.reduce((total, paragraph) => total + paragraph.length, 0) +
      (this.family.verse?.text.length ?? 0);
    return chars > LONG_TEXT_CHARS;
  }

  /**
   * Ancho al que se pinta la foto, para que el navegador elija la variante
   * (sale de la maquetación de `family-card.component.scss`):
   *   · Proyección: la columna de la foto (≤ 58 % del lienzo; apaisada ≤ 62 %).
   *   · Web ≥ lg: la columna de la foto (la calcula `fitPhotoColumn`; en la
   *     práctica ≤ 40 rem). Por debajo, o «foto arriba»: todo el ancho.
   */
  protected sizes(): string {
    if (this.fullscreen()) return this.landscape ? '62vw' : '58vw';
    // En «banda» la foto ocupa el ancho de la ficha (≤ la columna común, 1.440 px).
    return this.panoramic ? '(max-width: 1023px) 100vw, 1440px' : '(max-width: 1023px) 100vw, 40rem';
  }

  private schedulePhotoColumn(): void {
    cancelAnimationFrame(this.scheduled);
    this.scheduled = requestAnimationFrame(() => this.fitPhotoColumn());
  }

  /**
   * Elige el formato de la ficha web (≥ lg) según la foto y el texto:
   *
   *   · **Banda** (`.fcard--banner`): panorámica. Lo decide la plantilla con
   *     el dato; aquí no hay nada que medir.
   *   · **Al lado** (por defecto): ancho de la columna de la foto para que
   *     vaya **entera** y **llene su columna de arriba abajo**. El alto de la
   *     foto es ancho ÷ proporción y crece con el ancho; el del texto también
   *     (su columna se estrecha). Se busca el MENOR ancho con el que la foto
   *     es al menos tan alta como el texto: la fila mide lo que la foto (ver
   *     el espaciador en la hoja) y el texto cabe al lado. El mínimo se acota
   *     para que una vertical no pase del alto de referencia (`PHOTO_MAX_*`)
   *     sólo por cumplir el ancho mínimo.
   *   · **Revista** (`.fcard--wrap`): si ningún ancho vale (mucho texto), la
   *     foto flota a la izquierda a su alto de referencia y el texto la rodea
   *     y sigue por debajo. Antes pasaba a «foto arriba»: una vertical a todo
   *     el ancho se comía la pantalla.
   *
   * Clases y variable se escriben directamente en el DOM, no por plantilla:
   * son estado de maquetación que hay que aplicar y medir en el mismo
   * fotograma, sin esperar a la detección de cambios.
   */
  private fitPhotoColumn(): void {
    const card = this.host.querySelector<HTMLElement>('.fcard');
    const panel = card?.querySelector<HTMLElement>('.fcard__panel');
    if (!card || !panel) return;

    card.classList.remove('fcard--wrap');
    card.style.removeProperty('--fcard-photo-w');
    if (this.fullscreen() || this.panoramic || !matchMedia(TWO_COLUMNS_QUERY).matches) return;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const total = card.clientWidth;
    const frame = this.family.photo?.frameRatio ?? 0.8;
    const share = MIN_PHOTO_SHARE[this.family.photo?.size ?? 'normal'];
    const maxPhotoHeight = Math.min(window.innerHeight * PHOTO_MAX_VH, PHOTO_MAX_REM * rem);
    const minPhotoHeight = Math.min(window.innerHeight * MIN_PHOTO_HEIGHT_VH, MIN_PHOTO_HEIGHT_REM * rem);
    // Tope de calidad: ancho real de la variante mayor (1 px de foto por px
    // CSS). Las fotos del manifiesto miden ≥ 716 px de ancho, así que en la
    // práctica sólo frena a una foto pequeña que llegue en el futuro.
    const qualityCap = this.family.photo?.width ?? Number.POSITIVE_INFINITY;
    const minWidth = Math.max(
      MIN_PHOTO_REM * rem,
      Math.min(total * share, maxPhotoHeight * frame),
      Math.min(minPhotoHeight * frame, qualityCap),
    );
    const maxWidth = total - MIN_TEXT_REM * rem;

    card.classList.add('fcard--measuring');
    const photoReachesText = (width: number): boolean => {
      card.style.setProperty('--fcard-photo-w', `${width}px`);
      return width / frame >= panel.offsetHeight;
    };

    // Barrido en pasos y afinado por bisección dentro del primer paso que
    // cabe. No basta con bisecar entre los extremos: con la columna de texto
    // muy estrecha el texto se alarga más deprisa que la foto, así que el
    // extremo ancho puede no caber aunque un ancho intermedio sí.
    let width: number | null = null;
    if (maxWidth > minWidth) {
      const step = (maxWidth - minWidth) / SWEEP_STEPS;
      let previous = minWidth;
      for (let i = 0; i <= SWEEP_STEPS && width === null; i++) {
        const candidate = minWidth + step * i;
        if (photoReachesText(candidate)) {
          let low = previous;
          let high = candidate;
          while (high - low > 2) {
            const middle = (low + high) / 2;
            if (photoReachesText(middle)) high = middle;
            else low = middle;
          }
          width = high;
        }
        previous = candidate;
      }
    }
    card.classList.remove('fcard--measuring');

    if (width === null) {
      const wrapWidth = Math.max(minWidth, Math.min(total * WRAP_MAX_SHARE, maxPhotoHeight * frame, qualityCap));
      card.style.setProperty('--fcard-photo-w', `${Math.round(wrapWidth)}px`);
      card.classList.add('fcard--wrap');
    } else {
      card.style.setProperty('--fcard-photo-w', `${Math.ceil(width)}px`);
    }
  }

}
