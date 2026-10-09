import { DepartmentConfig } from '../../core/departments.config';
import { PEOPLE_INDEX, PersonId, SERVICE_AREAS, ServiceRole } from '../../core/leadership.config';
import { hasProfile } from '../../core/leadership-profiles.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { personLink } from '../leadership/leadership.view';
import { PersonPhoto, personPhoto, photoThumb } from '../leadership/person-photo';

/** Quien sirve en el departamento, listo para pintar. */
export interface DepartmentPerson {
  readonly id: PersonId;
  readonly name: string;
  readonly initials: string;
  readonly roles: readonly ServiceRole[];
  readonly photo: string | null;
  /** Perfil propio, o `null` (entonces la fila enlaza al directorio). */
  readonly link: string[] | null;
}

/** Enlace al directorio de Conducere cuando la persona no tiene perfil. */
export const LEADERSHIP_LINK = ['/', APP_PATHS.leadership];

/**
 * Responsables del departamento, **derivados del organigrama**
 * (`leadership.config.ts`): primero quien tiene un rol (responsable,
 * dirijor…), luego el resto, en el orden del organigrama.
 */
export function departmentPeople(department: DepartmentConfig): readonly DepartmentPerson[] {
  if (!department.leadership) return [];
  const source = SERVICE_AREAS.flatMap((area) => area.departments).find(
    (d) => d.id === department.leadership,
  );
  if (!source) return [];
  return [...source.members]
    .sort((a, b) => (b.roles?.length ?? 0) - (a.roles?.length ?? 0))
    .map(({ person, roles }) => {
      const profile = PEOPLE_INDEX.get(person);
      const name = profile?.name ?? person;
      const photo: PersonPhoto | undefined = personPhoto(person);
      return {
        id: person,
        name,
        initials: name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        roles: roles ?? [],
        photo: photo ? photoThumb(photo) : null,
        link: hasProfile(person) ? personLink(person) : null,
      };
    });
}
