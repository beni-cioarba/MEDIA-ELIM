import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { PresentationService } from '../../../../core/presentation.service';
import { ClockService } from '../../../../core/services/clock.service';
import { BibleBlockComponent } from './bible-block.component';

/** Viernes 13/11/2026: semana 98 del plan (Ezechiel 32–45), hoy «Ezechiel 40-41». */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 13, 10).getTime());
  readonly pageVisible = signal(true);
}

function render(fullscreen: boolean, zi?: string): { fixture: ComponentFixture<BibleBlockComponent>; el: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [BibleBlockComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      provideRouter([]),
      { provide: ClockService, useClass: FixedClock },
      { provide: PresentationService, useValue: { isFullscreen: signal(fullscreen) } },
    ],
  });
  TestBed.overrideProvider(ActivatedRoute, {
    useValue: { snapshot: { queryParamMap: convertToParamMap(zi ? { zi } : {}) } },
  });
  const fixture = TestBed.createComponent(BibleBlockComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const picks = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.cbw__day-pick')];
const rowLabels = (el: HTMLElement) => [...el.querySelectorAll('.cbw__read .bp__label')].map((l) => l.textContent!.trim());
const scope = (el: HTMLElement) => el.querySelector('.cbw__week-scope')!.textContent!.replace(/⁠/g, '').trim();

describe('BibleBlockComponent (Citirea Bibliei)', () => {
  beforeEach(() => {
    localStorage.removeItem('elim.bible.version');
    localStorage.removeItem('elim.bible.read');
  });
  afterEach(() => TestBed.resetTestingModule());

  it('en la web: hoy elegido y su lectura, capítulo a capítulo', () => {
    const { el } = render(false);
    expect(picks(el).length).toBe(7);
    expect(el.querySelector('.cbw__day.is-selected')?.classList).toContain('is-today');
    expect(el.querySelector('.cbw__read .bp__head')!.textContent).toContain('bible.read.today');
    expect(rowLabels(el)).toEqual(['Ezechiel 40', 'Ezechiel 41']);
    expect(el.querySelector('.cbw__read .bp__open')!.getAttribute('href')).toBe('https://www.bible.com/bible/191/EZK.40.VDC');
  });

  it('elegir otro día cambia la lectura', () => {
    const { fixture, el } = render(false);
    picks(el)[0].click();
    fixture.detectChanges();
    expect(picks(el)[0].getAttribute('aria-pressed')).toBe('true');
    expect(rowLabels(el)).toEqual(['Ezechiel 32', 'Ezechiel 33']);
  });

  it('‹ › mueve de semana en el mismo día; «Azi» vuelve', () => {
    const { fixture, el } = render(false);
    const [prev, next] = [...el.querySelectorAll<HTMLButtonElement>('.cbw__nav .cbw__arrow')];
    next.click();
    fixture.detectChanges();
    expect(scope(el)).toBe('Ezechiel 46–48, Daniel 1–11');
    expect(rowLabels(el)).toEqual(['Daniel 6', 'Daniel 7']); // viernes de la semana 99
    prev.click();
    prev.click();
    fixture.detectChanges();
    expect(scope(el)).toBe('Ezechiel 18–31');
    el.querySelector<HTMLButtonElement>('.cbw__tools .cbw__chip')!.click();
    fixture.detectChanges();
    expect(scope(el)).toBe('Ezechiel 32–45');
  });

  it('«Am citit» marca el día: ✓ en la tira, punto en el calendario y la cifra', () => {
    const { fixture, el } = render(false);
    const mark = el.querySelector<HTMLButtonElement>('.cbw__mark')!;
    expect(mark.getAttribute('aria-pressed')).toBe('false');
    mark.click();
    fixture.detectChanges();
    expect(el.querySelector<HTMLButtonElement>('.cbw__mark')!.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('.cbw__day.is-today')?.classList).toContain('is-read');
    expect(el.querySelector('.cbw__cell.is-read')?.getAttribute('data-date')).toBe('2026-11-13');
    expect(JSON.parse(localStorage.getItem('elim.bible.read')!)).toEqual(['2026-11-13']);
  });

  it('el calendario abre cualquier día del plan; los de fuera no se eligen', () => {
    const { fixture, el } = render(false);
    const cell = (iso: string) => el.querySelector<HTMLButtonElement>(`.cbw__cell[data-date="${iso}"]`)!;
    expect(cell('2026-11-13').classList).toContain('is-selected');
    cell('2026-11-03').click();
    fixture.detectChanges();
    expect(scope(el)).toBe('Ezechiel 18–31');
    expect(rowLabels(el)).toEqual(['Ezechiel 20', 'Ezechiel 21']);
  });

  it('?zi=AAAA-MM-DD abre ese día', () => {
    const { el } = render(false, '2026-12-01');
    expect(el.querySelector('.cbw__day.is-selected')).not.toBeNull();
    expect(el.querySelector('.cbw__read .bp__head')!.textContent).not.toContain('bible.read.today');
  });

  it('en la proyección no cambia nada: ni la web ni botones', () => {
    const { el } = render(true);
    expect(el.querySelector('app-bible-web')).toBeNull();
    expect(el.querySelectorAll('.bible__day').length).toBe(7);
  });
});
