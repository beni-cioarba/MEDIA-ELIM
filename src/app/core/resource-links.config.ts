import { BIBLE_VERSIONS, BibleLang } from './bible/bible-refs';
import type { IconName } from './ui/icon-name';

/**
 * Enlaces de interés del pie («Linkuri utile»): recursos externos que la
 * iglesia recomienda. Datos, no marcado: añadir uno es una línea aquí y su
 * rótulo en `footer.resources.<id>` de los dos idiomas.
 *
 * La Biblia no está en la lista: lleva su propio selector de versión
 * (Cornilescu / Reina-Valera 1960) que sigue al idioma de la web
 * (`bibleHomeUrl`).
 */
export interface ResourceLink {
  /** Clave del rótulo: `footer.resources.<id>`. */
  readonly id: string;
  readonly url: string;
  readonly icon: IconName;
}

export const RESOURCE_LINKS: readonly ResourceLink[] = [
  { id: 'songs', url: 'https://www.resursecrestine.ro/cantece', icon: 'music' },
  { id: 'poems', url: 'https://www.resursecrestine.ro/poezii', icon: 'file-text' },
  { id: 'cult', url: 'https://cultulpenticostal.ro/', icon: 'church' },
];

/**
 * Portada de la versión en bible.com, con la interfaz en el mismo idioma
 * (`/ro/bible/191` → Cornilescu en rumano; `/es/bible/149` → RVR 1960).
 * bible.com abre la app Biblia si está instalada en el móvil.
 */
export function bibleHomeUrl(lang: BibleLang): string {
  return `https://www.bible.com/${lang}/bible/${BIBLE_VERSIONS[lang].id}`;
}
