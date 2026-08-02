import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_PATHS, blockPath } from '../../core/navigation/app-paths';
import {
  Assignment,
  CHURCH_COMMITTEE,
  Department,
  LEADERSHIP_OFFICES,
  PEOPLE_INDEX,
  PersonProfile,
  PersonTitle,
  SERVICE_AREAS,
} from '../../core/leadership.config';
import { PageSectionComponent } from '../../shared/page-section/page-section.component';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * «Conducere» — el organigrama de la iglesia.
 *
 * ── Por qué este formato y no un organigrama dibujado ─────────────────
 * El original es un árbol en papel. Un árbol se lee bien en A4 y fatal en
 * un móvil: obliga a hacer zoom, no se puede traducir, no lo lee un lector
 * de pantalla y se rompe en cuanto un departamento crece. Aquí se traduce
 * a la estructura que el árbol *significa*:
 *
 *   1. **Estructura de conducere** — los cuatro cargos de gobierno, en
 *      tarjetas grandes. Es lo que busca quien entra de fuera.
 *   2. **Siete áreas de servicio** — los 23 departamentos restantes,
 *      agrupados por afinidad. Cada área responde a una pregunta distinta
 *      del visitante, y ninguna lista pasa de cinco tarjetas.
 *
 * ── El detalle de cada persona ────────────────────────────────────────
 * Los nombres son botones. Al pulsarlos se abre una ficha con **todos**
 * sus cargos, calculada por `PEOPLE_INDEX` recorriendo la estructura: no
 * hay ni un dato duplicado que pueda quedarse desfasado.
 *
 * Se usa `<dialog>` + `showModal()` en vez de un panel absoluto porque la
 * ficha vive en la *top layer* del navegador: nunca la recorta un ancestro
 * con `overflow`, `transform` o `contain`, y el navegador ya se encarga del
 * foco atrapado, del `Esc` y del `inert` del resto de la página.
 */
@Component({
  selector: 'app-leadership',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, PageSectionComponent, IconComponent],
  templateUrl: './leadership.component.html',
  styleUrl: './leadership.component.scss',
})
export class LeadershipComponent {
  protected readonly offices = LEADERSHIP_OFFICES;
  protected readonly areas = SERVICE_AREAS;

  /**
   * El comité, ya resuelto a perfiles. Se hace una vez aquí y no con un
   * método en la plantilla: así el `@for` recorre objetos estables y no
   * se repite la búsqueda en `PEOPLE_INDEX` en cada ciclo de detección.
   */
  protected readonly committee: readonly PersonProfile[] = CHURCH_COMMITTEE.map(
    (id) => PEOPLE_INDEX.get(id) as PersonProfile,
  );

  /** Persona abierta en la ficha, o `null` si está cerrada. */
  protected readonly selected = signal<PersonProfile | null>(null);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('personDialog');

  protected readonly links = {
    contact: `/${APP_PATHS.contact}`,
    location: blockPath('location'),
  } as const;

  /** Resuelve la referencia a persona. Nunca falla: `PersonId` está tipado. */
  protected profile(assignment: Assignment): PersonProfile {
    return PEOPLE_INDEX.get(assignment.person) as PersonProfile;
  }

  /**
   * Cargos de la persona que el rótulo de la tarjeta no anuncia ya.
   * Devuelve `null` si no queda ninguno, para que la plantilla no pinte un
   * contenedor vacío.
   */
  protected extraTitles(office: Department, person: PersonProfile): readonly PersonTitle[] | null {
    const extras = (person.titles ?? []).filter((title) => title !== office.impliedTitle);
    return extras.length > 0 ? extras : null;
  }

  /** Iniciales para el avatar tipográfico (sin fotos: no las hay de todos). */
  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');
  }

  protected open(person: PersonProfile): void {
    this.selected.set(person);
    this.dialog()?.nativeElement.showModal();
  }

  protected close(): void {
    this.dialog()?.nativeElement.close();
  }

  /** Cierra al pulsar el fondo: el `::backdrop` es el propio `<dialog>`. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) this.close();
  }
}
