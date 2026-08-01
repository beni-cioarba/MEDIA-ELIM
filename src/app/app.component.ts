import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raíz de la aplicación: sólo monta el `router-outlet`.
 * Toda la UI vive en features cargadas de forma diferida (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
  styles: [':host { display: block; min-height: 100vh; }'],
})
export class AppComponent {}
