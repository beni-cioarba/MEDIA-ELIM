import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { PersonPhoto, PhotoSlot, photoSource } from '../person-photo';

/**
 * Imagen de una persona del organigrama: su foto si la hay y, si no, la
 * **silueta de usuario** de maqueta (gris sobre gris claro, el marcador
 * estándar de cualquier aplicación) mientras llegan las fotos reales.
 *
 * No decide su tamaño ni su forma: los pone quien la usa.
 *  · `--avatar-size` (3rem por defecto) para un avatar suelto, o
 *  · `width/height: 100%` desde el contenedor para llenar una tarjeta o una
 *    fila «a sangre» (la foto con `cover`, la silueta apoyada abajo).
 *  · `--avatar-radius` (círculo por defecto).
 *
 * La foto se ve SIEMPRE entera (`contain`, decisión del usuario: nunca
 * recortada). Todas son retrato 4:5, así que quien la usa da a su hueco esa
 * proporción (`aspect-ratio: 4 / 5`) y la foto lo llena sin bandas; si algún
 * hueco no la respeta, sobra fondo gris claro, nunca se corta la cara.
 *
 * Nitidez: quien lo usa dice el tipo de hueco (`slot`, que acota los anchos
 * del `srcset`; ver `PhotoSlot`) y `sizes` con el ancho al que se pinta (si el
 * hueco es más alto que ancho, el que exige el alto: 0,8 × alto). El
 * navegador multiplica por la densidad de la pantalla y descarga sólo ese
 * fichero. `srcset`/`sizes`/`loading` van antes que `src` en la plantilla:
 * Angular asigna en ese orden y así nunca arranca la descarga de la reserva.
 */
@Component({
  selector: 'app-person-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    '[class.avatar--photo]': '!!photo()',
    'aria-hidden': 'true',
  },
  template: `
    @if (source(); as image) {
      <img
        class="avatar__img"
        [attr.loading]="eager() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="eager() ? 'high' : null"
        decoding="async"
        [attr.sizes]="sizes()"
        [attr.srcset]="image.srcset"
        [width]="image.width"
        [height]="image.height"
        [src]="image.src"
        alt=""
      />
    } @else {
      <!-- Silueta de maqueta: cabeza y hombros apoyados en el borde inferior. -->
      <svg class="avatar__silhouette" viewBox="0 0 64 64" preserveAspectRatio="xMidYMax meet" focusable="false">
        <circle cx="32" cy="25" r="11.5" />
        <path d="M8 64c1.6-13.4 11.6-22 24-22s22.4 8.6 24 22Z" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: end center;
      flex: none;
      width: var(--avatar-size, 3rem);
      height: var(--avatar-size, 3rem);
      overflow: hidden;
      border-radius: var(--avatar-radius, 50%);
      background: color-mix(in srgb, var(--c-primary) 6%, var(--c-surface-sunken));
    }

    .avatar__img {
      width: 100%;
      height: 100%;
      /* Foto entera siempre; el hueco tiene la proporción 4:5 de la foto. */
      object-fit: contain;
    }

    .avatar__silhouette {
      width: 100%;
      height: 100%;
      fill: color-mix(in srgb, var(--c-primary) 24%, var(--c-surface-sunken));
    }
  `,
})
export class PersonAvatarComponent {
  /** Foto de la persona (`personPhoto(id)`), o nada: silueta. */
  readonly photo = input<PersonPhoto | undefined>();

  /** Tipo de hueco: acota los anchos ofrecidos (ver `PhotoSlot`). */
  readonly slot = input<PhotoSlot>('small');

  /** Ancho al que se pinta (atributo `sizes`); ver la nota de nitidez. */
  readonly sizes = input('3rem');

  /** Visible al cargar (cabecera del perfil): sin carga diferida y con prioridad. */
  readonly eager = input(false, { transform: booleanAttribute });

  protected readonly source = computed(() => {
    const photo = this.photo();
    return photo ? photoSource(photo, this.slot()) : null;
  });
}
