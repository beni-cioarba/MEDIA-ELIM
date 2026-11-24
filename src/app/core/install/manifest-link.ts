/**
 * Manifiesto del idioma activo: dos ficheros, **la misma app** (`id`, nombre,
 * iconos y `start_url` iguales; ver `scripts/lib/install-media.mjs`). Cambian
 * la descripción, los atajos y las láminas que enseña la hoja «Instalar» del
 * navegador, que así habla el idioma de la web y no el del sistema.
 *
 * `index.html` hace lo mismo antes de arrancar Angular (para que el navegador
 * no descargue primero el otro); esto lo mantiene al cambiar de idioma.
 */
export function manifestHref(lang: string): string {
  return lang === 'es' ? 'manifest.es.webmanifest' : 'manifest.webmanifest';
}

export function syncManifestLink(document: Document, lang: string): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href = manifestHref(lang);
  // Sólo si cambia: volver a escribirlo haría que el navegador lo releyera.
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
}
