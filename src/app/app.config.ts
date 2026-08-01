import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
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
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { APP_ROUTES } from './app.routes';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from './core/church.config';
import { inlineTranslateLoaderFactory } from './core/i18n/inline-translate-loader';
import { AppTitleStrategy } from './core/seo/app-title.strategy';
import { provideElimIcons } from './core/ui/icon-registry';
import { LanguageService } from './core/services/language.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
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
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'ro',
        loader: {
          provide: TranslateLoader,
          useFactory: inlineTranslateLoaderFactory,
        },
      }),
    ),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [LanguageService],
      useFactory: (lang: LanguageService) => () => lang.init(),
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [PwaUpdateService],
      useFactory: (pwa: PwaUpdateService) => () => pwa.init(),
    },
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
