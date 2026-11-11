/**
 * El idioma viaja con el enlace compartido: quien lo abre ve la página en el
 * idioma en que la vio quien la compartió (`LanguageService.init` lee
 * `?lang=`). Puro, sin Angular (`share-lang.spec.ts`).
 *
 * La página de invitados lleva el idioma **en la ruta** (`/invitati/es/`),
 * porque cada idioma tiene su página estática y su tarjeta de WhatsApp: ahí
 * se usa la ruta del idioma, no `?lang`. El rumano de `/invitati/` sí lleva
 * `?lang=ro`, para que un visitante con el español guardado lo abra en rumano.
 */

export type ShareLang = 'ro' | 'es';

const GUESTS = /^\/invitati(?:\/es)?\/?$/;

export function withShareLang(url: string, lang: ShareLang): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (GUESTS.test(parsed.pathname)) {
    parsed.pathname = lang === 'es' ? '/invitati/es/' : '/invitati/';
    parsed.searchParams.delete('lang');
    if (lang === 'ro') parsed.searchParams.set('lang', 'ro');
    return parsed.toString();
  }
  parsed.searchParams.set('lang', lang);
  return parsed.toString();
}
