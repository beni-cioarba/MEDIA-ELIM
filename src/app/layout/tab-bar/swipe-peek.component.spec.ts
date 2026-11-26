import { CUSTOM_ELEMENTS_SCHEMA, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PAGE_PREVIEW } from '../../core/navigation/page-preview';
import { PresentationService } from '../../core/presentation.service';
import { PagePreviewService } from './page-preview.service';
import { SwipePeekComponent } from './swipe-peek.component';
import { TabNavService, TabPeek } from './tab-nav.service';

/** Cuenta cuántas páginas se construyen y comprueba su contexto. */
let construidas: string[] = [];

@Component({ selector: 'app-pagina-falsa', template: 'página' })
class PaginaFalsa {
  private readonly preview = inject(PAGE_PREVIEW);
  private readonly route = inject(ActivatedRoute, { optional: true });

  constructor() {
    construidas.push(this.preview && this.route ? 'ok' : 'mal');
  }
}

class FakeTabNav {
  readonly tabs = ['/', '/biserica', '/program', '/departamente', '/multimedia', '/contact'].map((path, i) => ({
    id: `t${i}`,
    path,
    labelKey: path,
  }));
  readonly activeIndex = signal(0);
  readonly peek = signal<TabPeek | null>(null);
}

describe('SwipePeekComponent', () => {
  const originalMatchMedia = window.matchMedia;
  let tabs: FakeTabNav;
  let movil: boolean;
  const warm = vi.fn();

  async function montar() {
    TestBed.configureTestingModule({
      providers: [
        { provide: TabNavService, useValue: tabs },
        {
          provide: PagePreviewService,
          useValue: { pageFor: () => ({ component: PaginaFalsa, route: {} }), warm },
        },
        { provide: PresentationService, useValue: { isFullscreen: signal(false) } },
      ],
    });
    // La migaja real necesita el router: aquí basta con que el hueco exista.
    TestBed.overrideComponent(SwipePeekComponent, {
      set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(SwipePeekComponent);
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    return fixture;
  }

  function huecosLlenos(el: HTMLElement): number[] {
    return Array.from(el.querySelectorAll('.peek__slot'))
      .map((slot, i) => (slot.querySelector('app-pagina-falsa') ? i : -1))
      .filter((i) => i >= 0);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    construidas = [];
    movil = true;
    window.matchMedia = ((query: string) => ({ matches: movil, media: query })) as never;
    window.requestIdleCallback = ((cb: () => void) => setTimeout(cb, 1)) as never;
    window.cancelIdleCallback = ((id: number) => clearTimeout(id)) as never;
    tabs = new FakeTabNav();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('un hueco por pestaña, oculto e inerte para la tecnología de apoyo', async () => {
    const fixture = await montar();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll('.peek__slot').length).toBe(6);
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('inert')).toBe(true);
  });

  it('en reposo construye las dos pestañas de cada lado, una sola vez', async () => {
    tabs.activeIndex.set(2);
    const fixture = await montar();
    expect(huecosLlenos(fixture.nativeElement)).toEqual([0, 1, 3, 4]);
    expect(warm).toHaveBeenCalled();

    // Avanzar una pestaña sólo construye las que faltan (la que se deja, que
    // pasa a ser vecina, y la nueva a dos de distancia); nada se reconstruye.
    const antes = construidas.length;
    tabs.activeIndex.set(3);
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    expect(huecosLlenos(fixture.nativeElement)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(construidas.length - antes).toBe(2);

    // Ida y vuelta: ya están todas, no se construye ninguna más.
    tabs.activeIndex.set(1);
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    tabs.activeIndex.set(4);
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    expect(construidas.length - antes).toBe(2);
  });

  it('cada página se construye como vista previa (PAGE_PREVIEW) y con su ruta', async () => {
    await montar();
    expect(construidas.length).toBeGreaterThan(0);
    expect(construidas.every((c) => c === 'ok')).toBe(true);
  });

  it('en escritorio no construye nada', async () => {
    movil = false;
    const fixture = await montar();
    expect(huecosLlenos(fixture.nativeElement)).toEqual([]);
  });

  it('un gesto hacia una pestaña aún sin construir la construye al momento', async () => {
    movil = false; // sin construcción en reposo
    const fixture = await montar();
    tabs.peek.set({ tab: tabs.tabs[1]!, direction: 'next' });
    fixture.detectChanges();
    expect(huecosLlenos(fixture.nativeElement)).toEqual([1]);
  });

  it('al destruirse destruye sus vistas previas', async () => {
    const fixture = await montar();
    const pagina = fixture.nativeElement.querySelector('app-pagina-falsa');
    expect(pagina).not.toBeNull();
    fixture.destroy();
    expect(pagina.isConnected).toBe(false);
  });
});
