import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Botón «copiar al portapapeles» con confirmación efímera.
 *
 * Existe porque los datos que hay que copiar en esta web (IBAN, correo,
 * teléfono) se dictan mal y se transcriben peor: un IBAN mal tecleado es una
 * transferencia devuelta. El botón elimina ese error por completo.
 *
 * Detalles que no son evidentes:
 *  - `navigator.clipboard` **sólo existe en contextos seguros** (HTTPS o
 *    localhost). En un `http://` de red local no está, de ahí el respaldo con
 *    `document.execCommand`, obsoleto pero universal.
 *  - La confirmación se anuncia con `role="status"`: un lector de pantalla no
 *    ve el cambio de icono.
 */
@Component({
  selector: 'app-copy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IconComponent],
  template: `
    <button
      type="button"
      class="copy"
      [class.copy--done]="copied()"
      (click)="copy()"
      [attr.aria-label]="((copied() ? 'common.copied' : 'common.copy') | translate) + ': ' + label"
      [title]="(copied() ? 'common.copied' : 'common.copy') | translate"
    >
      <app-icon [name]="copied() ? 'check' : 'copy'" />
    </button>
    <span class="u-sr-only" role="status">
      @if (copied()) {
        {{ 'common.copied' | translate }}
      }
    </span>
  `,
  styles: [
    `
      @use 'ds' as *;

      :host {
        display: inline-flex;
        align-items: center;
      }

      .copy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        font-size: 0.95rem;
        color: var(--c-muted);
        background: transparent;
        border: 1px solid var(--c-hairline);
        border-radius: 0.6rem;
        cursor: pointer;
        transition:
          color var(--mo-base) var(--ea-standard),
          background var(--mo-base) var(--ea-standard),
          border-color var(--mo-base) var(--ea-standard);

        &:hover {
          color: var(--c-primary);
          background: var(--c-veil);
          border-color: var(--c-primary-soft);
        }

        &:focus-visible {
          @include focus-ring;
        }
      }

      .copy--done {
        color: var(--c-gold-deep);
        border-color: var(--c-gold);
        background: var(--c-gold-tint);
      }
    `,
  ],
})
export class CopyButtonComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** Texto que se copia. */
  @Input({ required: true }) value = '';

  /** Qué es ese texto, para el lector de pantalla («IBAN en euros»…). */
  @Input() label = '';

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    const ok = await writeToClipboard(this.value);
    if (!ok) return;

    this.copied.set(true);
    const id = window.setTimeout(() => this.copied.set(false), 2000);
    this.destroyRef.onDestroy(() => window.clearTimeout(id));
  }
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sigue al respaldo: el usuario puede haber denegado el permiso.
  }

  // Respaldo para contextos no seguros (http:// en la red del templo).
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  return ok;
}
