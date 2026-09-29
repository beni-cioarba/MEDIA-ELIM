import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrayerFamilyView } from '../../../core/services/family-prayer.service';

/**
 * Foto de una familia, **siempre entera**.
 *
 * Son fotos de grupo (hasta diez personas de cuerpo entero) en cualquier
 * formato, de 9:16 a 16:9: un recorte fijo dejaría a alguien fuera. Así que
 * la foto se encaja completa (`contain`) y el hueco que sobra en el marco lo
 * rellena **la misma foto, difuminada y oscurecida**: el marco nunca tiene
 * bandas vacías y cualquier formato parece hecho a propósito.
 *
 * El tamaño lo decide quien lo usa (el host es un bloque que llena su caja)
 * y también **qué fichero** se descarga: `srcset` lleva los tres tamaños
 * (480 · 960 · 1600, con su ancho real) y quien lo usa pasa `sizes` con el
 * ancho al que se pinta; el navegador elige según la densidad de pantalla.
 * El fondo difuminado sale siempre de la miniatura (480 px): a ese desenfoque
 * no se distingue y cuesta una décima parte.
 *
 * Sin foto (aún no la han enviado) pinta un monograma con las iniciales.
 */
@Component({
  selector: 'app-family-photo',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-empty]': '!family.photo' },
  template: `
    @if (family.photo; as photo) {
      <img class="ambient" [src]="photo.thumb" alt="" aria-hidden="true" decoding="async" />
      <img
        class="photo"
        [src]="photo.src"
        [attr.srcset]="detail ? photo.srcsetDetail : photo.srcset"
        [attr.sizes]="sizes"
        [width]="photo.width"
        [height]="photo.height"
        [alt]="'family_prayer.photo_alt' | translate: { name: family.fullName }"
        [attr.loading]="eager ? 'eager' : 'lazy'"
        decoding="async"
      />
    } @else {
      <span class="monogram" aria-hidden="true">{{ family.initials }}</span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      isolation: isolate;
      container-type: size;
      border-radius: inherit;
      background: var(--c-primary);
    }

    /* Relleno: la misma foto a sangre, difuminada y apagada para que la foto
       nítida sea lo único que se lee. Se agranda un poco para que el borde
       del desenfoque (que se aclara) quede fuera del marco. */
    .ambient {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.15);
      filter: blur(18px) saturate(1.2) brightness(0.7);
    }

    .photo {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Sin foto: iniciales en oro sobre navy, con la misma presencia que una
       foto (no un hueco gris que parezca un error de carga). */
    :host(.is-empty) {
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 30% 25%, rgba(212, 175, 55, 0.18), transparent 60%),
        var(--c-primary);
    }

    /* Discreto: acompaña al nombre, no compite con él (a un tercio del marco
       gritaba más que la ficha entera). */
    .monogram {
      font-family: var(--font-display);
      font-size: clamp(0.9rem, 20cqmin, 4.5rem);
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--c-gold-soft);
      opacity: 0.85;
    }
  `,
})
export class FamilyPhotoComponent {
  @Input({ required: true }) family!: PrayerFamilyView;
  /**
   * Ancho al que se pinta la foto (atributo `sizes`): con él el navegador
   * baja la miniatura para un resumen y la de 1600 para una ficha en retina.
   */
  @Input({ required: true }) sizes!: string;
  /** Ficha (foto protagonista): nunca se sirve la miniatura de 480. */
  @Input() detail = false;
  /** La ficha visible al cargar (la primera) no se difiere. */
  @Input() eager = false;
}
