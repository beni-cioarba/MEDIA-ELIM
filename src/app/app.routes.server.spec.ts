import { RenderMode } from '@angular/ssr';
import { SERVER_ROUTES, paramsOf } from './app.routes.server';

/**
 * Qué se prerenderiza: sale del registro de módulos (`prerenderPaths`), así
 * que estos tests vigilan la regla, no una lista escrita a mano.
 */
describe('SERVER_ROUTES (prerender)', () => {
  const mode = (path: string) => SERVER_ROUTES.find((route) => route.path === path)?.renderMode;

  it('prerenderiza la portada y las páginas públicas', () => {
    for (const path of ['', 'despre-noi', 'contact', 'program', 'legal', 'invitati/es']) {
      expect([path, mode(path)]).toEqual([path, RenderMode.Prerender]);
    }
  });

  it('las herramientas se pintan sólo en el navegador', () => {
    // `media/ecran` encaja también en `media/:blockId`: tiene que ir explícita.
    for (const path of ['media/ecran', 'media/control', 'invitati/qr']) {
      expect([path, mode(path)]).toEqual([path, RenderMode.Client]);
    }
  });

  it('las URL con datos no se prerenderizan', () => {
    expect(mode('anunturi/:id')).toBe(RenderMode.Client);
  });

  it('una ruta con parámetros prerenderiza sus `expand`', async () => {
    const block = SERVER_ROUTES.find((route) => route.path === 'media/:blockId');
    expect(block?.renderMode).toBe(RenderMode.Prerender);
    const params = await (block as { getPrerenderParams: () => Promise<Record<string, string>[]> }).getPrerenderParams();
    expect(params).toContainEqual(expect.objectContaining({ blockId: 'program' }));
  });

  it('termina en el comodín de cliente', () => {
    expect(SERVER_ROUTES.at(-1)).toEqual({ path: '**', renderMode: RenderMode.Client });
  });

  it('paramsOf saca los parámetros y rechaza lo que no encaja', () => {
    expect(paramsOf('media/:blockId', 'media/program')).toEqual({ blockId: 'program' });
    expect(() => paramsOf('media/:blockId', 'otra/program')).toThrow();
    expect(() => paramsOf('media/:blockId', 'media')).toThrow();
  });
});
