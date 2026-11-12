import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BibleLinkService } from '../../core/bible/bible-link.service';
import { BIBLE_VERSIONS } from '../../core/bible/bible-refs';
import { IconComponent } from '../icon/icon.component';

/**
 * **Opciones de lectura** — la versión (Cornilescu | RVR 1960, se recuerda en
 * el dispositivo y cambia todos los enlaces de lectura de la web) y la tienda
 * de la app Biblia cuando toca: en Android, cuando ya se sabe que falta (con
 * «Am instalat-o» para volver a intentarlo); en iPhone, discreta (allí no se
 * puede saber); en el ordenador, nada.
 *
 * `display: contents`: sus piezas entran en la fila de quien la usa (el pie de
 * la tarjeta de lectura), junto a las suyas.
 */
@Component({
  selector: 'app-bible-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="bo__versions" role="group" [attr.aria-label]="'bible_app.version' | translate">
      @for (v of versions; track v.lang) {
        <button
          type="button"
          class="bo__version"
          [attr.aria-pressed]="links.lang() === v.lang"
          [attr.lang]="v.lang"
          [title]="v.name"
          (click)="links.setVersion(v.lang)"
        >
          {{ v.short }}
        </button>
      }
    </div>

    @if (store(); as s) {
      <a class="bo__chip" [class.bo__chip--install]="s.prominent" [href]="s.url" target="_blank" rel="noopener">
        <app-icon name="download" />
        {{ (s.prominent ? 'bible_app.app_missing' : 'bible_app.app_ios') | translate }}
      </a>
      @if (s.prominent) {
        <button type="button" class="bo__reset" (click)="links.reset()">{{ 'bible_app.app_reset' | translate }}</button>
      }
    }
  `,
  styleUrl: './bible-options.component.scss',
})
export class BibleOptionsComponent {
  protected readonly links = inject(BibleLinkService);

  protected readonly versions = (['ro', 'es'] as const).map((lang) => ({ lang, ...BIBLE_VERSIONS[lang] }));

  /**
   * Tienda: en Android sólo cuando ya se sabe que falta (si no, sobra: el
   * primer «Citește» lo averigua); en iPhone siempre, discreta.
   */
  protected readonly store = computed(() => {
    const store = this.links.store;
    if (!store) return null;
    if (store.kind === 'play') return this.links.app() === 'missing' ? { ...store, prominent: true } : null;
    return { ...store, prominent: false };
  });
}
