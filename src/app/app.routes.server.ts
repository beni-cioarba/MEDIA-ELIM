import { Routes } from '@angular/router';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { APP_ROUTES } from './app.routes';

/**
 * Qué rutas se **prerenderizan** en el build (`outputMode: "static"`): el
 * HTML de cada página pública sale ya con su contenido, en vez del
 * `<app-root>` vacío. Lo ven los buscadores y quien abre la web con una
 * conexión lenta, antes de que llegue el JavaScript.
 *
 * No se escribe a mano: sale de `data.prerender` de cada ruta, que pone
 * `pageRoute()` desde la página del módulo (`prerenderPaths`). Una página
 * nueva se prerenderiza sola; una herramienta, nunca. Todo lo demás —URL con
 * datos (`anunturi/:id`…), herramientas, «no encontrada»— se sirve con el
 * shell (`index.csr.html`) y se pinta en el navegador, como siempre.
 */
export function serverRoutesFrom(routes: Routes, parent = ''): ServerRoute[] {
  const out: ServerRoute[] = [];
  for (const route of routes) {
    const path = [parent, route.path ?? ''].filter(Boolean).join('/');
    const concrete = route.data?.['prerender'] as readonly string[] | undefined;
    if (concrete?.length) {
      out.push(
        path.includes(':')
          ? { path, renderMode: RenderMode.Prerender, getPrerenderParams: async () => concrete.map((one) => paramsOf(path, one)) }
          : { path, renderMode: RenderMode.Prerender },
      );
    } else if (!route.children && !route.redirectTo && path !== '**' && !path.endsWith('/**')) {
      // Explícito, no por el `**` final: `media/ecran` (la proyección) también
      // encaja en `media/:blockId`, que sí se prerenderiza.
      out.push({ path, renderMode: RenderMode.Client });
    }
    if (route.children) out.push(...serverRoutesFrom(route.children, path));
  }
  return out;
}

/** `media/:blockId` + `media/program` → `{ blockId: 'program' }`. */
export function paramsOf(pattern: string, concrete: string): Record<string, string> {
  const want = pattern.split('/');
  const have = concrete.split('/');
  if (want.length !== have.length) throw new Error(`${concrete} no encaja en ${pattern}`);
  const params: Record<string, string> = {};
  want.forEach((segment, i) => {
    if (segment.startsWith(':')) params[segment.slice(1)] = have[i];
    else if (segment !== have[i]) throw new Error(`${concrete} no encaja en ${pattern}`);
  });
  return params;
}

export const SERVER_ROUTES: ServerRoute[] = [...serverRoutesFrom(APP_ROUTES), { path: '**', renderMode: RenderMode.Client }];
