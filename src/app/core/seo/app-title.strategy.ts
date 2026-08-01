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
    this.seo.update(deepestSeo(snapshot.root));
  }
}

/** Devuelve el `seo` declarado más profundo del árbol de rutas activo. */
function deepestSeo(route: ActivatedRouteSnapshot): RouteSeo | null {
  let found: RouteSeo | null = null;
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    const seo = current.data['seo'] as RouteSeo | undefined;
    if (seo) found = seo;
    current = current.firstChild;
  }

  return found;
}
