import { Provider, signal } from '@angular/core';
import { ClockService } from '../services/clock.service';

/**
 * Reloj de pruebas: `ClockService` con la hora que diga el test.
 *
 * Toda la lógica temporal de la app (qué anuncio está vigente, qué semana
 * toca, qué evento ya pasó) lee `ClockService.now`, así que fijándolo se
 * prueba «el domingo a las 09:46» sin esperar a que lo sea.
 *
 * ```ts
 * const clock = fakeClock('2026-11-16T10:00:00');
 * TestBed.configureTestingModule({ providers: [clock.provider] });
 * clock.set('2026-11-23T10:00:00'); // una semana después
 * ```
 */
export function fakeClock(initial: string): {
  readonly provider: Provider;
  set(local: string): void;
} {
  const now = signal(new Date(initial).getTime());
  const pageVisible = signal(true);
  return {
    provider: { provide: ClockService, useValue: { now: now.asReadonly(), pageVisible: pageVisible.asReadonly() } },
    set: (local: string) => now.set(new Date(local).getTime()),
  };
}
