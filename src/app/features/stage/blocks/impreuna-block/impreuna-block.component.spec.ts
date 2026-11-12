import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../../../../core/church.config';
import { ClockService } from '../../../../core/services/clock.service';
import { ImpreunaBlockComponent } from './impreuna-block.component';

/** Reloj fijo: el bloque sólo lee `now()`. */
class FixedClock {
  readonly now = signal(0);
  readonly pageVisible = signal(true);
}

/** Pinta la diapositiva a una fecha dada (sin traducciones: el pipe deja las claves). */
function render(date: Date): HTMLElement {
  TestBed.configureTestingModule({
    imports: [ImpreunaBlockComponent],
    providers: [
      provideTranslateService(),
      { provide: ClockService, useClass: FixedClock },
      { provide: CHURCH_CONFIG, useValue: DEFAULT_CHURCH_CONFIG },
    ],
  });
  (TestBed.inject(ClockService) as unknown as FixedClock).now.set(date.getTime());
  const fixture = TestBed.createComponent(ImpreunaBlockComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const rows = (el: HTMLElement) => [...el.querySelectorAll('.ib__day')];
const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('ImpreunaBlockComponent (diapositiva)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('entre semana: la semana de hoy, hoy resaltado y lo pasado atenuado', () => {
    const el = render(new Date(2026, 10, 11, 10)); // miércoles, día 315
    const week = rows(el);
    expect(week.length).toBe(7);
    expect(text(week[0].querySelector('.ib__num'))).toBe('9');
    expect(week[2].classList).toContain('is-today');
    expect(text(week[2].querySelector('.ib__reading'))).toBe('Iacov 1');
    expect(week[0].classList).toContain('is-past');
    expect(week[0].classList).toContain('is-wisdom');
    expect(text(el.querySelector('.ib__label'))).toBe('impreuna_slide.this_week');
    expect(el.querySelector('.ib__badge')).toBeNull();
  });

  it('el domingo anuncia la semana que empieza mañana', () => {
    const el = render(new Date(2026, 10, 15, 10)); // domingo, día 319
    const week = rows(el);
    // Lunes 16 (día 320): Psalmi y Proverbe; el domingo 15 (hoy) era Iacov 5.
    expect(text(week[0].querySelector('.ib__num'))).toBe('16');
    expect(text(week[0].querySelector('.ib__reading'))).toBe('Psalmii 126, 127; Proverbe 26:22–⁠28');
    expect(week[0].classList).toContain('is-wisdom');
    expect(week.some((r) => r.classList.contains('is-today'))).toBe(false);
    expect(text(el.querySelector('.ib__label'))).toBe('impreuna_slide.next_week');
    expect(text(el.querySelector('.ib__badge'))).toBe('impreuna_slide.starts_tomorrow');
  });

  it('el domingo antes del primer jueves avisa del ayuno en su fila', () => {
    const el = render(new Date(2026, 10, 29, 10)); // domingo 29/11 → semana del 30/11 al 6/12
    const week = rows(el);
    const thursday = week.find((r) => text(r.querySelector('.ib__num')) === '3')!;
    expect(text(thursday.querySelector('.ib__fast-tag'))).toBe('impreuna_slide.fast_tag');
    expect(week.filter((r) => r.querySelector('.ib__fast-tag')).length).toBe(1);
  });

  it('las rayas entre cifras no se parten (WORD JOINER) y el QR va a /impreuna', () => {
    const el = render(new Date(2026, 10, 10, 10)); // martes, día 314
    expect(text(rows(el)[0].querySelector('.ib__reading'))).toBe('Psalmii 122, 123; Proverbe 26:9–⁠16');
    expect(text(el.querySelector('.ib__qr-url'))).toBe('elimarganda.com/impreuna');
    expect(text(el.querySelector('.ib__fast-date'))).toContain('3');
  });
});
