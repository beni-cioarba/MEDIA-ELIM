import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { LanguageService } from '../../core/services/language.service';
import { storyOf } from '../../core/leadership-stories.config';
import { PEOPLE_INDEX, PersonProfile } from '../../core/leadership.config';
import { citarArticulo } from '../credo/credo.data';
import { HighlightPipe } from './highlight.pipe';
import {
  COMMITTEE_CARDS,
  DIRECTORY,
  DirectoryArea,
  FEATURED_CARDS,
  LEADERSHIP_STATS,
  LEADER_CARDS,
  PERSON_CARDS,
  PersonCard,
  areaWeight,
  normalize,
  packColumns,
} from './leadership.view';
import { PersonAvatarComponent } from './person-avatar/person-avatar.component';
import { IconComponent } from '../../shared/icon/icon.component';

/** Vista del directorio: por departamentos (índice) o por personas (tarjetas). */
type DirectoryView = 'areas' | 'people';

/** Ancho mínimo de una columna del directorio y hueco entre columnas (px). */
const AREA_COLUMN_MIN = 272;
const AREA_COLUMN_GAP = 12;

/** Columnas del directorio que caben en `width` px (1–5). */
function areaColumnsFor(width: number): number {
  return Math.max(1, Math.min(5, Math.floor((width + AREA_COLUMN_GAP) / (AREA_COLUMN_MIN + AREA_COLUMN_GAP))));
}

/** Valor de `?vista=` para la vista por personas (la otra es la de defecto). */
const PEOPLE_VIEW_PARAM = 'persoane';

/**
 * «Conducere» — índice del organigrama.
 *
 * Revisión del 05/10/2026 (tercera): diseño sobrio y compacto (superficies
 * claras, navy como único acento, fotos a sangre en las tarjetas) y una
 * arquitectura más limpia:
 *
 *  · **Modelos de vista constantes** (`leadership.view.ts`): las plantillas
 *    sólo leen campos ya calculados.
 *  · **Estado del directorio en la URL** (`?vista=persoane&q=…`): se puede
 *    compartir una búsqueda y, al volver de un perfil con «atrás», la página
 *    sale como se dejó. Se escribe con `Location.replaceState` (no con el
 *    router): así no se navega ni se salta al principio en cada tecla.
 *  · **Índice de búsqueda por idioma**: los nombres traducidos de los
 *    departamentos se normalizan una vez por idioma, no en cada tecla.
 *  · Los enlaces antiguos `/conducere#<id>` los resuelve una guarda
 *    (`leadership.guards.ts`) antes de pintar.
 */
