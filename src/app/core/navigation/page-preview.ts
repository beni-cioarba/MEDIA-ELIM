import { InjectionToken } from '@angular/core';

/**
 * `true` cuando la página está montada como **vista previa** y no como la
 * página de verdad: la sección vecina que asoma al arrastrar entre pestañas
 * en el móvil (`SwipePeekComponent`).
 *
 * Una vista previa se monta en reposo y queda oculta (sin pintar) hasta que
 * asoma; nadie interactúa con ella. Una página que arranque algo caro o con
 * efecto fuera de sí misma (sondeos de red, suscripciones globales, avances
 * automáticos) debe consultarlo y omitirlo. Hoy lo consultan el escenario
 * (sondeo del directo de YouTube) y el carrusel de tarjetas (sin avance
 * automático). La portada (`app-hero-carousel`) se para sola fuera de pantalla.
 */
export const PAGE_PREVIEW = new InjectionToken<boolean>('PAGE_PREVIEW', {
  providedIn: 'root',
  factory: () => false,
});
