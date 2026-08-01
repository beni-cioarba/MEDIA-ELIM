import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { isNavGroup, NavItem } from '../../core/navigation/nav.model';
import { environment } from '../../../environments/version';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { IconComponent } from '../icon/icon.component';
import { SocialIconComponent } from '../social-icon/social-icon.component';

/** Grupo de enlaces del pie, derivado de la navegación principal. */
interface FooterColumn {
  readonly id: string;
  readonly titleKey: string;
  readonly links: readonly NavItem[];
}

/**
 * Pie global del sitio.
 *
 * ── Por qué así ───────────────────────────────────────────────────────
 * El pie es la segunda navegación más usada de cualquier web y, en una web de
 * iglesia, el sitio donde acaba quien busca lo práctico: dónde estáis, a qué
 * hora, cómo os escribo, cómo colaboro. Por eso deja de ser una firma de tres
 * líneas y pasa a un **mapa del sitio** con los datos de contacto reales.
 *
 * ── Arquitectura: el pie no repite el menú, lo *deriva* ────────────────
 * Las columnas de enlaces salen de `MAIN_NAV`. Añadir una sección a la app
 * sigue siendo tocar **un solo fichero** (`navigation.config.ts`) y aparece a
 * la vez en la cabecera, en el cajón móvil y aquí. Duplicar la lista a mano
 * garantizaba que tarde o temprano divergieran.
 *
 * Los datos de contacto, dirección y redes salen de `CHURCH_CONFIG`, que ya es
 * la fuente única de lo no traducible.
 *
 * ── Rendimiento ───────────────────────────────────────────────────────
 * `MainLayoutComponent` lo monta con `@defer (on viewport)`: no entra en el
 * primer pintado y en la pantalla del templo (modo presentación) no se
 * descarga nunca. Por eso puede permitirse ser rico sin coste inicial.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    BrandLogoComponent,
    IconComponent,
    SocialIconComponent,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  protected readonly config = inject(CHURCH_CONFIG);

  protected readonly year = new Date().getFullYear();

  /**
   * Columnas de enlaces = grupos de la navegación principal. Si mañana se
   * añade un grupo al menú, aparece aquí solo.
   */
  protected readonly columns: readonly FooterColumn[] = MAIN_NAV.filter(isNavGroup).map(
    (group) => ({ id: group.id, titleKey: group.labelKey, links: group.children }),
  );

  /** Accesos que no cuelgan de ningún grupo. */
  protected readonly links = {
    home: `/${APP_PATHS.home}`,
    contact: `/${APP_PATHS.contact}`,
    donate: `/${APP_PATHS.donate}`,
    live: blockPath('streams'),
    location: blockPath('location'),
  } as const;

  protected readonly mailto = `mailto:${this.config.contact.email}`;
  protected readonly tel = `tel:${this.config.contact.phone}`;

  /**
   * Versión publicada. Sirve de referencia al reportar una incidencia y para
   * confirmar de un vistazo que el service worker ya sirve el build nuevo.
   */
  protected readonly version = environment.version;
}
