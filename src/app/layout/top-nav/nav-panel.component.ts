import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { NavGroup, isExternalNavItem } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { BibleReadingService } from '../../core/services/bible-reading.service';
import { FamilyPrayerService } from '../../core/services/family-prayer.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { UiStore } from '../../core/state/ui.store';
import { CardCarouselComponent } from '../../shared/card-carousel/card-carousel.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { FamilyPhotoComponent } from '../../shared/family-photo/family-photo.component';
import { DepartmentsAsideComponent } from './departments-aside.component';

/**
 * Panel de grupo del mega-menú de escritorio: los enlaces del grupo abierto a
 * la izquierda y su **zona destacada** a la derecha (álbumes, lo próximo y la
 * semana, las familias, la tarjeta de invitación).
 *
 * ── Por qué es un componente aparte ───────────────────────────────────
 * Vivía dentro de `TopNavComponent`, que es **eager** (se pinta en el primer
 * fotograma de todas las páginas). Por su zona destacada, la cabecera
 * importaba de forma estática los servicios de familias, de lectura bíblica y
 * de programa, el carrusel de tarjetas y la foto de familia, y con ellos sus
 * datos: medido el 16/11/2026, unos 80 kB del arranque de **todos** los
 * visitantes, también en el móvil, donde este panel no existe.
 *
 * Ahora la cabecera sólo conoce el grupo abierto (`UiStore`) y este
 * componente se descarga al abrir el menú (`@defer` en la plantilla de la
 * cabecera, con precarga en reposo cuando la barra de escritorio está a la
 * vista). Quién abre y cierra, el teclado y el ratón siguen en la cabecera:
 * aquí sólo se pinta.
 *
 * Qué bloque destacado lleva cada grupo y por qué los llevan todos:
 * `asideKind`.
 */
@Component({
  selector: 'app-nav-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    CardCarouselComponent,
    FamilyPhotoComponent,
    DepartmentsAsideComponent,
  ],
  templateUrl: './nav-panel.component.html',
  styleUrl: './nav-panel.component.scss',
})
export class NavPanelComponent {
  /** El grupo abierto (lo resuelve la cabecera desde `UiStore.openGroup`). */
  readonly group = input.required<NavGroup>();

  private readonly config = inject(CHURCH_CONFIG);
  private readonly navActive = inject(NavActiveService);
  private readonly bible = inject(BibleReadingService);

  protected readonly ui = inject(UiStore);
  protected readonly schedule = inject(ScheduleService);
  protected readonly prayer = inject(FamilyPrayerService);

  protected readonly activeIds = this.navActive.activeIds;
  protected readonly isExternal = isExternalNavItem;

  /** Álbumes de la galería, para la tira del panel de Medios. */
  protected readonly albums = this.config.mediaEvents;

  /** Dónde está la iglesia, para la tarjeta de invitación de «La iglesia». */
  protected readonly location = this.config.location;

  /** Destino de la tira de álbumes. */
  protected readonly galleryPath = blockPath('gallery');

  protected readonly departmentsPath = `/${APP_PATHS.departments}`;
  protected readonly weeklyPath = blockPath('weekly');
  protected readonly upcomingPath = blockPath('upcoming');
  protected readonly biblePath = blockPath('bible');
  protected readonly contactPath = `/${APP_PATHS.contact}`;
  protected readonly familyPrayerPath = `/${APP_PATHS.familyPrayer}`;

  /**
   * Lo próximo, para el panel de «Programa»: es el único grupo cuyas cuatro
   * entradas son **tiempo**, así que lo que aporta es la respuesta a «¿y ahora
   * qué?» sin entrar en ninguna.
   */
  protected readonly nextService = this.schedule.featuredProgram;
  protected readonly nextEvent = computed(() => this.schedule.upcomingEvents()[0] ?? null);

  /**
   * La semana entera, en una tira debajo de «lo próximo».
   *
   * Es lo que equilibra el panel de Programa: con sólo las tres tarjetas de
   * «lo próximo», el destacado medía 99 px al lado de una columna de enlaces
   * de 244 —un rectángulo vacío de 200 px en la esquina—. Y sobre todo es la
   * respuesta que falta: «¿qué días abrís?» no está en ninguna de las cuatro
   * entradas sin entrar en ellas.
   *
   * `ScheduleService.weeklyProgram` ya viene rotado para empezar por hoy, así
   * que la tira se lee hacia delante desde el día en que se está mirando.
   */
  protected readonly week = this.schedule.weeklyProgram;
  protected readonly todayId = computed(() => this.schedule.todayProgram()?.id ?? null);

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
    return day ? { passage: day.passage, when: this.schedule.formatWeekdayLong(day.date) } : null;
  });

  /**
   * Familias por las que se ora esta semana, en carrusel bajo la semana.
   *
   * Es contenido que cambia cada domingo y que hasta ahora sólo se veía
   * entrando en su página. Y resuelve el hueco que dejaba el panel: la
   * columna de seis enlaces medía ~400 px y el destacado ~270, con 130 px en
   * blanco bajo la semana. Si no hay semana vigente, la fila no se pinta.
   */
  protected readonly prayerWeek = this.prayer.current;

  /**
   * Qué bloque destacado lleva el panel del grupo abierto.
   *
   * **Los tres grupos llevan uno, y no por simetría.** Medido a 1512 px, el
   * panel apilaba los enlaces arriba y el contenido abajo: la fila de enlaces
   * se repartía en cinco columnas de 275 px de las que sólo se ocupaban tres,
   * dejando **568 px vacíos a la derecha** mientras la descripción de «Panel
   * completo» se partía en dos líneas dentro de su columna estrecha. El panel
   * acababa midiendo 390 px —el 43 % de la pantalla— para tres enlaces.
   *
   * Poniéndolo en dos zonas (enlaces a la izquierda, destacado a la derecha)
   * ese hueco pasa a ser contenido y el panel baja a ~250 px. Pero eso sólo
   * funciona si **todos** los grupos tienen algo que enseñar; si no, el grupo
   * sin destacado vuelve a quedarse con mil píxeles en blanco. De ahí que
   * «La iglesia» —páginas institucionales, nada que previsualizar— lleve la
   * tarjeta de invitación: no es relleno, es lo que busca quien está mirando
   * ese grupo (cuándo y dónde). Un grupo futuro sin destacado sigue siendo
   * válido: el panel cae solo a una rejilla de enlaces a todo el ancho.
   */
  protected readonly asideKind = computed<'media' | 'program' | 'about' | 'departments' | null>(() => {
    switch (this.group().id) {
      case 'media':
        return this.albums.length > 0 ? 'media' : null;
      case 'program':
        return 'program';
      case 'about':
        return 'about';
      case 'departments':
        return 'departments';
      default:
        return null;
    }
  });
}
