import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * «Quédate a cenar»: la pieza propia del encuentro de vineri
 * (`companion: 'youth-meal'`, proyectada en `app-meeting-block`).
 *
 * Invitación, no herramienta (13/10/2026, a petición del usuario): dice que
 * al terminar el programa hay masa para todos y anima a quedarse. Sin datos
 * de la app interna (turnos, equipos, părinți): eso es organización y vive en
 * ADM-TINERET, enlazada sólo desde el pie. Texto puro: sin red ni estado.
 */
@Component({
  selector: 'app-youth-meal-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './youth-meal-block.component.html',
  styleUrl: './youth-meal-block.component.scss',
})
export class YouthMealBlockComponent {
  /** Tres razones cortas para quedarse (`departments.youth.meal.chips.*`). */
  protected readonly chips = ['everyone', 'friend', 'stay'] as const;
}
