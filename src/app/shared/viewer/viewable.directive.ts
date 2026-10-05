import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  Directive,
  ElementRef,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { IconComponent } from '../icon/icon.component';
import { ViewerDocument } from './core/viewer-document.model';
import { GalleryViewerService } from './gallery/gallery-viewer.service';
import { DocumentViewerService } from './overlay/document-viewer.service';

/**
 * Control sutil que aparece sobre un elemento visualizable al pasar el ratón
 * o al enfocarlo con el teclado (en pantallas táctiles, siempre a la vista,
 * más discreto). Sólo indica: el clic lo recoge la directiva en todo el
 * elemento, no únicamente en el botón.
 */
@Component({
  selector: 'app-viewable-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { 'aria-hidden': 'true' },
  template: `<app-icon name="maximize" />`,
  styles: `
    :host {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 2;
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      background: rgb(0 0 0 / 0.55);
      color: #fff;
      font-size: 1.05rem;
      opacity: 0;
      transform: scale(0.9);
      transition:
        opacity 150ms ease,
        transform 150ms ease;
      pointer-events: none;
      backdrop-filter: blur(4px);
    }

    :host-context(.viewable:hover),
    :host-context(.viewable:focus-visible) {
      opacity: 1;
      transform: none;
    }

    @media (hover: none) {
      :host {
        opacity: 0.8;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `,
})
export class ViewableBadgeComponent {}

/**
 * `[appViewable]` — hace que cualquier elemento abra un visor al pulsarlo.
 *
 *   <div [appViewable]="docs" [appViewableIndex]="i">…foto…</div>
 *   <div [appViewable]="doc">…</div>
 *   <div [appViewable]="fotos" appViewableMode="gallery">…</div>
 *
 * Por defecto abre el **visor documental** (`DocumentViewerService`: barra
 * con datos, zoom, giro, imprimir…); con `appViewableMode="gallery"`, la
 * galería. Acepta un documento o una lista (se abre por `appViewableIndex`
 * y se puede pasar a los demás). Con `null`, lista vacía o
 * `appViewableDisabled` no hace nada: así se puede dejar puesto donde la
 * foto aún no existe (un retrato de maqueta) o donde no toca (proyección).
 *
 * Accesible: el elemento pasa a ser un botón (`role`, `tabindex`, Enter y
 * Espacio) con su nombre. Se aplica sobre el **contenedor** de la imagen, no
 * sobre `<img>`: el control flotante se inserta dentro.
 */
@Directive({
  selector: '[appViewable]',
  host: {
    '[class.viewable]': 'enabled()',
    '[style.cursor]': "enabled() ? 'zoom-in' : null",
    '[attr.role]': "enabled() ? 'button' : null",
    '[attr.tabindex]': 'enabled() ? 0 : null',
    '[attr.aria-label]': 'enabled() ? label() : null',
    '(click)': 'open($event)',
    '(keydown.enter)': 'open($event)',
    '(keydown.space)': 'open($event)',
  },
})
export class ViewableDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly documents = inject(DocumentViewerService);
  private readonly gallery = inject(GalleryViewerService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly vcr = inject(ViewContainerRef);

  /** Elemento o galería a mostrar. */
  readonly appViewable = input<ViewerDocument | readonly ViewerDocument[] | null | undefined>();
  /** Posición en la galería por la que se abre. */
  readonly appViewableIndex = input(0);
  readonly appViewableDisabled = input(false);
  /** Visor que se abre: el documental (por defecto) o la galería. */
  readonly appViewableMode = input<'document' | 'gallery'>('document');

  private readonly items = computed<readonly ViewerDocument[]>(() => {
    const value = this.appViewable();
    if (!value) return [];
    return Array.isArray(value) ? value : [value as ViewerDocument];
  });

  protected readonly enabled = computed(() => !this.appViewableDisabled() && this.items().length > 0);

  /** «Ver a pantalla completa: <título>», en el idioma activo. */
  protected readonly label = computed(() => {
    this.language.current();
    const title = this.items()[this.appViewableIndex()]?.name;
    const action = this.translate.instant('viewer.open') as string;
    return title ? `${action}: ${title}` : action;
  });

  private badge: ComponentRef<ViewableBadgeComponent> | null = null;

  constructor() {
    // El control flotante vive dentro del elemento (posicionado en su
    // esquina); se crea y se quita según esté activo.
    effect(() => {
      if (this.enabled() && !this.badge) {
        this.badge = this.vcr.createComponent(ViewableBadgeComponent);
        this.host.nativeElement.appendChild(this.badge.location.nativeElement);
      } else if (!this.enabled() && this.badge) {
        this.badge.destroy();
        this.badge = null;
      }
    });

    // El control se coloca respecto al elemento: si éste no está
    // posicionado, se posiciona (sin tocar los que ya lo están).
    afterNextRender(() => {
      const el = this.host.nativeElement;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    });
  }

  protected open(event: Event): void {
    if (!this.enabled()) return;
    event.preventDefault();
    event.stopPropagation();
    const viewer = this.appViewableMode() === 'gallery' ? this.gallery : this.documents;
    void viewer.open(this.items(), this.appViewableIndex());
  }
}
