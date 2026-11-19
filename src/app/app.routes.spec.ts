import { Route } from '@angular/router';
import { APP_ROUTES } from './app.routes';
import { MAIN_NAV } from './core/navigation/navigation.config';
import { NavItem } from './core/navigation/nav.model';

// Que cada módulo (`features/<x>/<x>.pages.ts`) esté en `app.routes.ts` lo
// comprueba `scripts/modules.test.mjs`: Node ve las carpetas; este runner, no.

const layout = APP_ROUTES.find((route) => route.path === '' && route.children)!;
const shell: readonly Route[] = layout.children ?? [];
const bare: readonly Route[] = APP_ROUTES.filter((route) => route !== layout);
const all = [...bare, ...shell];

/** Herramientas del operador: las que no se precargan ni tienen página estática. */
const TOOLS = ['media/control', 'media/ecran', 'impreuna/tipar', 'invitati/qr', 'stil'];

describe('Mapa de rutas (módulos)', () => {
  it('hay módulos y páginas', () => {
    expect(shell.length).toBeGreaterThan(30);
  });

  it('toda ruta que pinta algo lleva SEO (las redirecciones no)', () => {
    for (const route of all) {
      if (route.redirectTo !== undefined) continue;
      expect(route.data?.['seo'], route.path).toBeTruthy();
    }
  });

  it('las herramientas no se precargan para el público', () => {
    for (const path of TOOLS) {
      const route = all.find((r) => r.path === path);
      expect(route?.data?.['preload'], path).toBe(false);
    }
  });

  it('las herramientas sin maqueta van antes de la maqueta', () => {
    for (const path of ['media/control', 'media/ecran', 'impreuna/tipar', 'invitati/qr']) {
      expect(bare.some((route) => route.path === path), path).toBe(true);
    }
  });

  it('las redirecciones de /media/<x> van antes que /media/:blockId (el router prueba en orden)', () => {
    const block = shell.findIndex((route) => route.path === 'media/:blockId');
    const redirects = shell
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => route.path?.startsWith('media/') && route.redirectTo !== undefined);
    expect(redirects.length).toBeGreaterThan(0);
    for (const { route, index } of redirects) expect(index, route.path).toBeLessThan(block);
  });

  it('la página «no encontrada» es la última', () => {
    expect(shell[shell.length - 1].path).toBe('**');
  });

  it('sin rutas repetidas', () => {
    const paths = all.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('cada entrada del menú lleva a una ruta que existe', () => {
    const paths = new Set(shell.map((route) => route.path));
    const walk = (items: readonly NavItem[]): string[] =>
      items.flatMap((item) => [...(item.path ? [item.path] : []), ...walk(item.children ?? [])]);
    for (const path of walk(MAIN_NAV)) {
      const clean = path.replace(/^\//, '');
      const blockPage = clean.startsWith('media/') && paths.has('media/:blockId');
      expect(paths.has(clean) || blockPage, path).toBe(true);
    }
  });
});
