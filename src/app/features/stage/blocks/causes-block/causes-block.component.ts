import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CausesBoardComponent } from '../../../prayer-causes/causes-board/causes-board.component';

/**
 * Bloque «Cauzele Bisericii Elim»: la lista entera en una diapositiva.
 * Delega en el mismo tablero que la página web.
 */
@Component({
  selector: 'app-causes-block',
  imports: [CausesBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-causes-board />',
  styles: [':host { display: contents; }'],
})
export class CausesBlockComponent {}
