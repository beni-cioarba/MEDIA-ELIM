import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHURCH_CONFIG } from '../../core/church.config';
import { LanguageService } from '../../core/services/language.service';
import { CopyButtonComponent } from '../../shared/copy-button/copy-button.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import { citarArticulo } from '../credo/credo.data';
import {
  Assignment,
  CHURCH_COMMITTEE,
  Department,
  LEADERSHIP_OFFICES,
  PEOPLE_INDEX,
  PersonId,
  PersonProfile,
  SERVICE_AREAS,
  ServiceArea,
} from '../../core/leadership.config';
import { IconComponent } from '../../shared/icon/icon.component';
import { PersonAvatarComponent } from './person-avatar/person-avatar.component';

/** Un área del directorio ya filtrada por la búsqueda. */
interface DirectoryArea {
  readonly area: ServiceArea;
  readonly departments: readonly Department[];
}

/**
 * «Conducere» — quién guía la iglesia y quién sirve en cada área.
 *
 * ── Revisión del 29/09/2026 («más profesional, innovador y comprimido») ──
 * La página medía 4.200 px en escritorio y 7.500 en móvil: diez secciones a
 * todo lo ancho, cada una con su título, subtítulo y márgenes, para tarjetas
 * de uno a cuatro nombres (una tarjeta entera para «Copii: Petrică Halas»).
 * Ahora son **tres bloques**, como una página de equipo profesional:
 *
 *   1. **Conducerea** — centrada en **personas**, no en cargos: cada una una
 *      vez, con su avatar (foto cuando llegue; iniciales mientras) y todos
 *      sus cargos en etiquetas. Antes Samuel Bogdan salía dos veces
 *      («Diaconi» y «Secretar») y las siete tarjetas se partían 5 + 2.
 *   2. **Comitetul Bisericii** — tira compacta de avatares.
 *   3. **Directorio de servicio** — las siete áreas en UN bloque de paneles
 *      en columnas, con **buscador** por persona o departamento (con o sin
 *      diacríticos). Es lo que de verdad se viene a buscar: «¿quién lleva el
 *      sonido?», «¿dónde sirve fulano?».
 *
 * Cada nombre sigue abriendo la ficha con **todos** sus cargos
 * (`PEOPLE_INDEX`, sin datos duplicados), en un `<dialog>` nativo: vive en la
 * *top layer*, así que nada lo recorta y el navegador ya gestiona foco, `Esc`
 * e `inert`.
 */
