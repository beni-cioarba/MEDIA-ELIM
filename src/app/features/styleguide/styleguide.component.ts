import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  COLOR_GROUPS,
  ELEVATION_STEPS,
  PRIMITIVES,
  PRINCIPLES,
  RADIUS_STEPS,
  REFERENCES,
  SPACE_STEPS,
  TYPE_SCALE,
} from './styleguide.data';
import { CopyButtonComponent } from '../../shared/copy-button/copy-button.component';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * **Guía de estilos viva** (`/stil`) — el catálogo de la app.
 *
 * Por qué existe (y por qué está *dentro* de la app y no en un Figma o un
 * Storybook aparte):
 *
 *  · **Una sola fuente de verdad.** Lo que se ve aquí son las clases reales
 *    (`src/styles/_primitives.scss`) sobre los tokens reales. Si alguien
 *    cambia un token, esta página cambia sola: no puede quedarse obsoleta
 *    como una captura o un documento.
 *  · **Sirve a tres públicos**: a quien desarrolla (qué clase uso y cómo se
 *    escribe), a quien diseña (qué existe ya antes de inventar) y a la
 *    **IA** (referencia concreta para no improvisar estilos nuevos).
 *  · **Coste cero en producción**: es una ruta perezosa (`loadComponent`)
 *    que nadie carga salvo que la abra; no añade un byte al arranque ni
 *    otra herramienta al repositorio.
 *
 * Regla de mantenimiento: **una primitiva nueva en `_primitives.scss` sin
 * su entrada en `styleguide.data.ts` es un cambio incompleto.**
 */
@Component({
  selector: 'app-styleguide',
  imports: [CopyButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './styleguide.component.html',
  styleUrl: './styleguide.component.scss',
})
export class StyleguideComponent {
  protected readonly principles = PRINCIPLES;
  protected readonly colorGroups = COLOR_GROUPS;
  protected readonly typeScale = TYPE_SCALE;
  protected readonly spaceSteps = SPACE_STEPS;
  protected readonly radiusSteps = RADIUS_STEPS;
  protected readonly elevationSteps = ELEVATION_STEPS;
  protected readonly primitives = PRIMITIVES;
  protected readonly references = REFERENCES;

  /**
   * Densidad de las muestras: el mismo marcado en modo cómodo y compacto.
   * Es la forma honesta de enseñar que la densidad la fija el contexto y no
   * el componente.
   */
  protected readonly dense = signal(false);

  /** Estado de las muestras interactivas (chips, segmentado, pestañas). */
  protected readonly chip = signal('all');
  protected readonly size = signal<'s' | 'm' | 'l'>('m');
  protected readonly tab = signal('visual');
}
