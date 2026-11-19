import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { throwError } from 'rxjs';
import { appConfig } from './app.config';
import { SERVER_ROUTES } from './app.routes.server';

/**
 * En el prerender **no se sale a internet**: YouTube, GitHub, OneSignal… Cada
 * página es una instancia de la app y cada una pediría lo suyo (cuota de la
 * API de YouTube gastada en cada build, y un build que depende de la red y
 * cambia según responda). Esos datos son del momento, así que los pide el
 * navegador; el HTML del build lleva la alternativa sin red que ya tiene cada
 * componente. Las rutas relativas (`assets/…`) sí: las sirve el propio build.
 */
const noExternalRequests: HttpInterceptorFn = (req, next) =>
  /^https?:\/\//i.test(req.url)
    ? throwError(() => new HttpErrorResponse({ url: req.url, status: 0, statusText: 'Prerender: sin red' }))
    : next(req);

const serverOnly: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(SERVER_ROUTES)),
    // En Node, `fetch` (en el navegador sigue `withXhr`, ver `app.config.ts`).
    provideHttpClient(withFetch(), withInterceptors([noExternalRequests])),
  ],
};

export const serverConfig = mergeApplicationConfig(appConfig, serverOnly);
