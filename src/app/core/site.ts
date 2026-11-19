/**
 * URL pública canónica de la web, con barra final.
 *
 * Fichero aparte (y no sólo `church.config.ts`) porque la usa el **arranque**
 * —`SeoService` pone la canónica de cada página— y la configuración entera ya
 * no viaja en el arranque. De aquí salen los QR, los enlaces que se
 * comparten, `og:url`, el calendario y las páginas estáticas
 * (`scripts/generate-route-pages.mjs` la lee de este fichero).
 */
export const PUBLIC_URL = 'https://elimarganda.com/';
