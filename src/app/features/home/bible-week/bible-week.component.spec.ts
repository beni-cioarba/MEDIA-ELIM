import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ClockService } from '../../../core/services/clock.service';
import { BibleWeekComponent } from './bible-week.component';

class FixedClock {
  readonly now = signal(new Date(2026, 10, 12, 10).getTime());
  readonly pageVisible = signal(true);
}

function render(date: Date): { fixture: ComponentFixture<BibleWeekComponent>; el: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [BibleWeekComponent],
    providers: [provideTranslateService(), provideRouter([]), { provide: ClockService, useClass: FixedClock }],
  });
  (TestBed.inject(ClockService) as unknown as FixedClock).now.set(date.getTime());
  const fixture = TestBed.createComponent(BibleWeekComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

/** El pasaje tal cual se ve (sin el WORD JOINER que impide partir «32–33»). */
const text = (el: Element | null) => (el?.textContent ?? '').replace(/⁠/g, '').replace(/\s+/g, ' ').trim();
const days = (el: HTMLElement) => [...el.querySelectorAll('.bw__day')];

describe('BibleWeekComponent (Citirea Bibliei en la portada)', () => {
  beforeEach(() => {
    localStorage.removeItem('elim.bible.version');
    localStorage.removeItem('elim.bible.app');
  });
  afterEach(() => TestBed.resetTestingModule());

  it('la semana del plan en siete días, cada uno con su lectura, versículos y minutos', () => {
    const { el } = render(new Date(2026, 10, 12, 10)); // jueves, semana 98
    expect(text(el.querySelector('.bw__scope'))).toBe('bible.week · Ezechiel 32–45');
    expect(days(el).map((d) => text(d.querySelector('.bw__passage')))).toEqual([
      'Ezechiel 32–33',
      'Ezechiel 34–35',
      'Ezechiel 36–37',
      'Ezechiel 38–39',
      'Ezechiel 40–41',
      'Ezechiel 42–43',
      'Ezechiel 44–45',
    ]);
    // Ezechiel 38 (23) + 39 (29), fila a fila como la página: 4 + 5 min.
    const today = days(el)[3];
    expect(text(today.querySelector('.bw__meta'))).toBe('bible_app.verses_other · ≈ 9 min');
    expect(el.querySelector('.bw__more')!.getAttribute('href')).toBe('/media/citirea-bibliei');
  });

  it('hoy, marcado; los días pasados, atenuados', () => {
    const { el } = render(new Date(2026, 10, 12, 10));
    const today = days(el)[3];
    expect(today.classList).toContain('is-today');
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.querySelector('.bw__today')).not.toBeNull();
    expect(days(el).filter((d) => d.classList.contains('is-past')).length).toBe(3);
    expect(el.querySelectorAll('.bw__today').length).toBe(1);
  });

  it('cada día abre su lectura (primer capítulo) y su audio', () => {
    const { el } = render(new Date(2026, 10, 12, 10));
    const today = days(el)[3];
    const read = today.querySelector<HTMLAnchorElement>('.bw__read')!;
    expect(read.getAttribute('href')).toBe('https://www.bible.com/bible/191/EZK.38.VDC');
    expect(read.getAttribute('target')).toBe('_blank'); // en el ordenador, bible.com
    expect(read.getAttribute('aria-label')).toContain('bible_app.read_aria');
    expect(today.querySelector('.bw__listen')!.getAttribute('href')).toBe(
      'https://www.bible.com/audio-bible/191/EZK.38.VDC',
    );
    expect(el.querySelectorAll('.bw__listen').length).toBe(7);
  });

  it('el domingo sigue la semana que termina (hoy, su último día) y anuncia la de mañana', () => {
    const { el } = render(new Date(2026, 10, 15, 10)); // domingo
    expect(text(el.querySelector('.bw__scope'))).toBe('bible.week · Ezechiel 32–45');
    expect(days(el)[6].classList).toContain('is-today');
    const next = el.querySelector('.bw__next')!;
    expect(text(next)).toContain('home.bible_week.from_tomorrow');
    expect(text(next.querySelector('.bw__next-range'))).toBe('Ezechiel 46–48, Daniel 1–11');
    expect(next.getAttribute('href')).toBe('/media/citirea-bibliei');
  });

  it('entre semana no hay línea de la semana siguiente', () => {
    const { el } = render(new Date(2026, 10, 12, 10));
    expect(el.querySelector('.bw__next')).toBeNull();
  });

  it('acabado el plan, no se pinta', () => {
    const { el } = render(new Date(2027, 0, 5, 10));
    expect(el.querySelector('.bw')).toBeNull();
  });
});