@Component({
  selector: 'app-leadership',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, PersonAvatarComponent, CopyButtonComponent],
  templateUrl: './leadership.component.html',
  styleUrl: './leadership.component.scss',
})
export class LeadershipComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly config = inject(CHURCH_CONFIG);

  constructor() {
    // Enlace directo a una persona (`/conducere#samuel-bogdan`): abre su
    // ficha al llegar. Tras pintar, porque el `<dialog>` tiene que existir.
    afterNextRender(() => {
      const id = decodeURIComponent(location.hash.slice(1));
      const person = PEOPLE_INDEX.get(id as PersonId);
      if (person) this.open(person);
    });
  }

  /**
   * Conducerea: las personas de los cargos de gobierno, **una vez cada una**,
   * en el orden de los cargos (pastor primero). Sus etiquetas son sus cargos
   * permanentes (`titles`), en singular: «Prezbiter», no «Prezbiteri».
   */
  protected readonly leaders: readonly PersonProfile[] = (() => {
    const seen = new Set<string>();
    const list: PersonProfile[] = [];
    for (const office of LEADERSHIP_OFFICES) {
      for (const member of office.members) {
        if (seen.has(member.person)) continue;
        seen.add(member.person);
        list.push(PEOPLE_INDEX.get(member.person) as PersonProfile);
      }
    }
    return list;
  })();

  /** El comité, resuelto a perfiles una vez (no en cada ciclo de detección). */
  protected readonly committee: readonly PersonProfile[] = CHURCH_COMMITTEE.map(
    (id) => PEOPLE_INDEX.get(id) as PersonProfile,
  );

  /** Totales fijos del directorio (no cambian al buscar). */
  protected readonly areaCount = SERVICE_AREAS.length;
  protected readonly servingCount = new Set(
    SERVICE_AREAS.flatMap((area) => area.departments.flatMap((d) => d.members.map((m) => m.person))),
  ).size;

  /** Texto del buscador del directorio. */
  protected readonly query = signal('');

  /** Búsqueda normalizada (sin diacríticos), o `''`. */
  private readonly needle = computed(() => normalize(this.query().trim()));

  /**
   * Directorio filtrado: un departamento entra si coincide su nombre (en el
   * idioma activo) o el de alguien que sirve en él; un área, si le queda
   * algún departamento. Sin búsqueda, todo. Lee el idioma activo para
   * volver a filtrar si cambia (los nombres de departamento se traducen).
   */
  protected readonly directory = computed<readonly DirectoryArea[]>(() => {
    this.language.current();
    const q = this.needle();
    const all = SERVICE_AREAS.map((area) => ({ area, departments: area.departments }));
    if (!q) return all;
    return all
      .map(({ area }) => {
        const areaName = normalize(this.translate.instant(`leadership.areas.${area.i18nKey}.name`));
        const departments = areaName.includes(q)
          ? area.departments
          : area.departments.filter(
              (d) =>
                normalize(this.translate.instant(`leadership.departments.${d.i18nKey}`)).includes(q) ||
                d.members.some((m) => normalize(this.profile(m).name).includes(q)),
            );
        return { area, departments };
      })
      .filter((entry) => entry.departments.length > 0);
  });

  /** Departamentos que deja la búsqueda (para el aviso de resultados). */
  protected readonly resultCount = computed(() =>
    this.directory().reduce((sum, entry) => sum + entry.departments.length, 0),
  );

  /** ¿Coincide esta persona con la búsqueda? (se resalta en el directorio). */
  protected isMatch(assignment: Assignment): boolean {
    const q = this.needle();
    return q !== '' && normalize(this.profile(assignment).name).includes(q);
  }

  /** Departamentos de servicio de una persona (sin los cargos de gobierno). */
  protected servicePostings(person: PersonProfile): PersonProfile['postings'] {
    return person.postings.filter((posting) => posting.areaKey !== null);
  }

  /** Enlace público a la ficha de una persona. */
  protected personUrl(person: PersonProfile): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/${APP_PATHS.leadership}#${person.id}`;
  }

  /** Persona abierta en la ficha, o `null` si está cerrada. */
  protected readonly selected = signal<PersonProfile | null>(null);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('personDialog');

  protected readonly links = {
    contact: `/${APP_PATHS.contact}`,
    location: blockPath('location'),
    credo: `/${APP_PATHS.credo}`,
  } as const;

  /**
   * Artículo de la confesión que sostiene el organigrama (sacerdocio
   * universal; los oficios son gobierno espiritual, no rango). El número se
   * resuelve desde `credo.data.ts` para que no pueda quedarse desfasado.
   */
  protected readonly sacerdocio = citarArticulo('ministers');

  /** Resuelve la referencia a persona. Nunca falla: `PersonId` está tipado. */
  protected profile(assignment: Assignment): PersonProfile {
    return PEOPLE_INDEX.get(assignment.person) as PersonProfile;
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.query.set('');
    input.focus();
  }

  /**
   * Abre la ficha y pone su ancla en la barra de direcciones: así la ficha
   * se puede compartir o guardar tal cual. Con la ruta entera: una URL
   * relativa se resolvería contra el `<base href>` y borraría la ruta.
   */
  protected open(person: PersonProfile): void {
    this.selected.set(person);
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${person.id}`);
  }

  protected close(): void {
    this.dialog()?.nativeElement.close();
  }

  /** Al cerrarse (botón, fondo o `Esc`): fuera la persona y fuera el ancla. */
  protected onClosed(): void {
    this.selected.set(null);
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  }

  /** Cierra al pulsar el fondo: el `::backdrop` es el propio `<dialog>`. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) this.close();
  }
}

/** Minúsculas y sin diacríticos: «tomoiaga» encuentra a «Tomoiagă». */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
