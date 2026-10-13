import { ActivatedRouteSnapshot, RedirectCommand, Router } from '@angular/router';
import { BAPTISMS } from '../../core/baptisms.config';
import { APP_PATHS } from '../../core/navigation/app-paths';

/**
 * Guardas de «Botezuri». Se cargan perezosamente desde `app.routes.ts` (el
 * registro no entra en el bundle inicial) y redirigen antes de pintar, sin
 * dejar rastro en el historial. Reciben el `Router` ya inyectado: tras el
 * `import()` se pierde el contexto de inyección.
 */

/** `/botezuri/<fecha>`: si la fecha no es de ningún botez, a la portada. */
export function baptismExists(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  const date = route.paramMap.get('date');
  if (BAPTISMS.some((b) => b.date === date)) return true;
  return new RedirectCommand(router.createUrlTree(['/', APP_PATHS.baptisms]), { replaceUrl: true });
}

/**
 * `/botezuri/<fecha>/<candidato>`: si el candidato no está en ese botez, al
 * botez (o a la portada, si tampoco existe). Un enlace con una errata sigue
 * llevando cerca.
 */
export function candidateExists(route: ActivatedRouteSnapshot, router: Router): true | RedirectCommand {
  const date = route.paramMap.get('date');
  const id = route.paramMap.get('candidate');
  const baptism = BAPTISMS.find((b) => b.date === date);
  if (baptism?.candidates.some((c) => c.id === id)) return true;
  const target = baptism ? ['/', APP_PATHS.baptisms, baptism.date] : ['/', APP_PATHS.baptisms];
  return new RedirectCommand(router.createUrlTree(target), { replaceUrl: true });
}
