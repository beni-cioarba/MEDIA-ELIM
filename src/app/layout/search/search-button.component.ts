import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, inject, signal, viewChild, afterNextRender } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';
import { SearchLauncher } from './search-launcher.service';

/**
 * Botón del buscador en la cabecera, y sus atajos: `Ctrl`/`⌘` + `K` y `/`.
 *
 * Los atajos se escuchan en `window`: los de una página (la «/» del directorio
 * de Conducere y de la confesión de fe, que enfocan **su** buscador) están en
 * `document`, llegan antes y hacen `preventDefault`, así que mandan ellos.
 */
@Component({
  selector: 'app-search-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, IconComponent],
  template: `
    <button
      #button
      type="button"
      class="search"
      aria-haspopup="dialog"
      [attr.aria-busy]="launcher.opening() || null"
      [attr.aria-label]="'nav.search_open' | translate"
      [attr.aria-keyshortcuts]="mac() ? 'Meta+K' : 'Control+K'"
      (click)="launcher.open(button)"
      (pointerenter)="launcher.preload()"
      (focus)="launcher.preload()"
    >
      <app-icon name="search" />
      <span class="search__label" aria-hidden="true">{{ 'nav.search' | translate }}</span>
      <kbd class="search__kbd" aria-hidden="true">{{ mac() ? '⌘ K' : 'Ctrl K' }}</kbd>
    </button>
  `,
  styleUrl: './search-button.component.scss',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class SearchButtonComponent {
  protected readonly launcher = inject(SearchLauncher);
  private readonly document = inject(DOCUMENT);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  protected readonly mac = signal(false);

  constructor() {
    afterNextRender(() => this.mac.set(/mac|iphone|ipad/i.test(navigator.platform)));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.isComposing) return;
    const modifier = event.ctrlKey || event.metaKey;
    const palette = modifier && !event.shiftKey && event.key.toLowerCase() === 'k';
    const slash = !modifier && event.key === '/' && !isTyping(event.target);
    // Con otro diálogo abierto (el visor, el cajón) no se apila encima.
    if ((!palette && !slash) || this.document.querySelector('dialog[open], [aria-modal="true"]')) return;
    event.preventDefault();
    // Quien abre con el teclado vuelve a donde estaba; desde el cuerpo, al botón.
    const active = this.document.activeElement as HTMLElement | null;
    void this.launcher.open(active && active !== this.document.body ? active : this.button().nativeElement);
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}
