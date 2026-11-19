import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ¿Se está ejecutando en un navegador? `false` durante el **prerender** (el
 * build pinta cada página pública en Node para que el HTML ya traiga el
 * contenido; ver `docs/ai/50-build-deploy.md`).
 *
 * Regla: lo que toca `window`, `localStorage`, `matchMedia`, temporizadores
 * de animación u observadores se arranca sólo si esto es `true` (o desde
 * `afterNextRender`, que en el servidor no se ejecuta). Llamar en contexto de
 * inyección (constructor, inicializador de campo, `inject()` de un servicio).
 */
export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}
