import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../../core/services/language.service';

/** Cada idioma, en su propio nombre: lo reconoce quien lo necesita. */
const LANGUAGE_NAMES: Readonly<Record<AppLanguage, string>> = { ro: 'Română', es: 'Español' };

/**
 * Cambio de idioma. Texto, sin bandera ni desplegable (24/11/2026).
 *
 * Con **dos** idiomas no hay nada que elegir de una lista: basta con ofrecer el
 * otro. Es lo que hacen las webs bilingües de referencia (Canada.ca: «Français»
 * en escritorio, «FR» en el teléfono). Antes era bandera + código + galón: 80 px
 * y dos toques para un control secundario; ahora son 40 px y un toque. Y una
 * bandera es un país, no una lengua.
 *
 *  · `toggle` (cabecera): sólo el otro idioma. Enseña el código o el nombre
 *    entero según `--lang-name` / `--lang-code` del contenedor.
 *  · `segmented` (cajón): los dos, con el activo señalado.
 */
@Component({
  selector: 'app-lang-switcher',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'segmented') {
      <div class="seg" role="group" [attr.aria-label]="'lang.label' | translate">
        @for (code of lang.supported; track code) {
          <button
            type="button"
            class="seg__option"
            [attr.lang]="code"
            [attr.aria-pressed]="lang.current() === code"
            (click)="use(code)"
          >
            {{ names[code] }}
          </button>
        }
      </div>
    } @else {
      <!-- Por posición: al cambiar, el botón es el mismo y no pierde el foco. -->
      @for (code of others(); track $index) {
        <button
          type="button"
          class="lang"
          [attr.lang]="code"
          [attr.aria-label]="names[code]"
          [title]="names[code]"
          (click)="use(code)"
        >
          <span class="lang__name">{{ names[code] }}</span>
          <span class="lang__code">{{ code }}</span>
        </button>
      }
    }
  `,
  styleUrl: './lang-switcher.component.scss',
})
export class LangSwitcherComponent {
  protected readonly lang = inject(LanguageService);

  readonly variant = input<'toggle' | 'segmented'>('toggle');

  protected readonly names = LANGUAGE_NAMES;
  protected readonly others = computed(() => this.lang.supported.filter((code) => code !== this.lang.current()));

  protected use(code: AppLanguage): void {
    if (code !== this.lang.current()) void this.lang.use(code);
  }
}
