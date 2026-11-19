import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { externalReferrer, firstError, goatCounterUrl, isTrackableHost, routeKey } from './telemetry';
import { TelemetryService } from './telemetry.service';

/** Árbol mínimo del router: cada nivel con su `path`, sus segmentos y su `data`. */
function tree(...levels: { path: string; url: string[]; data?: Record<string, unknown> }[]): ActivatedRouteSnapshot {
  let child: unknown = null;
  for (const level of [...levels].reverse()) {
    child = {
      routeConfig: { path: level.path },
      url: level.url.map((path) => ({ path })),
      data: level.data ?? {},
      firstChild: child,
    };
  }
  return { routeConfig: null, url: [], data: {}, firstChild: child } as unknown as ActivatedRouteSnapshot;
}

describe('telemetría: qué se cuenta', () => {
  it('una página pública se cuenta con su dirección', () => {
    expect(routeKey(tree({ path: '', url: [] }, { path: 'despre-noi', url: ['despre-noi'] }))).toEqual({
      path: '/despre-noi',
      private: false,
      tool: false,
    });
  });

  it('una página con datos personales se cuenta por su patrón: ningún nombre sale', () => {
    const key = routeKey(
      tree(
        { path: '', url: [] },
        { path: 'botezuri/:date/:slug', url: ['botezuri', '2021-10-18', 'luca-marc'], data: { seo: { noindex: true } } },
      ),
    );
    expect(key).toEqual({ path: '/botezuri/:date/:slug', private: true, tool: false });
  });

  it('las herramientas del operador se marcan (no se cuentan)', () => {
    expect(routeKey(tree({ path: 'media/ecran', url: ['media', 'ecran'], data: { preload: false } })).tool).toBe(true);
  });

  it('sólo el dominio publicado', () => {
    expect(isTrackableHost('elimarganda.com')).toBe(true);
    for (const host of ['localhost', '127.0.0.1', '[::1]', 'app.localhost', '']) expect(isTrackableHost(host)).toBe(false);
  });

  it('el referente: sólo si es externo, y sin parámetros', () => {
    expect(externalReferrer('https://www.google.com/search?q=elim', 'https://elimarganda.com')).toBe('https://www.google.com/search');
    expect(externalReferrer('https://elimarganda.com/program', 'https://elimarganda.com')).toBeUndefined();
    expect(externalReferrer('', 'https://elimarganda.com')).toBeUndefined();
  });

  it('URL de GoatCounter: página y evento', () => {
    expect(goatCounterUrl('elim', { path: '/program', title: 'Program', screen: '390,844,3' }, 'x')).toBe(
      'https://elim.goatcounter.com/count?p=%2Fprogram&t=Program&s=390%2C844%2C3&rnd=x',
    );
    // Un evento no puede empezar por «/» (GoatCounter lo tomaría por página).
    expect(goatCounterUrl('elim', { path: '/app-instalata', event: true }, 'x')).toBe(
      'https://elim.goatcounter.com/count?p=app-instalata&e=1&rnd=x',
    );
  });

  it('al registro de errores sólo van los `Error`, no los fallos de red', () => {
    const boom = new Error('boom');
    expect(firstError(['contexto', boom])).toBe(boom);
    expect(firstError([new HttpErrorResponse({ status: 0 })])).toBeNull();
  });
});

describe('TelemetryService fuera de producción', () => {
  it('no cuenta nada (las pruebas corren en localhost y en modo desarrollo)', () => {
    const service = TestBed.inject(TelemetryService);
    expect(service.countsVisits).toBe(false);
    const created: unknown[] = [];
    const original = globalThis.Image;
    globalThis.Image = class {
      constructor() {
        created.push(this);
      }
    } as unknown as typeof Image;
    try {
      service.pageView({ path: '/program', private: false, tool: false });
      service.event('app-instalata');
      service.error(new Error('boom'), 'test', 'x');
      expect(created).toEqual([]);
    } finally {
      globalThis.Image = original;
    }
  });
});

describe('versión y destino de Sentry (los comparte el despliegue)', () => {
  it('la versión lleva el número y el commit', async () => {
    const { sentryRelease } = await import('./release');
    expect(sentryRelease({ release: '2.2.5', commit: 'c7837f9' })).toBe('elim@2.2.5+c7837f9');
  });

  it('organización y proyecto salen del DSN', async () => {
    const { sentryTarget } = await import('./release');
    expect(sentryTarget('https://abc@o123.ingest.de.sentry.io/456')).toEqual({ org: '123', project: '456' });
    expect(sentryTarget('no-es-un-dsn')).toBeNull();
  });
});
