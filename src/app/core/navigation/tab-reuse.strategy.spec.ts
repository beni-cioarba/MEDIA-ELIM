import { ActivatedRouteSnapshot, DetachedRouteHandle, Route } from '@angular/router';
import { TabReuseStrategy } from './tab-reuse.strategy';

/** Una instantánea de ruta con lo justo que lee la estrategia. */
function snapshot(url: string, config: Route, hijos: unknown[] = []): ActivatedRouteSnapshot {
  const segmentos = url.split('/').filter(Boolean).map((path) => ({ path }));
  return {
    routeConfig: config,
    children: hijos,
    pathFromRoot: [{ url: [] }, { url: segmentos }],
  } as unknown as ActivatedRouteSnapshot;
}

const pagina = (path: string): Route => ({ path, loadComponent: () => Promise.resolve(class {}) });

describe('TabReuseStrategy', () => {
  const originalMatchMedia = window.matchMedia;
  let movil = true;
  let strategy: TabReuseStrategy;

  beforeEach(() => {
    movil = true;
    window.matchMedia = ((query: string) => ({ matches: movil, media: query })) as never;
    strategy = new TabReuseStrategy();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('guarda las páginas raíz de pestaña en el teléfono', () => {
    expect(strategy.shouldDetach(snapshot('', pagina('')))).toBe(true);
    expect(strategy.shouldDetach(snapshot('biserica', pagina('biserica')))).toBe(true);
    expect(strategy.shouldDetach(snapshot('contact', pagina('contact')))).toBe(true);
  });

  it('no guarda páginas de dentro ni el shell (que también es «/»)', () => {
    expect(strategy.shouldDetach(snapshot('despre-noi', pagina('despre-noi')))).toBe(false);
    const shell: Route = { path: '', component: class {}, children: [pagina('')] };
    expect(strategy.shouldDetach(snapshot('', shell, [{}]))).toBe(false);
  });

  it('en escritorio no guarda nada', () => {
    movil = false;
    expect(strategy.shouldDetach(snapshot('biserica', pagina('biserica')))).toBe(false);
  });

  it('devuelve lo guardado y lo olvida al guardar null', () => {
    const config = pagina('program');
    const route = snapshot('program', config);
    const handle = {} as DetachedRouteHandle;
    strategy.store(route, handle);
    expect(strategy.shouldAttach(route)).toBe(true);
    expect(strategy.retrieve(route)).toBe(handle);
    strategy.store(route, null);
    expect(strategy.shouldAttach(route)).toBe(false);
    expect(strategy.retrieve(route)).toBeNull();
  });

  it('vaciar() destruye las páginas guardadas (sin fugas al salir del shell)', () => {
    const destroy = vi.fn();
    strategy.store(snapshot('biserica', pagina('biserica')), { componentRef: { destroy } } as never);
    strategy.store(snapshot('', pagina('')), {} as DetachedRouteHandle);
    expect(strategy.tamano).toBe(2);
    strategy.vaciar();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(strategy.tamano).toBe(0);
  });
});
