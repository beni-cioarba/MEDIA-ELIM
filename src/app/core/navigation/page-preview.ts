import { InjectionToken } from '@angular/core';

/**
 * `true` cuando la página está montada como **vista previa** y no como la
 * página de verdad: la sección vecina que asoma al arrastrar entre pestañas
 * en el móvil (`SwipePeekComponent`).
 *
 * Una vista previa vive unos cientos de milisegundos y nadie interactúa con
 * ella, así que una página que arranque algo caro o con efecto fuera de sí
 * misma (sondeos de red, suscripciones globales) debe consultarlo y omitirlo.
 * Hoy sólo lo necesita el escenario (sondeo del directo de YouTube).
 */
export const PAGE_PREVIEW = new InjectionToken<boolean>('PAGE_PREVIEW', {
  providedIn: 'root',
  factory: () => false,
});
