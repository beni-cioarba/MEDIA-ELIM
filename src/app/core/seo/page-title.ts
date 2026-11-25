/** Con qué se forma el `<title>` de una página. */
export interface PageTitleParts {
  /** Nombre del sitio en el idioma activo («Iglesia Elim Arganda»). */
  readonly brand: string;
  /** Título de la página, ya traducido; vacío si no tiene. */
  readonly pageTitle: string;
  readonly isHome: boolean;
}

/**
 * Título para buscadores, pestañas y enlaces compartidos. Portada: la marca
 * delante («Biserica Elim Arganda · Biserică penticostală…»); el resto, la
 * página delante y la marca detrás.
 */
export function siteTitle({ brand, pageTitle, isHome }: PageTitleParts): string {
  if (!pageTitle || pageTitle === brand) return brand;
  return isHome ? `${brand} · ${pageTitle}` : `${pageTitle} · ${brand}`;
}

/**
 * Título de la **ventana de la app instalada**. Chrome sólo lo enseña si
 * empieza exactamente por el nombre de la app (el del manifiesto); si no,
 * pinta el nombre a secas (medido el 25/11/2026 en Chrome 157: ni el
 * `short_name` delante ni `<meta name="application-title">` sirven). Por eso
 * desaparecía en español («Iglesia Elim…») y en las páginas interiores.
 */
export function appWindowTitle(appName: string, { brand, pageTitle }: PageTitleParts): string {
  return !pageTitle || pageTitle === brand ? appName : `${appName} · ${pageTitle}`;
}
