import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Carpeta de las fotos de perfil (`Person.photo`). */
const PHOTO_ROOT = 'assets/leadership';

/**
 * Tonos del avatar de iniciales: navy y oro de la marca en cinco mezclas.
 * Cada persona tiene siempre el mismo (sale de su nombre), así una lista de
 * treinta iniciales no es una pared uniforme y se reconoce a la gente.
 */
const TONES: readonly (readonly [string, string])[] = [
  ['#1a365d', '#f3e3a6'],
  ['#24476f', '#ffffff'],
  ['#8a6d1d', '#fff8e1'],
  ['#2f4f6f', '#f3e3a6'],
  ['#5c4a1a', '#fdf5dc'],
];

/**
 * Avatar de una persona del organigrama: su foto si la hay y, si no, sus
 * iniciales sobre un tono de marca estable. El tamaño lo decide quien lo usa
 * (`--avatar-size`); la foto se recorta en círculo con `cover`, que en un
 * retrato de cara es lo correcto (a diferencia de las fotos de grupo de las
 * familias, que nunca se recortan).
 */
@Component({
  selector: 'app-person-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    '[class.avatar--photo]': 'src() !== null',
    '[style.--avatar-bg]': 'tone()[0]',
    '[style.--avatar-fg]': 'tone()[1]',
    'aria-hidden': 'true',
  },
  template: `
    @if (src(); as url) {
      <img class="avatar__img" [src]="url" alt="" loading="lazy" decoding="async" />
    } @else {
      <span class="avatar__initials">{{ initials() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: var(--avatar-size, 3rem);
      height: var(--avatar-size, 3rem);
      overflow: hidden;
      border-radius: 50%;
      background: var(--avatar-bg);
      color: var(--avatar-fg);
      box-shadow: inset 0 0 0 1px rgb(26 54 93 / 0.08);
    }

    .avatar__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar__initials {
      font-family: var(--font-display);
      font-size: calc(var(--avatar-size, 3rem) * 0.36);
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1;
    }
  `,
})
export class PersonAvatarComponent {
  readonly name = input.required<string>();
  /** Fichero en `assets/leadership/` (`Person.photo`), o nada. */
  readonly photo = input<string | undefined>();

  protected readonly src = computed(() => {
    const file = this.photo();
    return file ? `${PHOTO_ROOT}/${file}` : null;
  });

  protected readonly initials = computed(() =>
    this.name()
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join(''),
  );

  protected readonly tone = computed(() => {
    let hash = 0;
    for (const char of this.name()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return TONES[hash % TONES.length];
  });
}
