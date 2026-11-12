import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ClockService } from '../../../core/services/clock.service';
import { ImpreunaTeaserComponent } from './impreuna-teaser.component';

class FixedClock {
  readonly now = signal(new Date(2026, 10, 12, 10).getTime());
  readonly pageVisible = signal(true);
}

const READ_KEY = 'elim.impreuna.2026.read';

function render(date: Date): { fixture: ComponentFixture<ImpreunaTeaserComponent>; el: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [ImpreunaTeaserComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      provideRouter([]),
      { provide: ClockService, useClass: FixedClock },
    ],
  });
  TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } });
  (TestBed.inject(ClockService) as unknown as FixedClock).now.set(date.getTime());
  const fixture = TestBed.createComponent(ImpreunaTeaserComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ImpreunaTeaserComponent (Proiectul Împreună en la portada)', () => {
  beforeEach(() => localStorage.removeItem(READ_KEY));
  afterEach(() => {
    TestBed.inject(HttpTestingController).match(() => true); // la consulta de vídeos, si la hubo
    TestBed.resetTestingModule();
  });

  it('presenta el proyecto y trae lo de hoy: texto, meditación, mañana y el módulo', () => {
    const { el } = render(new Date(2026, 10, 12, 10)); // día 316
    expect(el.querySelector('#impt-title')!.textContent).toContain('nav.impreuna');
    expect(el.querySelector('.impt__day')!.textContent).toContain('home.impreuna.day');
    expect(el.querySelector('.bp__open')!.getAttribute('href')).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
    expect(el.querySelector('.impt__video')!.getAttribute('href')).toBe('/impreuna#video');
    expect(el.querySelector('.impt__video strong')!.textContent!.normalize('NFC')).toContain('Paul Răducanu'.normalize('NFC'));
    expect(el.querySelector('.impt__next')!.getAttribute('href')).toBe('/impreuna/ziua/317');
    expect(el.querySelector('.impt__cta')!.getAttribute('href')).toBe('/impreuna');
    expect(el.querySelector('.impt__mine')).toBeNull(); // aún no marca lo que lee
  });

  it('el ayuno: la víspera y el mismo primer jueves', () => {
    const eve = render(new Date(2026, 11, 2, 10)).el;
    expect(eve.querySelector('.impt__fast')!.textContent).toContain('home.impreuna.fast_tomorrow');
    TestBed.inject(HttpTestingController).match(() => true);
    TestBed.resetTestingModule();
    const fast = render(new Date(2026, 11, 3, 10)).el;
    expect(fast.querySelector('.impt__fast')!.textContent).toContain('home.impreuna.fast_today');
  });

  it('si ya marca lo que lee, su racha', () => {
    localStorage.setItem(READ_KEY, JSON.stringify([314, 315, 316]));
    const { el } = render(new Date(2026, 10, 12, 10));
    expect(el.querySelector('.impt__mine')!.textContent).toContain('home.impreuna.streak');
  });

  it('fuera de la edición no sale', () => {
    const { el } = render(new Date(2027, 0, 5, 10));
    expect(el.querySelector('.impt')).toBeNull();
  });
});
