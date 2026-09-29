import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { isNavGroup, NavItem } from '../../core/navigation/nav.model';
import { LanguageService } from '../../core/services/language.service';
import { telHref, whatsappHref } from '../../core/util/contact-links';
import { APP_VERSION } from '../../../environments/version';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { IconComponent } from '../icon/icon.component';
import { InebLogoComponent } from '../ineb-logo/ineb-logo.component';
import { SocialIconComponent } from '../social-icon/social-icon.component';
import { ShareButtonComponent } from '../share-button/share-button.component';
import { DockOverlapService } from '../floating-actions/dock-overlap.service';

/** Parte del pie a la vista a partir de la cual el dock flotante se retira. */
const VISIBLE_RATIO = 0.3;

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        TranslatePipe,
        BrandLogoComponent,
        IconComponent,
        InebLogoComponent,
        SocialIconComponent,
        ShareButtonComponent,
    ],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
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

  /**
   * Un grupo con más enlaces que estos se parte en dos subcolumnas (≥ md).
   * Hoy Program (6) pasa a 3 + 3: todos los grupos miden tres filas y el
   * más largo ya no fija el alto del pie.
   */
  protected readonly splitAfter = 4;

  /** Filas de un grupo partido en dos subcolumnas (para `grid-template-rows`). */
  protected rowsOf(column: FooterColumn): number {
    return column.links.length > this.splitAfter ? Math.ceil(column.links.length / 2) : column.links.length;
  }

  /** Accesos que no cuelgan de ningún grupo. */
  protected readonly links = {
    home: `/${APP_PATHS.home}`,
    contact: `/${APP_PATHS.contact}`,
    donate: `/${APP_PATHS.donate}`,
    live: blockPath('streams'),
    location: blockPath('location'),
    /** Panel de control de la proyección (herramienta del operador). */
    control: `/${APP_PATHS.media}/${APP_PATHS.control}`,
    styleguide: `/${APP_PATHS.styleguide}`,
    /**
     * Crédito del pie (logo de INEB): perfil de LinkedIn del desarrollador
     * hasta que exista la web de la consultora. Mismo enlace que Administrativ.
     */
    partner: 'https://www.linkedin.com/in/natanael-beniamin-cioarba/',
  } as const;

  protected readonly mailto = `mailto:${this.config.contact.email}`;
  protected readonly tel = telHref(this.config.contact.phone);

  /** Número de WhatsApp de la iglesia; `null` → no se pinta el botón. */
  protected readonly whatsapp = this.config.contact.whatsapp;

  /**
   * Chat de WhatsApp con el saludo ya escrito en el idioma activo. Recibe el
   * texto por el `translate` de la plantilla: así cambia al cambiar de idioma.
   */
  protected whatsappLink(number: string, text: string): string {
    return whatsappHref(number, text);
  }

  /**
   * Versión publicada. El número visible (`release`) lo decide una persona
   * en `package.json`; el resto lo genera `scripts/generate-version.mjs` en
   * cada build y sirve para identificar exactamente qué código está online
   * cuando alguien reporta una incidencia.
   */
  protected readonly appVersion = APP_VERSION;

  private readonly language = inject(LanguageService);

  constructor() {
    // El pie repite las acciones del dock flotante: mientras está a la vista
    // (un 30 % basta) el dock se retira para no duplicarlas ni tapar el pie.
    const overlap = inject(DockOverlapService);
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        // Por proporción y no por `isIntersecting`: con un solo umbral, al
        // subir de nuevo el aviso llega aún «intersecando» (un 29 % visible)
        // y el dock no volvía a aparecer.
        (entries) =>
          entries.forEach((entry) =>
            overlap.report('footer', entry.intersectionRatio >= VISIBLE_RATIO),
          ),
        { threshold: [0, VISIBLE_RATIO] },
      );
      observer.observe(host);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        overlap.report('footer', false);
      });
    });
  }

  /** Quien llega al pie ya ha recorrido la página entera. */
  protected backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Fecha de compilación en el formato del idioma activo. */
  protected readonly builtAt = computed(() =>
    new Date(APP_VERSION.builtAt).toLocaleString(this.language.current(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  );
}
