import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { activeBrandSeal } from '../../core/anniversary.config';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavGroup, isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';
import { NavPanelComponent } from './nav-panel.component';

/**
 * Barra de navegación principal.
 *
 * Es **declarativa**: renderiza `MAIN_NAV` (`core/navigation`), así que añadir
 * un módulo a la app no requiere tocar esta plantilla.
 *
 * ── Por qué los grupos son un panel y ya no un `mat-menu` ─────────────
 * Durante un tiempo los desplegables fueron `mat-menu`, por la accesibilidad
 * que trae hecha el patrón `role="menu"`. El problema: **un panel de
 * navegación no es un menú ARIA**. `role="menu"` es para menús de comandos
 * (como los de una aplicación de escritorio) y obliga a que todo lo de dentro
 * sea un `menuitem` con navegación por flechas. Por eso no admitía lo que este
 * proyecto necesita: enseñar contenido dentro del panel —los álbumes de la
 * galería, lo próximo del programa— y no sólo una lista de enlaces.
 *
 * Lo correcto para esto es un *disclosure*: un botón con `aria-expanded` que
 * abre una región con enlaces normales. Y es menos trabajo, no más: sin
 * `role="menu"` no hacen falta ni el foco itinerante ni la trampa de foco;
 * bastan `Escape`, cerrar al pulsar fuera y devolver el foco.
 *
 * El panel va **dentro de la cabecera** y a ancho completo, así que tampoco
 * hace falta el overlay del CDK ni cálculos de posición: no puede salirse de
 * la pantalla porque ocupa toda la pantalla. Es lo que hacen los mega-menús de
 * las referencias.
 *
 * ── El panel se descarga aparte ───────────────────────────────────────
 * Esta barra es **eager**: va en el primer fotograma de todas las páginas.
 * El panel de grupo (`NavPanelComponent`) es lo único de la cabecera que
 * necesita datos de contenido —familias, lectura, programa—, así que se
 * carga con `@defer` al abrir el menú. Regla para lo que venga: **aquí no se
 * inyecta ningún servicio de contenido**; lo que pinte datos va en el panel.
 *
 * El estado (grupo abierto, drawer, scroll) vive en `UiStore` porque también
 * lo consume `MainLayoutComponent` para bloquear el scroll del documento.
 * Qué entrada está activa lo decide `NavActiveService` (ver allí el porqué de
 * no usar `routerLinkActive`).
 */
