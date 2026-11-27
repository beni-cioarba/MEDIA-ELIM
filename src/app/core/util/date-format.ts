/**
 * Formateadores de fecha **reutilizados**.
 *
 * Crear un `Intl.DateTimeFormat` es caro (resuelve el idioma y carga sus
 * datos: ~0,1 ms cada uno) y las plantillas formatean en cada detección de
 * cambios. En Rugăciune pentru familii, con doce semanas en pantalla, eran
 * medio segundo de CPU al recorrer la página (27/11/2026). Uno por idioma y
 * opciones, para toda la app: `dateTimeFormat(lang, { … }).format(fecha)`.
 *
 * Lanza lo mismo que el constructor (idioma u opciones no válidos): quien ya
 * lo envolvía en `try` sigue igual.
 */
const cache = new Map<string, Intl.DateTimeFormat>();

export function dateTimeFormat(lang: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const key = `${lang}|${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(lang, options);
    cache.set(key, format);
  }
  return format;
}
