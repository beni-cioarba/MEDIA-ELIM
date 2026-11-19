/**
 * Un **módulo** de la web: una carpeta `features/<x>/` que declara sus
 * páginas y sus rutas, y de la que se deriva todo lo demás.
 *
 * Dos ficheros por módulo, a propósito separados:
 *
 *  · `<x>.pages.ts` — **datos puros**: rutas, SEO y si tiene página estática.
 *    Sin Angular, sin componentes. Lo leen la app *y los scripts de Node*
 *    (`scripts/generate-route-pages.mjs` saca de aquí las páginas estáticas,
 *    el sitemap y el robots.txt). Antes esa lista se copiaba a mano en el
 *    script y se desincronizaba.
 *  · `<x>.routes.ts` — las rutas de Angular: componente perezoso, resolvers,
 *    guardas. Construye cada ruta con `pageRoute(página, {…})`, que pone la
 *    ruta y el SEO desde la página: no se escriben dos veces.
 *
 * Añadir un módulo: `node scripts/new-module.mjs <id>` (carpeta completa) y
 * una línea en `app.routes.ts`. Receta: `docs/ai/10-architecture.md`.
 */

/** Claves SEO de una página (las traduce `SeoService`). */
export interface PageSeo {
  readonly titleKey: string;
  readonly descriptionKey: string;
  /** Accesible por enlace, fuera de los buscadores (datos personales). */
  readonly noindex?: boolean;
  /** Claves de reserva si las de arriba no existen (`seo.block.:blockId.*`). */
  readonly fallback?: { readonly titleKey: string; readonly descriptionKey: string };
}

/** Una URL concreta con página estática (expansión de una ruta con parámetros). */
export interface StaticExpansion {
  readonly path: string;
  readonly seo: PageSeo;
}

export interface ModulePage {
  /** Ruta sin barra inicial (`despre-noi`, `anunturi/:id`); `''` es la portada. */
  readonly path: string;
  readonly seo: PageSeo;
  /**
   * Herramienta del operador (panel, proyección, hojas de imprimir, guía de
   * estilos): no se precarga para el público, no tiene página estática y
   * `robots.txt` la excluye.
   */
  readonly tool?: true;
  /**
   * Página estática en el despliegue (responde 200 con su título y su
   * tarjeta al compartir). Por defecto **sí** si la ruta no tiene
   * parámetros y no es herramienta. Con parámetros, sólo las URL que se den
   * en `expand` (las de datos —un anuncio, un perfil— las genera el script
   * desde los datos: `dataPages`).
   */
  readonly staticPage?: false | {
    /** Idioma de la página (por defecto `ro`). */
    readonly lang?: 'es';
    /** Tarjeta propia al compartir (1200 × 630), ruta bajo la raíz publicada. */
    readonly image?: { readonly path: string; readonly alt: string };
    /** URL concretas de una ruta con parámetros. */
    readonly expand?: readonly StaticExpansion[];
  };
}

/** Las páginas de un módulo, con nombre (`ABOUT_PAGES.main`). */
export type ModulePages = Readonly<Record<string, ModulePage>>;

/** Identidad: sólo da tipo y deja el objeto tal cual (los nombres se conservan). */
export function definePages<T extends ModulePages>(pages: T): T {
  return pages;
}

/**
 * URL concretas de una página que el build **prerenderiza** (HTML con el
 * contenido ya pintado; ver `app.routes.server.ts`). Las mismas que tienen
 * página estática, más la portada:
 *  · herramienta → ninguna (paneles y proyección sólo existen en el navegador);
 *  · ruta con parámetros → sus `expand`;
 *  · `staticPage: false` → ninguna, salvo la portada (su página estática es
 *    el propio `index.html`, que es justo lo que se prerenderiza).
 */
export function prerenderPaths(page: ModulePage): readonly string[] {
  if (page.tool) return [];
  if (page.staticPage === false) return page.path === '' ? [''] : [];
  if (page.path.includes(':')) return (page.staticPage?.expand ?? []).map((one) => one.path);
  return [page.path];
}
