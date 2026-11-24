import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, UrlTree } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RecentSearches } from '../../core/search/recent-searches';
import { SearchHit, groupHits } from '../../core/search/search-engine';
import { TextSegment, highlightTerms } from '../../core/search/search-text';
import { SearchEntry, SearchKind } from '../../core/search/search.model';
import { SearchService } from '../../core/search/search.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Resultados por grupo antes de «Ver todos», si hay más de un grupo. */
const PER_GROUP = 4;
/** Con un solo grupo no hay que repartir el sitio. */
const PER_GROUP_ALONE = 12;
/** Espera antes de anunciar el recuento: no se interrumpe a quien escribe. */
const ANNOUNCE_MS = 500;

/** Fila de la lista: todas son opciones del mismo listbox. */
type Option =
  | {
      readonly type: 'entry';
      readonly id: string;
      readonly entry: SearchEntry;
      readonly url: UrlTree;
      readonly title: readonly TextSegment[];
      readonly context: readonly TextSegment[];
      /** Trozo del texto que coincide: explica por qué sale. */
      readonly excerpt: readonly TextSegment[] | null;
    }
  | { readonly type: 'recent'; readonly id: string; readonly query: string }
  | { readonly type: 'more'; readonly id: string; readonly kind: SearchKind; readonly count: number };

interface OptionGroup {
  readonly id: string;
  readonly labelKey: string;
  readonly options: readonly Option[];
}

/**
 * Diálogo del buscador.
 *
 * ── Patrón ────────────────────────────────────────────────────────────
 * `<dialog>` modal nativo (capa superior, resto inerte, `Esc` y el gesto
 * «atrás» de Android lo cierran) con un **combobox** de WAI-ARIA: el foco no
 * sale del campo y `aria-activedescendant` señala la opción; las opciones son
 * enlaces de verdad (`<a role="option">`), así que Ctrl + clic, el botón
 * central y «abrir en otra pestaña» funcionan.
 *
 * Con texto, la primera opción queda elegida: escribir y `Enter` basta.
 */
