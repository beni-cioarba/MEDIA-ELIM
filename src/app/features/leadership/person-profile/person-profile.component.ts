import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG } from '../../../core/church.config';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { BreadcrumbTailService } from '../../../core/navigation/breadcrumb-tail.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LanguageService } from '../../../core/services/language.service';
import {
  CHURCH_COMMITTEE,
  PEOPLE_INDEX,
  PersonId,
  PersonPosting,
  PersonProfile,
  SERVICE_AREAS,
  ServiceArea,
  coServants,
} from '../../../core/leadership.config';
import { PLACEHOLDER_STORIES, PERSON_STORIES, storyOf } from '../../../core/leadership-stories.config';
import { CopyButtonComponent } from '../../../shared/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { PERSON_CARDS, PersonCard, cardOf, servicePostings } from '../leadership.view';
import { ViewerDocument } from '../../../shared/viewer/core/viewer-document.model';
import { ViewableDirective } from '../../../shared/viewer/viewable.directive';
import { PersonAvatarComponent } from '../person-avatar/person-avatar.component';
import { photoSource, photoThumb } from '../person-photo';

/** Puestos de una persona en un área, para la columna «Unde slujește». */
interface AreaPostings {
  readonly area: ServiceArea;
  readonly postings: readonly PersonPosting[];
}

const AREAS_BY_KEY = new Map(SERVICE_AREAS.map((area) => [area.i18nKey, area]));
const COMMITTEE = new Set<PersonId>(CHURCH_COMMITTEE);

/**
 * Perfil de una persona del organigrama: `/conducere/<id>`.
 *
 * Revisión del 05/10/2026 (tercera): sobrio y compacto. Cabecera con la foto
 * a sangre (todo el alto de la tarjeta); el pastor en navy liso como en el
 * índice. Debajo, relato a la izquierda (biografía, versículo,
 * explicaciones) y datos a la derecha (dónde sirve —cada departamento lleva
 * al directorio filtrado— y con quién); anterior / siguiente al pie.
 *
 * La guarda `personExists` garantiza que el id existe antes de pintar.
 * Cambiar de persona con anterior / siguiente reutiliza el componente (sólo
 * cambia el parámetro); el router ya devuelve el scroll arriba.
 */
@Component({
  selector: 'app-person-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    PersonAvatarComponent,
    CopyButtonComponent,
    ViewableDirective,
  ],
  templateUrl: './person-profile.component.html',
  styleUrl: './person-profile.component.scss',
})
export class PersonProfileComponent {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly seo = inject(SeoService);
  private readonly breadcrumb = inject(BreadcrumbTailService);

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') as PersonId)),
    { requireSync: true },
  );

  /** Perfil completo (cargos y puestos) y su tarjeta (nivel, enlaces…). */
  protected readonly person = computed(() => PEOPLE_INDEX.get(this.id()) as PersonProfile);
  protected readonly card = computed(() => cardOf(this.id()));

  protected readonly story = computed(() => storyOf(this.person()));

  /** Retrato para el visor; sin foto real (silueta de maqueta), nada. */
  protected readonly photoItem = computed<ViewerDocument | null>(() => {
    const { photo, name } = this.card();
    if (!photo) return null;
    const { src, srcset } = photoSource(photo, null);
    return { src, srcset, thumb: photoThumb(photo), name, alt: name };
  });

  /** ¿El texto que se ve es de maqueta? (aviso discreto al pie del relato). */
  protected readonly isPlaceholder = computed(() => PLACEHOLDER_STORIES && !PERSON_STORIES[this.id()]);

  /** Cargos que no repite el antetítulo (que ya dice «Pastor» o «Pastor asistent»). */
  protected readonly otherTitles = computed(() =>
    this.card().titles.filter((title) => title !== 'pastor' && title !== 'assistant_pastor'),
  );

  /** Puestos de servicio agrupados por área, en el orden del organigrama. */
  protected readonly areas = computed<readonly AreaPostings[]>(() => {
    const groups = new Map<string, PersonPosting[]>();
    for (const posting of servicePostings(this.person())) {
      const key = posting.areaKey as string;
      groups.set(key, [...(groups.get(key) ?? []), posting]);
    }
    return [...groups].map(([key, postings]) => ({ area: AREAS_BY_KEY.get(key) as ServiceArea, postings }));
  });

  protected readonly inCommittee = computed(() => COMMITTEE.has(this.id()));

  protected readonly peers = computed<readonly PersonCard[]>(() =>
    coServants(this.id()).map((peer) => cardOf(peer.id as PersonId)),
  );

  /** Anterior y siguiente en el orden de la página (en bucle). */
  protected readonly siblings = computed(() => {
    const index = PERSON_CARDS.findIndex((card) => card.id === this.id());
    const n = PERSON_CARDS.length;
    return { prev: PERSON_CARDS[(index - 1 + n) % n], next: PERSON_CARDS[(index + 1) % n] };
  });

  /** Enlace público del perfil, para copiar o compartir. */
  protected readonly url = computed(
    () => `${this.config.publicUrl.replace(/\/$/, '')}/${APP_PATHS.leadership}/${this.id()}`,
  );

  /**
   * Compartir del sistema (hoja nativa de móvil). En escritorio no la hay y
   * basta con «copiar enlace»: el botón genérico de la web abriría su propio
   * modal, que aquí sobra.
   */
  protected readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  protected share(): void {
    navigator.share({ title: this.card().name, url: this.url() }).catch(() => undefined);
  }

  /** Índice del organigrama (los departamentos enlazan a él con `?q=`). */
  protected readonly index = `/${APP_PATHS.leadership}`;

  constructor() {
    // Pestaña, tarjeta de enlace y migaja con el nombre de la persona (y su
    // cargo, que se traduce: por eso lee el idioma activo).
    effect(() => {
      this.language.current();
      const person = this.person();
      const title = person.titles?.[0];
      const role = title ? (this.translate.instant(`leadership.titles.${title}`) as string) : null;
      this.seo.setOverride({
        title: role ? `${person.name} · ${role}` : person.name,
        description: this.story()?.summary,
      });
      this.breadcrumb.set(person.name);
    });

    inject(DestroyRef).onDestroy(() => {
      this.seo.setOverride(null);
      this.breadcrumb.set(null);
    });
  }
}
