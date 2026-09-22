import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  PreloadAllModules,
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { APP_ROUTES } from './app.routes';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from './core/church.config';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';
import { AppTitleStrategy } from './core/seo/app-title.strategy';
import { provideElimIcons } from './core/ui/icon-registry';
import { LanguageService } from './core/services/language.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Detección de cambios con zone.js, explícita desde Angular 21 (antes era
    // el valor por defecto implícito). Toda la app ya es OnPush + signals, así
    // que el paso a `provideZonelessChangeDetection()` es una línea; queda
    // pendiente de decisión (docs/ai/75-plan-evolucion.md, fase 5).
    provideZoneChangeDetection(),
    provideHttpClient(withXhr()),
    // Angular Material necesita el motor de animaciones. `...Async` lo carga
    // en un chunk aparte tras el primer pintado: el bundle inicial no paga
    // los ~40 kB de @angular/animations y el LCP no se resiente.
    provideAnimationsAsync(),
    // Iconos propios como SVG en línea dentro de `MatIconRegistry`
    // (cero peticiones de red, cero layout shift).
    provideElimIcons(),
    provideRouter(
      APP_ROUTES,
      // Páginas largas: restauramos scroll y permitimos anclas
      // (#qr-section, #bienvenida) para enlaces profundos compartidos.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // El sitio es pequeño (≈200 kB de chunks diferidos en total): precargarlos
      // tras el primer pintado hace que la navegación sea instantánea, algo
      // crítico cuando se maneja desde el portátil durante un servicio.
      withPreloading(PreloadAllModules),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideTranslateService({
      fallbackLang: 'ro',
      loader: { provide: TranslateLoader, useClass: InlineTranslateLoader },
    }),
    // El idioma se resuelve antes del primer pintado: `init()` devuelve la
    // promesa de carga del JSON del idioma activo (ver LanguageService).
    provideAppInitializer(() => inject(LanguageService).init()),
    provideAppInitializer(() => inject(PwaUpdateService).init()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Comprueba actualizaciones en cuanto la app se estabiliza (≈30s).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Título y metaetiquetas por ruta, traducidos y reactivos al idioma.
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: CHURCH_CONFIG, useValue: DEFAULT_CHURCH_CONFIG },
  ],
};
