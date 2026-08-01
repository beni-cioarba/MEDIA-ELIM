import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PresentationService } from '../../core/presentation.service';
import { UiStore } from '../../core/state/ui.store';
import { FooterComponent } from '../../shared/footer/footer.component';
import { FloatingActionsComponent } from '../../shared/floating-actions/floating-actions.component';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb.component';
import { TopNavComponent } from '../top-nav/top-nav.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';

/**
 * Envoltorio (`shell`) reutilizable de toda la web pública:
 * cabecera de navegación + contenido enrutado + pie + dock flotante.
 *
 * Todas las rutas cuelgan de aquí, así que una sección nueva sólo tiene que
 * preocuparse de su propio contenido.
 *
 * ── Rendimiento ───────────────────────────────────────────────────────
 * Este componente es de los pocos **eager** de la app (se necesita en el
 * primer pintado), así que se mantiene deliberadamente ligero: el panel de
 * navegación móvil se monta con `@defer (when …)` y sólo descarga su chunk
 * la primera vez que alguien abre el menú. En la pantalla del templo eso no
 * ocurre nunca y el código nunca se descarga.
 *
 * En **modo presentación** la cabecera y el pie desaparecen para que el
 * escenario ocupe la pantalla completa del proyector; el dock flotante se
 * mantiene porque contiene el botón de salir.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TopNavComponent,
    MobileNavComponent,
    BreadcrumbComponent,
    FooterComponent,
    FloatingActionsComponent,
  ],
  template: `
    @if (!fullscreen()) {
      <app-top-nav />
      <app-breadcrumb />
    }

    <main id="main-content" class="shell__main" tabindex="-1">
      <router-outlet />
    </main>

    @if (!fullscreen()) {
      @defer (on viewport(footerAnchor)) {
        <app-footer />
      } @placeholder {
        <div #footerAnchor class="shell__footer-ph" aria-hidden="true"></div>
      }
    }

    @defer (on idle) {
      <app-floating-actions />
    }

    @defer (when ui.drawerOpen()) {
      @if (ui.drawerOpen() && !fullscreen()) {
        <app-mobile-nav />
      }
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-height: 100dvh;
      }

      .shell__main {
        flex: 1 1 auto;
        display: block;
        min-width: 0;
        outline: none;
      }

      /* Reserva la altura aproximada del pie para que no haya salto de
         layout (CLS) cuando entra en el viewport y se hidrata. El pie es
         mucho más alto en móvil (las columnas se apilan), de ahí el clamp. */
      .shell__footer-ph {
        min-height: clamp(26rem, 55vw, 32rem);
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly presentation = inject(PresentationService);
  private readonly document = inject(DOCUMENT);

  protected readonly ui = inject(UiStore);
  protected readonly fullscreen = this.presentation.isFullscreen;

  constructor() {
    // Con el drawer abierto, el documento de fondo no debe hacer scroll:
    // en iOS es la única forma fiable de evitar el "scroll chaining".
    effect(() => {
      this.document.body.classList.toggle('has-drawer-open', this.ui.drawerOpen());
    });
  }
}
