import { Pipe, PipeTransform } from '@angular/core';
import { TextSegment, highlight } from './leadership.view';

/**
 * `{{ name | leadHighlight: needle }}` → trozos con o sin coincidencia, para
 * pintar la parte buscada en `<mark>`. Pipe puro: sólo se recalcula cuando
 * cambia el nombre o la búsqueda, no en cada ciclo de detección de cambios.
 */
@Pipe({ name: 'leadHighlight' })
export class HighlightPipe implements PipeTransform {
  transform(text: string, needle: string): readonly TextSegment[] {
    return highlight(text, needle);
  }
}