@Component({
    selector: 'app-top-nav',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        TranslatePipe,
        IconComponent,
        LangSwitcherComponent,
        BrandLogoComponent,
        NavPanelComponent,
    ],
    templateUrl: './top-nav.component.html',
    styleUrl: './top-nav.component.scss'
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
  /** Sello de aniversario junto a la marca mientras dure la celebración (ver `anniversary.config`). */
  protected readonly brandSeal = activeBrandSeal();

  protected readonly liveCta = MAIN_NAV.find((item) => item.cta === 'live') ?? null;

  /** CTA secundaria (donativos): píldora perfilada, sólo en escritorio. */
  protected readonly supportCta = MAIN_NAV.find((item) => item.cta === 'support') ?? null;

  protected readonly activeIds = this.navActive.activeIds;

  protected readonly isGroup = isNavGroup;
  protected readonly isExternal = isExternalNavItem;

  private readonly host = inject(ElementRef<HTMLElement>);

  /** La lista de escritorio (oculta por CSS por debajo de `lg`). */
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');

  /** El grupo abierto, ya resuelto: la plantilla no tiene que buscarlo. */
  protected readonly openGroup = computed<NavGroup | null>(() => {
    const id = this.ui.openGroup();
    if (!id) return null;
    const item = this.items.find((entry) => entry.id === id);
    return item && isNavGroup(item) ? item : null;
  });

  /**
   * Abre un grupo al apuntarlo. **Sólo con ratón de verdad**: en una tableta
   * el toque dispara `mouseenter` y acto seguido `click`, así que el panel se
   * abría y se cerraba en el mismo gesto — un menú que no se abre. La barra de
   * escritorio se ve desde 860 px, y ahí hay tabletas.
   */
  protected hoverGroup(id: string): void {
    if (!apuntaConRaton()) return;
    this.cancelarCierre();
    if (this.ui.openGroup() !== id) this.ui.toggleGroup(id);
  }

  /**
   * Cierre al retirar el ratón de la cabecera **y** del panel (el `:host` los
   * contiene a los dos, así que basta un manejador).
   *
   * Faltaba: el panel se abría al apuntar pero sólo se cerraba con `Escape`,
   * pulsando fuera o navegando. Pasar el cursor por encima de «Medios» camino
   * de otro sitio dejaba 390 px de panel tapando media pantalla hasta que el
   * usuario hacía algo para quitarlo. Un menú que se abre solo tiene que
   * cerrarse solo.
   *
   * El retardo de gracia existe porque entre el botón y el panel hay un hueco
   * de 8 px: sin él, bajar en diagonal del disparador al primer enlace cierra
   * el panel a mitad de camino. 220 ms es el margen habitual en los mega-menús
   * de referencia: suficiente para el recorrido y demasiado corto para
   * percibirse como retraso.
   */
  @HostListener('mouseleave')
  protected onMouseLeave(): void {
    if (!apuntaConRaton() || !this.ui.openGroup()) return;
    this.cancelarCierre();
    this.cierreDiferido = setTimeout(() => this.ui.closeAll(), MS_GRACIA_CIERRE);
  }

  /** Volver a entrar dentro del margen de gracia anula el cierre. */
  @HostListener('mouseenter')
  protected onMouseEnter(): void {
    this.cancelarCierre();
  }

  private cierreDiferido: ReturnType<typeof setTimeout> | null = null;

  private cancelarCierre(): void {
    if (this.cierreDiferido === null) return;
    clearTimeout(this.cierreDiferido);
    this.cierreDiferido = null;
  }

  /** `Escape` cierra el panel abierto, esté donde esté el foco. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.ui.openGroup()) this.ui.closeAll();
  }

  /** Una pulsación fuera de la cabecera cierra el panel. */
  @HostListener('document:pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    if (!this.ui.openGroup()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) this.ui.closeAll();
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelarCierre());

    // Precarga del panel, en reposo y **sólo si la barra de escritorio está a
    // la vista**: en un móvil ese menú no existe y traer su chunk sería gastar
    // datos del visitante en algo que no puede abrir. Si la ventana se ensancha
    // más tarde, el panel se descarga al primer vistazo (con su hueco
    // reservado: `.nav__panel-loading`).
    //
    // Es un `import()` a mano y no `prefetch when …` en el `@defer`: con un
    // disparador principal `when`, el compilador da NG8021 («el prefetch
    // coincide con el disparador principal») aunque las dos condiciones sean
    // distintas —compara el tipo, no la expresión—. El módulo queda en la
    // caché de módulos del navegador y el `@defer` lo resuelve al instante.
    afterNextRender(() => {
      const nav = this.desktopNav()?.nativeElement;
      if (!nav || getComputedStyle(nav).display === 'none') return;
      const precargar = (): void => {
        // Si falla (sin red, versión caducada) no pasa nada: es sólo adelantar
        // trabajo, y el `@defer` volverá a pedirlo cuando haga falta.
        import('./nav-panel.component').catch(() => undefined);
      };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(precargar, { timeout: MS_PRECARGA_MAX });
      else setTimeout(precargar, MS_PRECARGA_SIN_REPOSO);
    });

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

/**
 * Margen de gracia antes de cerrar el panel al salir con el ratón. Cubre el
 * hueco de 8 px entre el disparador y el panel.
 */
const MS_GRACIA_CIERRE = 220;

/** Tope de espera al reposo del navegador antes de precargar el panel igualmente. */
const MS_PRECARGA_MAX = 3_000;
/** Donde no hay `requestIdleCallback` (Safari): espera fija tras el primer pintado. */
const MS_PRECARGA_SIN_REPOSO = 1_500;

/** ¿Hay un puntero fino que pueda «apuntar» sin tocar? */
function apuntaConRaton(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}
