import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { CHURCH_CONFIG } from '../../core/church.config';
import { blockPath } from '../../core/navigation/app-paths';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavItem, isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { BibleReadingService } from '../../core/services/bible-reading.service';
import { ScheduleService } from '../../core/services/schedule.service';
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
        MatButtonModule,
        IconComponent,
        LangSwitcherComponent,
        BrandLogoComponent,
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
  protected readonly liveCta = MAIN_NAV.find((item) => item.cta === 'live') ?? null;

  /** CTA secundaria (donativos): píldora perfilada, sólo en escritorio. */
  protected readonly supportCta = MAIN_NAV.find((item) => item.cta === 'support') ?? null;

  protected readonly activeIds = this.navActive.activeIds;

  protected readonly isGroup = isNavGroup;
  protected readonly isExternal = isExternalNavItem;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly config = inject(CHURCH_CONFIG);

  /** Álbumes de la galería, para la tira del panel de Medios. */
  protected readonly albums = this.config.mediaEvents;

  /** Destino de la tira de álbumes. */
  protected readonly galleryPath = blockPath('gallery');
  protected readonly weeklyPath = blockPath('weekly');
  protected readonly upcomingPath = blockPath('upcoming');
  protected readonly biblePath = blockPath('bible');

  protected readonly schedule = inject(ScheduleService);

  /**
   * Lo próximo, para el panel de «Programa».
   *
   * Auditoría de los tres grupos: *Biserica* son páginas institucionales
   * (historia, credo, organigrama) —no hay nada que previsualizar y meter
   * relleno sería peor—; *Medios* tiene la galería, que es visual; y
   * *Programa* es el único cuyas cuatro entradas son **tiempo**, así que lo
   * que aporta es la respuesta a «¿y ahora qué?» sin entrar en ninguna.
   */
  protected readonly nextService = this.schedule.featuredProgram;
  protected readonly nextEvent = computed(() => this.schedule.upcomingEvents()[0] ?? null);

  private readonly bible = inject(BibleReadingService);

  /**
   * Lectura de hoy. Con ella el panel cubre **las cuatro** entradas del grupo:
   * los anuncios están en la franja de la portada, y aquí quedan el culto, el
   * evento y la lectura. Antes eran dos tarjetas anchas con una línea cada
   * una y medio panel vacío.
   */
  protected readonly todayReading = computed(() => {
    const week = this.bible.announcedWeek();
    if (!week) return null;
    const day = week.days.find((d) => d.isToday) ?? week.days[0];
    return day ? { passage: day.passage, when: this.schedule.formatWeekdayShort(day.date) } : null;
  });

  /** El grupo abierto, ya resuelto: la plantilla no tiene que buscarlo. */
  protected readonly openGroup = computed<(NavItem & { readonly children: readonly NavItem[] }) | null>(() => {
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
    if (this.ui.openGroup() !== id) this.ui.toggleGroup(id);
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

/** ¿Hay un puntero fino que pueda «apuntar» sin tocar? */
function apuntaConRaton(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}
