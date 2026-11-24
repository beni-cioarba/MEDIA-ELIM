import { Route } from '@angular/router';
import { MAIN_NAV } from '../navigation/navigation.config';
import { NavItem, isNavGroup } from '../navigation/nav.model';
import { APP_PATHS, blockPath } from '../navigation/app-paths';
import type { PageSeo } from '../modules/module.model';
import type { SearchContext, SearchEntry } from './search.model';

/**
 * Las **páginas** de la web como entradas del buscador, sacadas del propio
 * mapa de rutas: una página nueva (`<x>.pages.ts`) sale sola, sin proveedor.
 *
 * Quedan fuera: las herramientas del operador, las redirecciones, la 404, las
 * rutas con parámetros (salvo sus URL concretas: `/media/galerie`) y las
 * versiones en otro idioma de una página (`data.lang`).
 *
 * `noindex` **no** excluye: es para los buscadores de fuera. Una página del
 * menú se puede encontrar desde dentro; lo que no se indexa son las personas
 * que salen en ella (`docs/ai/78-search.md` → «Privacidad»).
 */

/** Lo que se ofrece al abrir el buscador, en este orden (detrás de lo que caduca). */
const SUGGESTED: readonly string[] = [
  blockPath('weekly'),
  blockPath('upcoming'),
  blockPath('streams'),
  `/${APP_PATHS.impreuna}`,
  blockPath('gallery'),
  `/${APP_PATHS.contact}`,
];

/** Una página pesa más que una pieza suelta de dentro. */
const PAGE_BOOST = 1.35;

/** Página de la app ya resuelta: dirección y claves de SEO. */
export interface SearchablePage {
  /** Absoluta (`/media/galerie`). */
  readonly path: string;
  readonly seo: PageSeo;
}

/** Páginas públicas del mapa de rutas (`router.config`). */
export function searchablePages(routes: readonly Route[]): readonly SearchablePage[] {
  return routes.flatMap((route) => {
    if (route.children) return searchablePages(route.children);
    const data = route.data ?? {};
    const seo = data['seo'] as PageSeo | undefined;
    const path = route.path ?? '';
    if (!seo || path === '**' || data['preload'] === false || data['lang']) return [];
    if (!path.includes(':')) return [{ path: `/${path}`, seo }];
    // Ruta con parámetros: sus URL concretas, con el parámetro puesto también
    // en las claves (`seo.block.:blockId.title`), igual que `SeoService`.
    const concrete = (data['prerender'] as readonly string[] | undefined) ?? [];
    return concrete.map((url) => ({ path: `/${url}`, seo: withParams(seo, path, url) }));
  });
}

function withParams(seo: PageSeo, pattern: string, url: string): PageSeo {
  const values = url.split('/');
  const fill = (key: string): string =>
    pattern
      .split('/')
      .reduce((out, part, i) => (part.startsWith(':') ? out.replace(part, values[i] ?? '') : out), key);
  return { titleKey: fill(seo.titleKey), descriptionKey: fill(seo.descriptionKey) };
}

/** Dónde está cada página en el menú: su entrada y el grupo que la contiene. */
interface NavPlace {
  readonly item: NavItem;
  readonly group: NavItem | null;
}

const NAV_PLACES: ReadonlyMap<string, NavPlace> = (() => {
  const places = new Map<string, NavPlace>();
  for (const item of MAIN_NAV) {
    if (item.path) places.set(item.path, { item, group: null });
    if (!isNavGroup(item)) continue;
    for (const child of item.children) {
      if (child.path && !places.has(child.path)) places.set(child.path, { item: child, group: item });
    }
  }
  return places;
})();

/** `/media/citirea-bibliei` → `media_citirea-bibliei` (clave de sus sinónimos). */
export function keywordsKey(path: string): string {
  return `search.keywords.${path.replace(/^\//, '').replaceAll('/', '_') || 'home'}`;
}

/** Las páginas, con el rótulo del menú si están en él y el de SEO si no. */
export function pageEntries(routes: readonly Route[], ctx: SearchContext): readonly SearchEntry[] {
  return searchablePages(routes).map(({ path, seo }) => {
    const place = NAV_PLACES.get(path);
    const titleKey = place?.item.labelKey ?? seo.titleKey;
    const descriptionKey = place?.item.descriptionKey ?? seo.descriptionKey;
    const group = place?.group ? ctx.t(place.group.labelKey) : null;
    const suggestAt = SUGGESTED.indexOf(path);
    return {
      id: path,
      kind: 'page',
      title: ctx.t(titleKey),
      altTitle: ctx.alt(titleKey),
      context: [group, ctx.t(descriptionKey)].filter(Boolean).join(' · '),
      path,
      icon: place?.item.icon ?? 'file-text',
      keywords: [ctx.maybe(keywordsKey(path)) ?? '', ctx.alt(keywordsKey(path))],
      body: place ? ctx.t(seo.descriptionKey) : undefined,
      boost: PAGE_BOOST,
      ...(suggestAt >= 0 ? { suggest: 100 + suggestAt } : {}),
    } satisfies SearchEntry;
  });
}
