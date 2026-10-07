import { ActivatedRouteSnapshot, RedirectCommand, Router } from '@angular/router';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { PEOPLE_INDEX, PersonId, isPersonId } from '../../core/leadership.config';
import { hasProfile } from '../../core/leadership-profiles.config';
import { PEOPLE_VIEW_PARAM, personLink } from './leadership.view';

/**
 * Guardas de «Conducere». Se cargan **perezosamente** desde `app.routes.ts`
 * (`import()` dentro de la guarda) para no meter el organigrama en el bundle
 * inicial. Redirigen antes de pintar nada y sin dejar rastro en el historial
 * (`replaceUrl`), en vez de pintar y corregir después desde el componente.
 * Reciben el `Router` ya inyectado: tras el `import()` se ha perdido el
 * contexto de inyección y `inject()` fallaría.
 */

/**
 * `/conducere/<id>` sólo si la persona tiene perfil propio. Si existe pero no
 * lo tiene (o lo tuvo y se retiró), al directorio de personas filtrado por su
 * nombre: un enlace compartido sigue llevando a ella. Si no existe, al índice.
 */
export function personHasProfile(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  const id = route.paramMap.get('id') ?? '';
  if (isPersonId(id) && hasProfile(id)) return true;
  return new RedirectCommand(fallback(router, id), { replaceUrl: true });
}

/**
 * Compatibilidad: `/conducere#<id>` abría la ficha en un diálogo (versión del
 * 29/09/2026). Ahora cada persona tiene su página.
 */
export function legacyPersonAnchor(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  const id = decodeURIComponent(route.fragment ?? '');
  if (!isPersonId(id)) return true;
  const target = hasProfile(id) ? router.createUrlTree(personLink(id)) : fallback(router, id);
  return new RedirectCommand(target, { replaceUrl: true });
}

/** Directorio por personas filtrado por el nombre (o el índice, si no existe). */
function fallback(router: Router, id: string) {
  const person = isPersonId(id) ? PEOPLE_INDEX.get(id as PersonId) : undefined;
  return router.createUrlTree(
    ['/', APP_PATHS.leadership],
    person ? { queryParams: { vista: PEOPLE_VIEW_PARAM, q: person.name } } : {},
  );
}
