import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { blockPath } from '../../core/navigation/app-paths';
import { NavItem, isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { NavSummary, NavSummaryService } from '../../core/navigation/nav-summary.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';

/** Fila del cajón ya resuelta: la entrada y su resumen vivo. */
interface DrawerRow {
  readonly item: NavItem;
  readonly summary: () => NavSummary | null;
}

/** Bloque del cajón: un grupo con sus filas, o una hoja suelta (sin filas). */
interface DrawerBlock {
  readonly item: NavItem;
  readonly rows: readonly DrawerRow[];
}

/** Resumen vacío de las hojas sueltas (Acasă, Contact). */
const SIN_RESUMEN = (): NavSummary | null => null;

/**
 * Panel de navegación móvil (drawer).
 *
 * ── Por qué es un componente aparte y diferido ────────────────────────
 * Sólo hace falta cuando alguien pulsa la hamburguesa, algo que no ocurre
 * nunca en la pantalla del templo. `MainLayoutComponent` lo monta con
 * `@defer (when …)`, así que su código viaja en un chunk propio.
 *
 * ── Qué enseña (03/10/2026, «como el menú de escritorio») ─────────────
 * El panel de escritorio enseña, además de los enlaces, lo que pasa en cada
 * sección. Aquí se trae lo mismo sin alargar el cajón:
 *  1. **Accesos de arriba**: el próximo culto (lo que más se busca al abrir
 *     el menú) y las dos llamadas a la acción, «În direct» y «Donează».
 *  2. **Una fila por página** con icono, rótulo y descripción (como el panel
 *     de escritorio) y, a la derecha, la **marca viva** de
 *     `NavSummaryService`: avisos en vigor, fecha del próximo evento, culto
 *     de hoy. Sólo la marca: el resumen completo está en la portada.
 *  3. **El rótulo de cada grupo enlaza a su portada de sección** («Vezi tot»).
 *
 * Sin Material: filas propias, más ligeras que `mat-nav-list` y con el
 * mismo objetivo táctil (≥ 48 px).
 *
 * Accesibilidad: `cdkTrapFocus` confina el tabulador y devuelve el foco al
 * botón que lo abrió; `role="dialog"` + `aria-modal`.
 */
@Component({
  selector: 'app-mobile-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    A11yModule,
    IconComponent,
    LangSwitcherComponent,
    ShareButtonComponent,
  ],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss',
})
export class MobileNavComponent {
  protected readonly ui = inject(UiStore);
  private readonly navActive = inject(NavActiveService);
  private readonly summaries = inject(NavSummaryService);
  private readonly schedule = inject(ScheduleService);

  protected readonly activeIds = this.navActive.activeIds;
  protected readonly isExternal = isExternalNavItem;

  /** Las dos llamadas a la acción van arriba, no mezcladas con las secciones. */
  protected readonly liveCta = MAIN_NAV.find((item) => item.cta === 'live') ?? null;
  protected readonly supportCta = MAIN_NAV.find((item) => item.cta === 'support') ?? null;

  /** Secciones, en el orden de `MAIN_NAV`, con el resumen vivo de cada página. */
  protected readonly blocks: readonly DrawerBlock[] = MAIN_NAV.filter((item) => !item.cta).map(
    (item) => ({
      item,
      rows: isNavGroup(item)
        ? item.children.map((child) => ({ item: child, summary: this.summaries.summaryOf(child.id) }))
        : [],
    }),
  );

  protected readonly noSummary = SIN_RESUMEN;

  protected readonly weeklyPath = blockPath('weekly');
  protected readonly nextService = this.schedule.featuredProgram;
  protected readonly isToday = computed(
    () => this.nextService() !== null && this.schedule.todayProgram()?.id === this.nextService()?.id,
  );

  /** ¿Se está en la portada del grupo (y no en una de sus páginas)? */
  protected isHere(item: NavItem): boolean {
    return item.path !== undefined && this.navActive.url() === item.path;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.ui.closeDrawer();
  }
}
