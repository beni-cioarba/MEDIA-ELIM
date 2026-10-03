import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavGroup, NavItem, isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavSummary, NavSummaryService } from '../../core/navigation/nav-summary.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { ChurchSpotlightComponent } from './spotlights/church-spotlight.component';
import { MediaSpotlightComponent } from './spotlights/media-spotlight.component';
import { ProgramSpotlightComponent } from './spotlights/program-spotlight.component';

/**
 * Clave de `data` con la que cada ruta de portada dice qué grupo resume
 * (`navHubRoute()` en `app.routes.ts`). No se importa desde allí: este
 * componente es perezoso y la tabla de rutas, eager.
 */
const NAV_HUB_GROUP = 'navGroup';

/** Tarjeta ya resuelta: la entrada y su resumen vivo. */
interface HubCard {
  readonly item: NavItem;
  readonly external: boolean;
  readonly summary: Signal<NavSummary | null>;
}

/**
 * Portada de sección: la página propia de un grupo de `MAIN_NAV`
 * (`/biserica`, `/program`, `/multimedia`).
 *
 * ── Para qué existe ───────────────────────────────────────────────────
 * En escritorio un grupo abre su panel en la cabecera, que ya enseña los
 * hijos y un destacado. En el teléfono no hay panel: la pestaña del grupo
 * (barra inferior) tiene que llevar a **algún sitio**, y ese sitio es esta
 * página. Responde a «¿qué hay en esta sección y qué pasa ahora en ella?»:
 * una tarjeta por página hija con su rótulo, su descripción y el dato vivo
 * que da `NavSummaryService` (el próximo culto, los avisos en vigor…).
 *
 * Debajo, el **destacado** del grupo (`spotlights/`): lo mismo que enseña el
 * bloque derecho del panel de escritorio, a escala de página.
 *
 * Es **un solo componente** para todos los grupos: lo que cambia es el dato
 * (`data.navGroup` de la ruta). Un grupo nuevo en el menú con `path` sólo
 * necesita su ruta en `app.routes.ts`.
 */
@Component({
  selector: 'app-nav-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    ProgramSpotlightComponent,
    MediaSpotlightComponent,
    ChurchSpotlightComponent,
  ],
  templateUrl: './nav-hub.component.html',
  styleUrl: './nav-hub.component.scss',
})
export class NavHubComponent {
  private readonly summaries = inject(NavSummaryService);

  private readonly groupId = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data[NAV_HUB_GROUP] as string | undefined)),
    { initialValue: undefined },
  );

  /** El grupo que resume esta portada. */
  protected readonly group = computed<NavGroup | null>(() => {
    const item = MAIN_NAV.find((entry) => entry.id === this.groupId());
    return item && isNavGroup(item) ? item : null;
  });

  protected readonly cards = computed<readonly HubCard[]>(() =>
    (this.group()?.children ?? []).map((item) => ({
      item,
      external: isExternalNavItem(item),
      summary: this.summaries.summaryOf(item.id),
    })),
  );
}
