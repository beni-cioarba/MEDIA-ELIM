import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';
import { TabNavService } from './tab-nav.service';

/**
 * Barra de pestañas inferior (teléfono y tableta), al estilo de las apps
 * nativas: una pestaña por bloque de primer nivel de `MAIN_NAV`.
 *
 * ── Cuándo se ve ──────────────────────────────────────────────────────
 * Exactamente cuando la cabecera pasa a la hamburguesa (`< lg`, el mismo
 * corte que `.u-mobile-only`): a partir de ahí los grupos ya no tienen panel
 * y hace falta otra forma de saltar entre secciones con el pulgar. La
 * cabecera sigue ahí (marca, directo, idioma y cajón completo); la barra no
 * la sustituye, la complementa.
 *
 * ── Qué hay en cada pestaña ───────────────────────────────────────────
 * Todo el primer nivel de `MAIN_NAV` (`TabNavService`), también «Donează» y
 * «În direct». Una hoja enlaza a su página; un grupo, a su **portada de
 * sección** (`NavHubComponent`), que resume sus páginas. Volver a pulsar la
 * pestaña de la página en la que ya se está sube al principio, y arrastrar
 * la página lleva a la pestaña contigua siguiendo al dedo
 * (`SwipeTabsDirective`), como en WhatsApp.
 *
 * ── Siete pestañas en 320 px ──────────────────────────────────────────
 * Cada una mide ~43 px a 320. Con todos los rótulos no caben, así que por
 * debajo de 380 px sólo lleva rótulo la activa (el patrón de las barras de
 * navegación de Material 3) y el resto se reconoce por el icono.
 *
 * ── Contrato con el resto del layout ──────────────────────────────────
 * La barra flota sobre el contenido, así que lo que vive abajo tiene que
 * saber cuánto ocupa: `MainLayoutComponent` pone `body.has-tab-bar` y
 * `_base.scss` declara ahí `--app-tab-bar-h`. Con esa variable el pie
 * reserva su hueco (se ve entero al llegar abajo), el dock flotante se
 * aparta y las barras fijas de documento se apoyan encima.
 *
 * Es ligera a propósito (sin Material): vive en el layout, que es eager.
 */
@Component({
  selector: 'app-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  host: {
    '[class.is-hidden]': 'typing()',
  },
  template: `
    <nav
      class="tabs"
      [style.--tab-count]="tabs.length"
      [attr.aria-label]="'nav.sections' | translate"
    >
      <!-- Indicador único que se desliza a la pestaña activa: una sola pieza
           animada (transform) en vez de un fondo por pestaña. -->
      <span
        class="tabs__indicator"
        [class.is-off]="activeIndex() < 0"
        [style.--i]="activeIndex() < 0 ? 0 : activeIndex()"
        aria-hidden="true"
      ></span>

      @for (tab of tabs; track tab.id; let i = $index) {
        <a
          class="tab"
          [class.tab--live]="tab.cta === 'live'"
          [routerLink]="tab.path"
          [attr.aria-label]="tab.labelKey | translate"
          [class.is-active]="i === activeIndex()"
          [attr.aria-current]="i === activeIndex() ? 'page' : null"
          (click)="onTap(tab.path)"
        >
          <span class="tab__icon">
            <app-icon [name]="tab.icon ?? 'arrow-right'" />
            @if (tab.cta === 'live') {
              <span class="tab__dot" aria-hidden="true"></span>
            }
          </span>
          <span class="tab__label" aria-hidden="true">{{ tab.labelKey | translate }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './tab-bar.component.scss',
})
export class TabBarComponent {
  private readonly navActive = inject(NavActiveService);
  private readonly ui = inject(UiStore);
  private readonly tabNav = inject(TabNavService);

  protected readonly tabs = this.tabNav.tabs;
  protected readonly activeIndex = this.tabNav.activeIndex;

  /**
   * Hay un campo de texto con el foco en un dispositivo táctil: el teclado
   * virtual está fuera y la barra, que sube con él, taparía el campo. Se
   * retira mientras se escribe.
   */
  protected readonly typing = signal(false);

  /** Pulsar la pestaña de la página actual sube al principio (y cierra el cajón). */
  protected onTap(path: string | undefined): void {
    this.ui.closeAll();
    if (path !== undefined && this.navActive.url() === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  @HostListener('document:focusin', ['$event'])
  protected onFocusIn(event: FocusEvent): void {
    this.typing.set(esCampoDeTexto(event.target) && tactil());
  }

  @HostListener('document:focusout')
  protected onFocusOut(): void {
    this.typing.set(false);
  }
}

/** ¿El elemento abre el teclado virtual al enfocarlo? */
function esCampoDeTexto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(target.type);
}

/** ¿Puntero grueso (dedo)? Sólo ahí hay teclado virtual que esquivar. */
function tactil(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
