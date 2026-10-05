import { ActivatedRouteSnapshot, RedirectCommand, Router } from '@angular/router';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { isPersonId } from '../../core/leadership.config';
import { personLink } from './leadership.view';

/**
 * Guardas de «Conducere». Se cargan **perezosamente** desde `app.routes.ts`
 * (`import()` dentro de la guarda) para no meter el organigrama en el bundle
 * inicial. Redirigen antes de pintar nada y sin dejar rastro en el historial
 * (`replaceUrl`), en vez de pintar y corregir después desde el componente.
 * Reciben el `Router` ya inyectado: tras el `import()` se ha perdido el
 * contexto de inyección y `inject()` fallaría.
 */

/** `/conducere/<id>` sólo si la persona existe; si no, al índice. */
export function personExists(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  if (isPersonId(route.paramMap.get('id') ?? '')) return true;
  return new RedirectCommand(router.createUrlTree(['/', APP_PATHS.leadership]), { replaceUrl: true });
}

/**
 * Compatibilidad: `/conducere#<id>` abría la ficha en un diálogo (versión del
 * 29/09/2026). Ahora cada persona tiene su página.
 */
export function legacyPersonAnchor(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  const id = decodeURIComponent(route.fragment ?? '');
  if (!isPersonId(id)) return true;
  return new RedirectCommand(router.createUrlTree(personLink(id)), { replaceUrl: true });
}
