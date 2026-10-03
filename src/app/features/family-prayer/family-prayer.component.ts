import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../core/church.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import {
  FamilyPrayerService,
  PrayerFamilyView,
  PrayerWeekView,
} from '../../core/services/family-prayer.service';
import { DocTocComponent, TocEntry } from '../../shared/doc-toc/doc-toc.component';
import { DockActionsService } from '../../shared/floating-actions/dock-actions.service';
import { NearViewportDirective } from '../../shared/near-viewport/near-viewport.directive';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { FamilyCardComponent } from './family-card/family-card.component';
import { FamilyPdfComponent } from './family-pdf/family-pdf.component';
import { FamilySummaryComponent } from './family-summary/family-summary.component';

/** Prefijo del `id` de cada semana en el documento (`#saptamana-2026-09-20`). */
const ANCLA_SEMANA = 'saptamana-';

/**
 * «Rugăciune pentru familii» — las familias por las que ora la iglesia, semana
 * a semana.
 *
 * ── Un feed, no una página y un archivo ───────────────────────────────
 * Arriba la semana que se anuncia y, al seguir bajando, las anteriores, una
 * detrás de otra: resumen (quiénes) + una ficha por familia. Es la misma
 * ficha que se proyecta el domingo.
 *
 *  - `/rugaciune-pentru-familii`           → empieza arriba, en la actual.
 *  - `/rugaciune-pentru-familii/<domingo>` → el mismo feed, colocado en esa
 *    semana (enlace para compartir). `#<familia>-<domingo>` lleva a una ficha.
 *
 * ── Carga progresiva ──────────────────────────────────────────────────
 * Cada semana son ~5 fichas con foto y una medición de maquetación
 * (`FamilyCardComponent.fitPhotoColumn`); con un año de semanas serían
 * cientos. Por eso **sólo se pinta lo que está cerca de la pantalla**: cada
 * semana existe desde el principio (su `id`, su cabecera y un esqueleto con
 * el alto aproximado) y su contenido se pinta cuando le falta pantalla y
 * media para aparecer (`appNearViewport`, un único observador para todo).
 *
 * Tener todas las semanas en el documento desde el principio (y no ir
 * añadiéndolas al final, el «scroll infinito» clásico) es a propósito: la
 * barra de desplazamiento dice la verdad, el índice puede saltar a cualquier
 * semana y **el pie de la web sigue siendo alcanzable**. Lo que se pinta ya
 * no se despinta; al subir, el anclaje de scroll del navegador mantiene la
 * vista quieta cuando un esqueleto pasa a su alto real.
 *
 * ── Índice ────────────────────────────────────────────────────────────
 * El de la confesión de fe (`app-doc-toc`): columna fija a la derecha desde
 * `xl` y, por debajo, una hoja que se abre desde el dock. Una entrada por
 * semana y, bajo la semana en la que se está, sus familias.
 */
