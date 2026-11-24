import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { SearchIndex } from '../../core/search/search-engine';
import { SearchEntry } from '../../core/search/search.model';
import { SearchService, SearchStatus } from '../../core/search/search.service';
import { SearchDialogComponent } from './search-dialog.component';

const entry = (id: string, partial: Partial<SearchEntry> = {}): SearchEntry => ({
  id,
  kind: 'page',
  title: id,
  path: `/${id}`,
  icon: 'home',
  ...partial,
});

const ENTRIES: readonly SearchEntry[] = [
  entry('galerie', { suggest: 1 }),
  entry('contact', { suggest: 2 }),
  ...Array.from({ length: 9 }, (_, i) => entry(`ion${i}`, { kind: 'people', title: `Ion ${i}` })),
  entry('ioan', { title: 'Ion', boost: 2 }),
];

class FakeSearch {
  private readonly index = new SearchIndex(ENTRIES);
  readonly _status = signal<SearchStatus>('ready');
  readonly status = this._status.asReadonly();
  prepared = 0;
  prepare(): Promise<void> {
    this.prepared++;
    return Promise.resolve();
  }
  search(query: string) {
    return this.index.search(query);
  }
  suggestions() {
    return ENTRIES.filter((e) => e.suggest);
  }
}

const RECENT_KEY = 'iglesia-redes.search.recent';

describe('SearchDialogComponent', () => {
  let fixture: ComponentFixture<SearchDialogComponent>;
  let search: FakeSearch;
  let closed: boolean[];
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem(RECENT_KEY);
    // jsdom no implementa la capa modal.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    search = new FakeSearch();
    TestBed.configureTestingModule({
      imports: [SearchDialogComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideTranslateService(),
        { provide: SearchService, useValue: search },
      ],
    });
    fixture = TestBed.createComponent(SearchDialogComponent);
    document.body.appendChild(fixture.nativeElement);
    el = fixture.nativeElement as HTMLElement;
    closed = [];
    fixture.componentInstance.closed.subscribe((navigated) => closed.push(navigated));
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  const input = () => el.querySelector<HTMLInputElement>('input')!;
  const options = () => [...el.querySelectorAll<HTMLElement>('[role=option]')];
  const active = () => input().getAttribute('aria-activedescendant');
  async function type(text: string) {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function key(name: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    input().dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  it('es un combobox con su lista, y prepara el índice al abrirse', () => {
    expect(search.prepared).toBe(1);
    expect(input().getAttribute('role')).toBe('combobox');
    expect(el.querySelector(`#${input().getAttribute('aria-controls')}`)!.getAttribute('role')).toBe('listbox');
    for (const group of el.querySelectorAll('[role=group]')) {
      expect(el.querySelector(`#${group.getAttribute('aria-labelledby')}`)).not.toBeNull();
    }
  });

  it('antes de escribir ofrece sugerencias y no elige ninguna', async () => {
    expect(options().map((o) => o.getAttribute('href'))).toEqual(['/galerie', '/contact']);
    expect(active()).toBeNull();
    await key('ArrowDown');
    expect(active()).toBe('search-suggested-0');
    await key('ArrowUp');
    expect(active()).toBe('search-suggested-1');
  });

  it('al escribir elige la primera, y las flechas recorren todos los grupos', async () => {
    await type('ion');
    expect(active()).toBe('search-page-0');
    expect(el.querySelectorAll('[aria-selected=true]')).toHaveLength(1);
    await key('ArrowDown');
    expect(active()).toBe('search-people-0');
  });

  it('«Ver todos» despliega el grupo sin mover la selección ni cambiar el texto', async () => {
    await type('ion');
    const before = options().length;
    el.querySelector<HTMLElement>('.option--more')!.click();
    await fixture.whenStable();
    expect(options().length).toBeGreaterThan(before);
    expect(el.querySelector('.option--more')).toBeNull();
    await type('ion ');
    expect(el.querySelector('.option--more')).not.toBeNull();
  });

  it('Enter abre la elegida, cierra y recuerda la búsqueda en el dispositivo', async () => {
    await type('galerie');
    const event = await key('Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(closed).toEqual([true]);
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['galerie']);
  });

  it('sin resultados lo dice y ofrece las sugerencias, sin recordar nada', async () => {
    await type('zzzz');
    expect(el.textContent).toContain('search.empty_title');
    expect(options()).toHaveLength(2);
    expect(active()).toBeNull();
    await key('Enter');
    expect(closed).toEqual([]);
    expect(localStorage.getItem(RECENT_KEY)).toBeNull();
  });

  it('las teclas no llegan a la página (atajos de proyección)', async () => {
    const leaked: string[] = [];
    const listener = (event: KeyboardEvent) => leaked.push(event.key);
    window.addEventListener('keydown', listener);
    await key('f');
    await key('ArrowRight');
    window.removeEventListener('keydown', listener);
    expect(leaked).toEqual([]);
  });

  it('si no se puede preparar, lo dice y deja reintentar', async () => {
    search._status.set('error');
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('.search__retry')!.click();
    expect(search.prepared).toBe(2);
  });

  it('cierra una sola vez, con el botón o con el gesto nativo', async () => {
    el.querySelector<HTMLButtonElement>('.search__close')!.click();
    el.querySelector('dialog')!.dispatchEvent(new Event('close'));
    expect(closed).toEqual([false]);
  });
});
