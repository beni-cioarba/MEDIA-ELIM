import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Piezas puras de la telemetría (sin Angular ni red): qué se cuenta y cómo se
 * escribe. Las usa `TelemetryService`; los tests las prueban directamente.
 */

/** Cómo se cuenta la página actual. */
export interface RouteKey {
  /**
   * Lo que se envía como ruta: la dirección real (`/despre-noi`) o, en las
   * páginas con datos personales (`noindex`: botezuri, familias…), el patrón
   * (`/botezuri/:date/:slug`). Ningún nombre de persona sale de la web.
   */
  readonly path: string;
  /** Página con datos personales: sin título (el título lleva el nombre). */
  readonly private: boolean;
  /** Herramienta del operador (`data.preload: false`): no se cuenta. */
  readonly tool: boolean;
}

/** Clave de la ruta activa, a partir de la raíz del árbol del router. */
export function routeKey(root: ActivatedRouteSnapshot): RouteKey {
  const pattern: string[] = [];
  const real: string[] = [];
  let leaf = root;
  for (let node: ActivatedRouteSnapshot | null = root; node; node = node.firstChild) {
    const path = node.routeConfig?.path;
    if (path) pattern.push(path);
    real.push(...node.url.map((segment) => segment.path));
    leaf = node;
  }
  const isPrivate = leaf.data?.['seo']?.noindex === true;
  return {
    path: `/${(isPrivate ? pattern : real).join('/')}`,
    private: isPrivate,
    tool: leaf.data?.['preload'] === false,
  };
}

/** Sólo se cuenta en el dominio publicado, no en `localhost` ni en pruebas. */
export function isTrackableHost(hostname: string): boolean {
  return !!hostname && !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(hostname) && !hostname.endsWith('.localhost');
}

/** Referente externo, sin parámetros (pueden llevar datos de quien enlaza). */
export function externalReferrer(referrer: string, ownOrigin: string): string | undefined {
  try {
    const url = new URL(referrer);
    return url.origin === ownOrigin ? undefined : `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export interface GoatCounterHit {
  /** Ruta de la página o nombre del evento. */
  readonly path: string;
  readonly title?: string;
  readonly referrer?: string;
  /** `width,height,scale`. */
  readonly screen?: string;
  readonly event?: boolean;
}

/**
 * URL del recuento de GoatCounter (`GET /count`, la que usa su píxel; ver
 * goatcounter.com/help/pixel). Parámetros: `p` ruta o evento, `t` título,
 * `r` referente, `s` pantalla, `e` evento, `rnd` contra cachés.
 */
export function goatCounterUrl(code: string, hit: GoatCounterHit, rnd = Math.random().toString(36).slice(2, 8)): string {
  const params = new URLSearchParams({ p: hit.event ? hit.path.replace(/^\/+/, '') : hit.path });
  if (hit.title) params.set('t', hit.title);
  if (hit.referrer) params.set('r', hit.referrer);
  if (hit.screen) params.set('s', hit.screen);
  if (hit.event) params.set('e', '1');
  params.set('rnd', rnd);
  return `https://${code}.goatcounter.com/count?${params.toString()}`;
}

/** El primer `Error` del contexto de un `log.error` (los fallos de red no lo son). */
export function firstError(context: readonly unknown[]): Error | null {
  return (context.find((value) => value instanceof Error) as Error | undefined) ?? null;
}
