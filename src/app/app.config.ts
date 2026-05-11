import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
} from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from './core/church.config';
import { inlineTranslateLoaderFactory } from './core/i18n/inline-translate-loader';
import { LanguageService } from './core/services/language.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
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
    { provide: CHURCH_CONFIG, useValue: DEFAULT_CHURCH_CONFIG },
  ],
};