@Component({
  selector: 'app-family-prayer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    TranslatePipe,
    PageSectionComponent,
    ShareButtonComponent,
    IconComponent,
    DocTocComponent,
    NearViewportDirective,
    FamilyCardComponent,
    FamilySummaryComponent,
    FamilyPdfComponent,
  ],
  templateUrl: './family-prayer.component.html',
  styleUrl: './family-prayer.component.scss',
})
export class FamilyPrayerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(CHURCH_CONFIG);
  protected readonly prayer = inject(FamilyPrayerService);

  private readonly params = toSignal(this.route.paramMap);
  private readonly toc = viewChild(DocTocComponent);

  /** Domingo pedido en la URL, o `null` para empezar por la semana en curso. */
  protected readonly requested = computed<string | null>(() => this.params()?.get('week') ?? null);

  /** Todas las semanas publicadas: la actual y, debajo, las anteriores. */
  protected readonly weeks = this.prayer.feed;

  /** La URL pide una semana que no existe (o que aún no se ha publicado). */
  protected readonly notFound = computed<boolean>(() => {
    const date = this.requested();
    return date !== null && this.prayer.byDate(date) === null;
  });

  /**
   * Semanas ya pintadas. Empieza con la primera (lo que se ve al entrar) y
   * la pedida en la URL; el resto entra al acercarse a la pantalla.
   */
  private readonly pintadas = signal<ReadonlySet<string>>(
    new Set(
      [this.prayer.feed()[0]?.presentedOn, this.route.snapshot.paramMap.get('week')].filter(
        (d): d is string => !!d,
      ),
    ),
  );

  protected estaPintada(week: PrayerWeekView): boolean {
    return this.pintadas().has(week.presentedOn);
  }

  protected pintar(week: PrayerWeekView): void {
    if (this.estaPintada(week)) return;
    this.pintadas.update((previas) => new Set(previas).add(week.presentedOn));
  }

  // ── Semanas previstas ──────────────────────────────────────────────

  /**
   * Semanas cargadas por adelantado (la más próxima primero). No entran en
   * el feed ni en el índice: van en un desplegable cerrado encima de la
   * semana en curso, para revisarlas antes de su domingo.
   */
  protected readonly previstas = this.prayer.upcoming;

  /** Se pintan al abrir el desplegable por primera vez (y no se despintan). */
  protected readonly previstasAbiertas = signal(false);

  protected alAlternarPrevistas(event: Event): void {
    if ((event.target as HTMLDetailsElement).open) this.previstasAbiertas.set(true);
  }

  // ── Índice ─────────────────────────────────────────────────────────

  /** Semana en la que se está (la que despliega sus familias en el índice). */
  private readonly semanaActiva = signal<string | null>(null);

  /** Ancla (de semana o de familia) → domingo de su semana. */
  private readonly semanaDeAncla = computed(() => {
    const mapa = new Map<string, string>();
    for (const week of this.weeks()) {
      mapa.set(this.weekAnchor(week), week.presentedOn);
      for (const family of week.families) mapa.set(family.anchor, week.presentedOn);
    }
    return mapa;
  });

  /**
   * Una entrada por semana (número + fechas) y, bajo la activa, sus familias.
   * Desplegar sólo la activa mantiene el índice corto aunque haya un año de
   * semanas: el resto de familias está a un toque, al llegar a su semana.
   */
  protected readonly tocEntries = computed<readonly TocEntry[]>(() => {
    const activa = this.semanaActiva() ?? this.weeks()[0]?.presentedOn;
    return this.weeks().flatMap((week) => [
      {
        id: this.weekAnchor(week),
        level: 1 as const,
        badge: String(week.number),
        label: this.prayer.formatShortRange(week),
      },
      ...(week.presentedOn === activa
        ? week.families.map((family) => ({ id: family.anchor, level: 2 as const, label: family.fullName }))
        : []),
    ]);
  });

  /** Sólo tiene sentido con más de una semana. */
  protected readonly conIndice = computed(() => this.weeks().length > 1);

  protected alCambiarActivo(id: string): void {
    const semana = this.semanaDeAncla().get(id);
    if (semana) this.semanaActiva.set(semana);
  }

  /**
   * Antes de saltar: la semana de destino se pinta ya (con el salto seco no
   * pasaría por el observador hasta después) y el panel del móvil se cierra,
   * que taparía el destino.
   */
  protected alElegirDelIndice(id: string): void {
    this.cerrarPanel(false);
    const semana = this.semanaDeAncla().get(id);
    const week = this.weeks().find((w) => w.presentedOn === semana);
    if (week) this.pintar(week);
  }

  // ── Panel del teléfono (índice desde el dock) ───────────────────────

  protected readonly panelAbierto = signal(false);

  private alternarPanel(): void {
    const abierto = !this.panelAbierto();
    this.panelAbierto.set(abierto);
    // El dock vive fuera de la página: se aparta por una clase en el `body`.
    document.body.classList.toggle('has-doc-panel', abierto);
    // `setTimeout` y no `rAF`: tiene que llegar después de que Angular quite
    // el `display: none` (un elemento oculto no acepta el foco).
    if (abierto) setTimeout(() => this.toc()?.enfocarCompacto(true));
  }

  @HostListener('document:keydown.escape')
  protected alPulsarEscape(): void {
    this.cerrarPanel(true);
  }

  private cerrarPanel(devolverFoco: boolean): void {
    if (!this.panelAbierto()) return;
    this.panelAbierto.set(false);
    document.body.classList.remove('has-doc-panel');
    if (devolverFoco) document.querySelector<HTMLElement>('.dock__btn--page')?.focus();
  }

  // ── Enlaces ────────────────────────────────────────────────────────

  protected readonly currentLink = `/${APP_PATHS.familyPrayer}`;

  protected weekAnchor(week: PrayerWeekView): string {
    return `${ANCLA_SEMANA}${week.presentedOn}`;
  }

  protected weekLink(week: PrayerWeekView): string {
    return `/${APP_PATHS.familyPrayer}/${week.presentedOn}`;
  }

  /** Enlace público de la semana (siempre con fecha: no cambia de contenido). */
  protected weekUrl(week: PrayerWeekView): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}${this.weekLink(week)}`;
  }

  /** Enlace a la ficha de una familia dentro de su semana. */
  protected familyUrl(week: PrayerWeekView, family: PrayerFamilyView): string {
    return `${this.weekUrl(week)}#${family.anchor}`;
  }

  /** Semanas que han pasado desde la que se anuncia (0 = la actual). */
  protected weeksAgo(index: number): number {
    return this.weeks()[0]?.status === 'current' ? index : index + 1;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);

    /*
     * Por debajo de `xl` el índice no ocupa pantalla: un botón del dock abre
     * la hoja (mismo patrón que la confesión de fe). Sólo si hay más de una
     * semana.
     */
    if (this.conIndice()) {
      const dock = inject(DockActionsService);
      dock.set([
        {
          id: 'family-prayer-weeks',
          labelKey: 'family_prayer.toc.panel',
          svgPath: 'M4 7h16M4 12h16M4 17h9',
          pressed: this.panelAbierto,
          compactOnly: true,
          run: () => this.alternarPanel(),
        },
      ]);
      destroyRef.onDestroy(() => {
        dock.clear();
        document.body.classList.remove('has-doc-panel');
      });
    }

    /*
     * Entrada por enlace: `/…/<domingo>` coloca el feed en esa semana y
     * `#<familia>-<domingo>` en la ficha. También se acepta el formato
     * anterior (`#<familia>` a secas), que sigue en enlaces ya compartidos.
     * Se hace aquí y no con el `anchorScrolling` del router: el router busca
     * el ancla antes de que esta página la haya pintado.
     */
    afterNextRender(() => {
      const destino = this.destinoDelEnlace();
      if (!destino) return;
      const week = this.weeks().find((w) => w.presentedOn === this.semanaDeAncla().get(destino));
      if (week) this.pintar(week);
      // Una macrotarea: llega después de que Angular pinte la semana.
      setTimeout(() => {
        const toc = this.toc();
        if (toc) toc.irA(destino);
        else document.getElementById(destino)?.scrollIntoView({ behavior: 'instant' });
        this.asentar(destino, destroyRef);
      });
    });
  }

  /**
   * Mantiene el destino de un enlace de entrada en su sitio mientras la
   * página termina de llegar.
   *
   * En una carga en frío, después del salto aún llegan las fuentes y las
   * fotos, y las fichas se remaquetan (`fitPhotoColumn`): el destino acababa
   * medio tapado por la cabecera. Durante un segundo y medio, cada vez que el
   * documento cambia de alto se vuelve a alinear, **salvo que el usuario ya
   * se haya movido**: entonces manda él.
   */
  private asentar(destino: string, destroyRef: DestroyRef): void {
    const el = document.getElementById(destino);
    if (!el) return;
    const alinear = () => el.scrollIntoView({ behavior: 'instant', block: 'start' });
    const ro = new ResizeObserver(alinear);
    const soltar = () => {
      ro.disconnect();
      clearTimeout(tope);
      for (const evento of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
        removeEventListener(evento, soltar);
      }
    };
    const tope = setTimeout(soltar, 1500);
    for (const evento of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
      addEventListener(evento, soltar, { passive: true, once: true });
    }
    ro.observe(document.documentElement);
    destroyRef.onDestroy(soltar);
  }

  /** Ancla a la que lleva la URL de entrada, o `null` si es arriba del todo. */
  private destinoDelEnlace(): string | null {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    const anclas = this.semanaDeAncla();
    if (hash && anclas.has(hash)) return hash;

    const week = this.weeks().find((w) => w.presentedOn === this.requested());
    if (!week) return null;
    const legado = week.families.find((f) => f.id === hash);
    if (legado) return legado.anchor;
    return week === this.weeks()[0] ? null : this.weekAnchor(week);
  }
}
