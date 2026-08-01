import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';

/**
 * Barra de navegación principal.
 *
 * Es **declarativa**: renderiza `MAIN_NAV` (`core/navigation`), así que añadir
 * un módulo a la app no requiere tocar esta plantilla.
 *
 * ── Por qué `mat-menu` para los desplegables ──────────────────────────
 * Un desplegable accesible de verdad es mucho más que un `@if`: hace falta
 * `role="menu"`, navegación con flechas, `Home`/`End`, cierre con `Escape`,
 * *focus trap*, devolución del foco al disparador, reposicionamiento cuando
 * no cabe en pantalla y bloqueo del scroll de fondo. `MatMenu` (sobre el
 * CDK Overlay, que ya estaba en el proyecto) lo trae resuelto y probado en
 * todos los navegadores: reimplementarlo a mano habría sido más código,
 * peor accesibilidad y el mismo peso.
 *
 * El estado (grupo abierto, drawer, scroll) vive en `UiStore` porque también
 * lo consume `MainLayoutComponent` para bloquear el scroll del documento.
 * Qué entrada está activa lo decide `NavActiveService` (ver allí el porqué de
 * no usar `routerLinkActive`).
 */
@Component({
  selector: 'app-top-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatMenuModule,
    IconComponent,
    LangSwitcherComponent,
    BrandLogoComponent,
  ],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TopNavComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navActive = inject(NavActiveService);

  protected readonly ui = inject(UiStore);

  /**
   * Enlaces de contenido. Las llamadas a la acción se filtran fuera: mezclarlas
   * con la navegación obliga al usuario a distinguir «ir a» de «hacer», y
   * además dejaba la lista en siete entradas, el límite a partir del cual se
   * deja de escanear un menú.
   */
  protected readonly items = MAIN_NAV.filter((item) => !item.cta);

  /** CTA principal (directo): píldora dorada en la zona de acciones. */
  protected readonly liveCta = MAIN_NAV.find((item) => item.cta === 'live') ?? null;

  /** CTA secundaria (donativos): píldora perfilada, sólo en escritorio. */
  protected readonly supportCta = MAIN_NAV.find((item) => item.cta === 'support') ?? null;

  protected readonly activeIds = this.navActive.activeIds;

  protected readonly isGroup = isNavGroup;
  protected readonly isExternal = isExternalNavItem;

  constructor() {
    // Cerrar cualquier panel al navegar: evita que el menú quede abierto
    // sobre la página nueva.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.ui.closeAll());
  }

  /**
   * `passive: true`: el manejador no llama a `preventDefault()`, así el
   * navegador puede seguir haciendo scroll sin esperar a que termine JS.
   */
  @HostListener('window:scroll', [])
  protected onScroll(): void {
    this.ui.setScrollY(window.scrollY);
  }
}