@Component({
  selector: 'app-leadership',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, PersonAvatarComponent, HighlightPipe],
  templateUrl: './leadership.component.html',
  styleUrl: './leadership.component.scss',
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class LeadershipComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly location = inject(Location);

  /** Pastor y pastor asistente, con su resumen (texto real o de maqueta). */
  protected readonly featured = FEATURED_CARDS.map((card) => ({
    card,
    summary: storyOf(PEOPLE_INDEX.get(card.id) as PersonProfile)?.summary ?? null,
  }));

  protected readonly leaders = LEADER_CARDS;
  protected readonly committee = COMMITTEE_CARDS;
  protected readonly stats = LEADERSHIP_STATS;

  // ------------------------------------------------------------------
  // Directorio: estado (sale de la URL al entrar)
  // ------------------------------------------------------------------

  private readonly initial = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly view = signal<DirectoryView>(
    this.initial.get('vista') === PEOPLE_VIEW_PARAM ? 'people' : 'areas',
  );

  /** Texto del buscador. */
  protected readonly query = signal(this.initial.get('q') ?? '');

  /** Búsqueda normalizada (sin diacríticos), o `''`. */
  protected readonly needle = computed(() => normalize(this.query().trim()));

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Nombres traducidos y normalizados de áreas y departamentos. Se rehace
   * sólo al cambiar de idioma.
   */
  private readonly labels = computed(() => {
    this.language.current();
    const text = (key: string): string => normalize(this.translate.instant(key) as string);
    const map = new Map<string, string>();
    for (const area of DIRECTORY) {
      map.set(`area:${area.i18nKey}`, text(`leadership.areas.${area.i18nKey}.name`));
      for (const department of area.departments) {
        map.set(department.i18nKey, text(`leadership.departments.${department.i18nKey}`));
      }
    }
    return map;
  });

  /**
   * Directorio por departamentos: entra un departamento si coincide su
   * nombre o el de alguien que sirve en él; un área entera, si coincide su
   * nombre.
   */
  protected readonly directory = computed<readonly DirectoryArea[]>(() => {
    const q = this.needle();
    if (!q) return DIRECTORY;
    const labels = this.labels();
    return DIRECTORY.map((area) =>
      labels.get(`area:${area.i18nKey}`)?.includes(q)
        ? area
        : {
            ...area,
            departments: area.departments.filter(
              (d) =>
                labels.get(d.i18nKey)?.includes(q) || d.members.some((m) => m.card.searchName.includes(q)),
            ),
          },
    ).filter((area) => area.departments.length > 0);
  });

  /**
   * Columnas del directorio según el ancho **real** del contenedor (lo mide
   * un `ResizeObserver`). Arranca con una estimación por la ventana para no
   * dar un salto al pintar.
   */
  private readonly areaColumnCount = signal(
    areaColumnsFor(typeof window === 'undefined' ? 1200 : Math.min(window.innerWidth, 1440) - 32),
  );

  private readonly areasEl = viewChild<ElementRef<HTMLElement>>('areasEl');

  /** Áreas repartidas en columnas de alto parecido (ver `packColumns`). */
  protected readonly areaColumns = computed(() =>
    packColumns(this.directory(), areaWeight, this.areaColumnCount()),
  );

  /** Directorio por personas: por nombre o por cualquiera de sus departamentos. */
  protected readonly people = computed<readonly PersonCard[]>(() => {
    const q = this.needle();
    if (!q) return PERSON_CARDS;
    const labels = this.labels();
    return PERSON_CARDS.filter(
      (card) => card.searchName.includes(q) || card.departmentKeys.some((key) => labels.get(key)?.includes(q)),
    );
  });

  /** Resultados de la vista activa (aviso de resultados y vacío). */
  protected readonly resultCount = computed(() =>
    this.view() === 'people'
      ? this.people().length
      : this.directory().reduce((sum, area) => sum + area.departments.length, 0),
  );

  constructor() {
    // El contenedor sólo existe en la vista por departamentos: se observa
    // cuando aparece y se deja de observar cuando se va.
    effect((onCleanup) => {
      const el = this.areasEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.areaColumnCount.set(areaColumnsFor(entry.contentRect.width)),
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }

  protected setView(view: DirectoryView): void {
    this.view.set(view);
    this.syncUrl();
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.syncUrl();
  }

  protected clearSearch(): void {
    this.query.set('');
    this.syncUrl();
    this.searchInput()?.nativeElement.focus();
  }

  /** `/` enfoca el buscador (como en GitHub o MDN), salvo si ya se escribe. */
  protected onShortcut(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
  }

  /** Refleja vista y búsqueda en la URL sin navegar (ni mover el scroll). */
  private syncUrl(): void {
    const params = new URLSearchParams();
    if (this.view() === 'people') params.set('vista', PEOPLE_VIEW_PARAM);
    const q = this.query().trim();
    if (q) params.set('q', q);
    this.location.replaceState(`/${APP_PATHS.leadership}`, params.toString());
  }

  protected readonly links = {
    contact: `/${APP_PATHS.contact}`,
    location: blockPath('location'),
    credo: `/${APP_PATHS.credo}`,
  } as const;

  /**
   * Artículo de la confesión que sostiene el organigrama (sacerdocio
   * universal; los oficios son gobierno espiritual, no rango).
   */
  protected readonly sacerdocio = citarArticulo('ministers');
}
