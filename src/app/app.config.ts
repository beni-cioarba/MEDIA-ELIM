import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { Location, ViewportScroller } from '@angular/common';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  NavigationError,
  TitleStrategy,
  provideRouter,
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { APP_ROUTES } from './app.routes';
import { AppErrorHandler } from './core/errors/app-error-handler';
import { isChunkLoadError } from './core/errors/chunk-load-error';
import { StaleBuildRecovery } from './core/errors/stale-build-recovery';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';
import { PublicPreloadingStrategy } from './core/navigation/public-preloading.strategy';
import { AppTitleStrategy } from './core/seo/app-title.strategy';
import { LanguageService } from './core/services/language.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { provideTelemetry } from './core/telemetry/provide-telemetry';

export const appConfig: ApplicationConfig = {
  providers: [
    // **Sin zone.js** (17/11/2026). Toda la app es OnPush + signals: la vista se
    // repinta cuando cambia una signal o salta un evento de su plantilla, no
    // en cada temporizador de la página. Fuera 35 kB del arranque y el ciclo
    // de detección global que disparaba cada tick del carrusel. Los `NgZone.run`
    // que quedan (carrusel, sincronización entre ventanas) son inocuos: sin
    // zona, ejecutan la función tal cual; lo que repinta son las signals.
    provideZonelessChangeDetection(),
    // Errores que nadie recoge (plantillas, efectos, promesas rechazadas,
    // `window.onerror`): un solo destino, que además sabe salir de una
    // versión caducada. Ver `core/errors/app-error-handler.ts`.
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideHttpClient(withXhr()),
    // Sin `provideAnimations*()`: Angular Material 22 anima con CSS y ya no
    // depende de `@angular/animations` (el paquete está en retirada). Lo que
    // se anima en la app son transiciones CSS con su `motion-reduce`.
    provideRouter(
      APP_ROUTES,
      // Páginas largas: restauramos scroll y permitimos anclas
      // (#qr-section, #bienvenida) para enlaces profundos compartidos.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // Las páginas públicas se precargan tras el primer pintado, en reposo:
      // navegar es instantáneo, algo crítico cuando se maneja desde el
      // portátil durante un servicio. Las herramientas del operador
      // (`data.preload: false`) y quien tiene «Ahorro de datos», no.
      // Ver `PublicPreloadingStrategy`.
      withPreloading(PublicPreloadingStrategy),
      // Un chunk que ya no existe (pestaña con la versión anterior a un
      // despliegue): en vez de un clic que no hace nada, carga completa del
      // destino, que trae la versión nueva.
      withNavigationErrorHandler((failure: NavigationError) => {
        if (!isChunkLoadError(failure.error)) return;
        inject(StaleBuildRecovery).reload(inject(Location).prepareExternalUrl(failure.url));
      }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      // Las páginas públicas llegan **prerenderizadas** (HTML con contenido).
      // Sin hidratación —el contenido depende de la hora: «AZI», cuentas
      // atrás, anuncios vigentes; el del build ya no cuadra con el del
      // visitante—, Angular sustituye ese HTML por el suyo. Esperar a la
      // primera navegación (chunk perezoso y resolvers incluidos) hace que la
      // sustitución sea de una vez: del HTML del build a la página completa,
      // sin un fotograma con el `<main>` vacío. Ver `docs/ai/50-build-deploy.md`.
      withEnabledBlockingInitialNavigation(),
    ),
    provideTranslateService({
      fallbackLang: 'ro',
      loader: { provide: TranslateLoader, useClass: InlineTranslateLoader },
    }),
    // El idioma se resuelve antes del primer pintado: `init()` devuelve la
    // promesa de carga del JSON del idioma activo (ver LanguageService).
    provideAppInitializer(() => inject(LanguageService).init()),
    provideAppInitializer(() => inject(PwaUpdateService).init()),
    // Anclas (`/rugaciune-pentru-familii/<domingo>#<familia>`, credo…): el
    // `ViewportScroller` del router hace `scrollTo` con desplazamiento 0 e
    // ignora el `scroll-padding-top` del CSS, así que la ficha quedaba debajo
    // de la cabecera fija. Se le da el alto real de la cabecera más un respiro.
    provideAppInitializer(() =>
      inject(ViewportScroller).setOffset(() => [
        0,
        (document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 64) + 16,
      ]),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Comprueba actualizaciones en cuanto la app se estabiliza (≈30s).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Visitas sin cookies (GoatCounter) y errores (Sentry): docs/ai/77-analitica-errores.md.
    provideTelemetry(),
    // Título y metaetiquetas por ruta, traducidos y reactivos al idioma.
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
