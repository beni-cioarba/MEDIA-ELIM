import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { injectIsBrowser } from '../util/platform';
import { routeKey } from './telemetry';
import { TelemetryService } from './telemetry.service';

/**
 * Cuenta cada página que se termina de abrir. El router se lee aquí y no en
 * `TelemetryService`, que no puede depender de él (lo usa el `ErrorHandler`).
 */
export function provideTelemetry(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      if (!injectIsBrowser()) return;
      const router = inject(Router);
      const telemetry = inject(TelemetryService);
      router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => telemetry.pageView(routeKey(router.routerState.snapshot.root)));
    }),
  ]);
}
