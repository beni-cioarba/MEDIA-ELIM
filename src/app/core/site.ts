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

/**
 * Nombre de la **app instalada**: el `name` de los dos manifiestos (es el
 * mismo en los dos idiomas: cambiarlo haría que el navegador pidiera confirmar
 * otra identidad). Lo comprueba `scripts/install-media.test.mjs`.
 */
export const APP_NAME = 'Biserica Elim Arganda';