@Component({
  selector: 'app-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './search-dialog.component.html',
  styleUrl: './search-dialog.component.scss',
})
export class SearchDialogComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly search = inject(SearchService);
  protected readonly recents = inject(RecentSearches);

  /** Cerrado; `true` si fue por ir a un resultado. */
  readonly closed = output<boolean>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly status = this.search.status;
  protected readonly query = signal('');
  /** Grupos desplegados enteros («Ver todos»); se olvida al cambiar el texto. */
  private readonly expanded = linkedSignal<string, ReadonlySet<SearchKind>>({
    source: this.query,
    computation: () => new Set(),
  });

  private readonly result = computed(() => {
    this.status();
    return this.search.search(this.query());
  });

  protected readonly asked = computed(() => this.query().trim() !== '');
  protected readonly partial = computed(() => this.result().partial);
  protected readonly count = computed(() => this.result().hits.length);
  protected readonly empty = computed(() => this.asked() && this.status() === 'ready' && this.count() === 0);

  protected readonly groups = computed<readonly OptionGroup[]>(() => {
    if (this.status() !== 'ready') return [];
    if (this.count() > 0) return this.resultGroups();
    const groups: OptionGroup[] = [];
    if (!this.asked() && this.recents.list().length > 0) {
      groups.push({
        id: 'recent',
        labelKey: 'search.recent',
        options: this.recents.list().map((query, i) => ({ type: 'recent', id: `search-recent-${i}`, query })),
      });
    }
    groups.push({
      id: 'suggested',
      labelKey: 'search.suggested',
      options: this.search.suggestions().map((entry, i) => this.entryOption(entry, `search-suggested-${i}`)),
    });
    return groups;
  });

  private readonly options = computed(() => this.groups().flatMap((group) => group.options));

  /** Opción señalada: la primera si hay texto; ninguna hasta que se baje si no. */
  private readonly active = linkedSignal<{ asked: boolean; query: string; options: number }, number>({
    source: () => ({ asked: this.count() > 0, query: this.query(), options: this.options().length }),
    computation: ({ asked, query, options }, previous) => {
      // «Ver todos» añade opciones sin cambiar el texto: se queda donde estaba.
      if (previous && previous.source.query === query && previous.source.asked === asked) {
        return Math.min(previous.value, options - 1);
      }
      return asked ? 0 : -1;
    },
  });

  protected readonly activeId = computed(() => this.options()[this.active()]?.id ?? null);

  /** Lo que anuncia el lector de pantalla, con retardo. */
  protected readonly announced = signal<number | null>(null);

  constructor() {
    const root = this.document.documentElement;
    const overflow = root.style.overflow;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.showModal();
      this.input().nativeElement.focus();
      root.style.overflow = 'hidden';
      this.followKeyboard(dialog, destroyRef);
    });
    destroyRef.onDestroy(() => (root.style.overflow = overflow));

    void this.search.prepare();

    // «Atrás» o un enlace de fuera con el buscador abierto: se quita de en medio.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) this.close(true);
    });

    // La opción señalada, a la vista: con `aria-activedescendant` el navegador
    // no desplaza la lista por su cuenta.
    effect(() => {
      const id = this.activeId();
      if (id) untracked(() => setTimeout(() => this.optionElement(id)?.scrollIntoView?.({ block: 'nearest' })));
    });

    effect((onCleanup) => {
      const count = this.asked() && this.status() === 'ready' ? this.count() : null;
      const timer = setTimeout(() => this.announced.set(count), ANNOUNCE_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.input().nativeElement.scrollIntoView?.({ block: 'nearest' });
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Lo que se teclea aquí no es para la página (la «F» del panel de medios
    // es pantalla completa, la «/» de Conducere su buscador…).
    event.stopPropagation();
    if (event.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter':
        if (event.target !== this.input().nativeElement) return;
        event.preventDefault();
        this.activate(event.ctrlKey || event.metaKey);
        break;
      case 'k':
      case 'K':
        // El mismo atajo que abre, cierra (y no abre la barra del navegador).
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        this.close(false);
        break;
    }
  }

  private move(step: 1 | -1): void {
    const total = this.options().length;
    if (total === 0) return;
    const from = this.active();
    this.active.set(from < 0 ? (step > 0 ? 0 : total - 1) : (from + step + total) % total);
  }

  private activate(newTab: boolean): void {
    const option = this.options()[this.active()];
    if (!option) return;
    if (option.type === 'entry' && newTab) {
      this.remember();
      const url = this.router.serializeUrl(option.url);
      this.document.defaultView?.open(new URL(`.${url}`, this.document.baseURI), '_blank', 'noopener');
      return;
    }
    this.optionElement(option.id)?.click();
  }

  protected point(id: string): void {
    const index = this.options().findIndex((option) => option.id === id);
    if (index >= 0) this.active.set(index);
  }

  /** Clic en un resultado. Con Ctrl / ⌘ / central se abre aparte y el buscador sigue. */
  protected onOpen(event: MouseEvent): void {
    this.remember();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
    this.close(true);
  }

  protected useRecent(query: string): void {
    this.setQuery(query);
  }

  protected showAll(kind: SearchKind): void {
    this.expanded.update((set) => new Set([...set, kind]));
    this.input().nativeElement.focus();
  }

  protected clear(): void {
    this.setQuery('');
  }

  protected clearRecents(): void {
    this.recents.clear();
    this.input().nativeElement.focus();
  }

  protected retry(): void {
    void this.search.prepare();
    this.input().nativeElement.focus();
  }

  /** Pulsar el velo (el propio `<dialog>`, fuera del panel) cierra. */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close(false);
  }

  protected onNativeClose(): void {
    this.close(false);
  }

  private done = false;

  protected close(navigated: boolean): void {
    if (this.done) return;
    this.done = true;
    this.closed.emit(navigated);
  }

  private setQuery(query: string): void {
    this.query.set(query);
    this.input().nativeElement.focus();
  }

  private remember(): void {
    if (this.asked() && this.count() > 0) this.recents.add(this.query());
  }

  private optionElement(id: string): HTMLElement | null {
    return this.document.getElementById(id);
  }

  private resultGroups(): readonly OptionGroup[] {
    const { hits, terms } = this.result();
    const groups = groupHits(hits);
    const limit = groups.length > 1 ? PER_GROUP : PER_GROUP_ALONE;
    return groups.map(({ kind, hits: list }) => {
      // Esconder uno solo detrás de «Ver todos» ocupa lo mismo que enseñarlo.
      const all = this.expanded().has(kind) || list.length <= limit + 1;
      const shown = all ? list : list.slice(0, limit);
      return {
        id: kind,
        labelKey: `search.kinds.${kind}`,
        options: [
          ...shown.map((hit, i) => this.hitOption(hit, `search-${kind}-${i}`, terms)),
          ...(all ? [] : [{ type: 'more' as const, id: `search-${kind}-more`, kind, count: list.length }]),
        ],
      };
    });
  }

  private hitOption(hit: SearchHit, id: string, terms: readonly string[]): Option {
    const { entry } = hit;
    return {
      ...this.entryOption(entry, id),
      title: highlightTerms(entry.title, terms),
      context: highlightTerms(entry.context ?? '', terms),
      excerpt: hit.excerpt ? highlightTerms(hit.excerpt, terms) : null,
    };
  }

  private entryOption(entry: SearchEntry, id: string): Extract<Option, { type: 'entry' }> {
    const url = this.router.createUrlTree([entry.path], {
      queryParams: entry.queryParams,
      fragment: entry.fragment,
    });
    return {
      type: 'entry',
      id,
      entry,
      url,
      title: [{ text: entry.title, hit: false }],
      context: [{ text: entry.context ?? '', hit: false }],
      excerpt: null,
    };
  }

  /**
   * En el teléfono el panel ocupa lo que deja libre el teclado: `100dvh` no
   * descuenta el teclado en iOS y los últimos resultados quedaban debajo.
   */
  private followKeyboard(dialog: HTMLElement, destroyRef: DestroyRef): void {
    const viewport = this.document.defaultView?.visualViewport;
    if (!viewport) return;
    const apply = (): void => {
      dialog.style.setProperty('--search-vh', `${viewport.height}px`);
      dialog.style.setProperty('--search-top', `${viewport.offsetTop}px`);
    };
    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    destroyRef.onDestroy(() => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    });
  }
}
