import { ChangeDetectionStrategy, Component, effect, inject, DOCUMENT } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { PresentationService } from '../../core/presentation.service';
import { UiStore } from '../../core/state/ui.store';
import { FooterComponent } from '../../shared/footer/footer.component';
import { FloatingActionsComponent } from '../../shared/floating-actions/floating-actions.component';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb.component';
import { TopNavComponent } from '../top-nav/top-nav.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { TabBarComponent } from '../tab-bar/tab-bar.component';
import { SwipeTabsDirective } from '../tab-bar/swipe-tabs.directive';
import { SwipePeekComponent } from '../tab-bar/swipe-peek.component';

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
 * En **modo presentación** la cabecera, la barra de pestañas y el pie
 * desaparecen para que el escenario ocupe la pantalla completa del
 * proyector; el dock flotante se mantiene porque contiene el botón de salir.
 *
 * La barra de pestañas (teléfono y tableta) es eager pero no pesa: sin
 * Material, sólo `MAIN_NAV` y el estado activo. Se ve desde el primer
 * pintado, así que diferirla haría que apareciera de golpe.
 */
@Component({
    selector: 'app-main-layout',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterOutlet,
        TopNavComponent,
        MobileNavComponent,
        TabBarComponent,
        SwipePeekComponent,
        BreadcrumbComponent,
        FooterComponent,
        FloatingActionsComponent,
    ],
    // Arrastrar entre pestañas: escucha en todo el shell para que el gesto
    // valga sobre el contenido, la migaja y el pie (ver la directiva).
    hostDirectives: [SwipeTabsDirective],
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

    @if (!fullscreen()) {
      <app-tab-bar />
      <!-- Lo que asoma al arrastrar la página hacia otra pestaña. -->
      <app-swipe-peek />
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

      /* Superficies del arrastre entre pestañas: el navegador se queda el
         scroll vertical y el zoom; el horizontal llega al gesto sin esperar
         a JS. Las cajas con scroll propio (tablas, migaja larga) lo
         recuperan por ser contenedores de desplazamiento. */
      .shell__main,
      app-breadcrumb,
      app-footer {
        touch-action: pan-y pinch-zoom;
      }

      /* Reserva la altura aproximada del pie para que no haya salto de
         layout (CLS) cuando entra en el viewport y se hidrata. El pie es
         mucho más alto en móvil (las columnas se apilan). Medido tras
         compactarlo (29/09/2026): ~280-300 px en escritorio y ~730 px a 390.
         Re-medido con el cuarto grupo (Departamente, 09/10/2026): ~404 px
         en escritorio y ~946 a 375. */
      .shell__footer-ph {
        min-height: 25rem;
      }

      @media (max-width: 767.98px) {
        .shell__footer-ph {
          min-height: 58rem;
        }
      }
    `,
    ]
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

    // Contrato de la barra de pestañas: con la clase en el `body`,
    // `_base.scss` declara `--app-tab-bar-h` y el pie, el dock y las barras
    // fijas de documento le dejan su hueco. Fuera de la presentación sólo.
    effect(() => {
      this.document.body.classList.toggle('has-tab-bar', !this.fullscreen());
    });
  }
}
