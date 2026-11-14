import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';
import { RouteSeo, SeoService } from './seo.service';

/**
 * Estrategia de título del router.
 *
 * En lugar de la propiedad `title` de Angular (que sólo admite texto plano),
 * cada ruta declara `data: { seo: { titleKey, descriptionKey } }` con claves
 * i18n. Así el título cambia también al cambiar de idioma sin navegar.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.seo.update(deepestSeo(snapshot.root), snapshot.url);
  }
}

/**
 * Devuelve el `seo` declarado más profundo del árbol de rutas activo, con los
 * parámetros de la ruta sustituidos en sus claves (`seo.block.:blockId.title`
 * en `/media/locatie` → `seo.block.locatie.title`).
 */
function deepestSeo(route: ActivatedRouteSnapshot): RouteSeo | null {
  let found: RouteSeo | null = null;
  let params: Record<string, string> = {};
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    const seo = current.data['seo'] as RouteSeo | undefined;
    if (seo) found = seo;
    params = { ...params, ...current.params };
    current = current.firstChild;
  }

  if (!found) return null;
  const fill = (key: string | undefined) =>
    key?.replace(/:(\w+)/g, (token, name: string) => params[name] ?? token);
  return { ...found, titleKey: fill(found.titleKey) ?? found.titleKey, descriptionKey: fill(found.descriptionKey) };
}
