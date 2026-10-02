import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceClass } from '../../core/util/install-platform';
import { IconName } from '../../core/ui/icon-name';
import { IconComponent } from '../icon/icon.component';

/**
 * Cortes de la escala de diseño (`$breakpoints` de `_tokens.scss`): por debajo
 * de `sm` la maqueta es de teléfono; por debajo de `lg`, de tableta.
 */
const PHONE_MAX = 720;
const TABLET_MAX = 1024;

/** Orden fijo de los glifos: de la pantalla mayor a la menor. */
const DEVICES: readonly { readonly id: DeviceClass; readonly icon: IconName }[] = [
  { id: 'desktop', icon: 'device-desktop' },
  { id: 'tablet', icon: 'device-tablet' },
  { id: 'phone', icon: 'device-phone' },
];

/**
 * Sello «100 % adaptable» de la franja legal.
 *
 * Tres glifos (ordenador · tableta · teléfono) y «100%»: se entiende sin leer.
 * El glifo de la maqueta que se está viendo **se enciende en oro** y cambia en
 * vivo al girar el móvil o estrechar la ventana: en vez de afirmar que la web
 * se adapta, lo demuestra. El detalle (las tres clases y el ancho actual) va
 * en un tooltip propio, como el de la versión, que se abre con ratón, teclado
 * y un toque.
 *
 * Mide el **ancho de la ventana** (la maqueta), no el aparato: un portátil
 * con la ventana estrecha ve la maqueta de teléfono, y eso es lo que se marca.
 */
@Component({
  selector: 'app-device-fit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  templateUrl: './device-fit.component.html',
  styleUrl: './device-fit.component.scss',
})
export class DeviceFitComponent {
  protected readonly devices = DEVICES;

  /** Ancho CSS de la ventana; 0 hasta el primer render (SSR/prerender seguro). */
  protected readonly width = signal(0);

  protected readonly current = computed<DeviceClass | null>(() => {
    const w = this.width();
    if (!w) return null;
    return w < PHONE_MAX ? 'phone' : w < TABLET_MAX ? 'tablet' : 'desktop';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let frame = 0;
      const measure = (): void => {
        frame = 0;
        this.width.set(Math.round(window.innerWidth));
      };
      const onResize = (): void => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      measure();
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(frame);
      });
    });
  }
}
