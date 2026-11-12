import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { PresentationService } from '../../../../core/presentation.service';
import { ClockService } from '../../../../core/services/clock.service';
import { BibleBlockComponent } from './bible-block.component';

/** Jueves 12/11/2026: semana 98 del plan (Ezechiel 32–45), hoy «Ezechiel 38-39». */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 12, 10).getTime());
  readonly pageVisible = signal(true);
}

function render(fullscreen: boolean): { fixture: ComponentFixture<BibleBlockComponent>; el: HTMLElement } {
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
  TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } });
  const fixture = TestBed.createComponent(BibleBlockComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const picks = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.bible__day-pick')];
const rowLabels = (el: HTMLElement) => [...el.querySelectorAll('.bible__read .bp__label')].map((l) => l.textContent!.trim());

describe('BibleBlockComponent (Citirea Bibliei)', () => {
  beforeEach(() => localStorage.removeItem('elim.bible.version'));
  afterEach(() => TestBed.resetTestingModule());

  it('en la web: hoy elegido y su lectura debajo, capítulo a capítulo', () => {
    const { el } = render(false);
    expect(picks(el).length).toBe(7);
    expect(el.querySelector('.bible__day.is-selected')?.classList).toContain('is-today');
    const head = el.querySelector('.bible__read .bp__head')!.textContent!;
    expect(head).toContain('bible.read.today');
    expect(head).toContain('Ezechiel 38');
    expect(rowLabels(el)).toEqual(['Ezechiel 38', 'Ezechiel 39']);
    expect(el.querySelector('.bible__read .bp__open')!.getAttribute('href')).toBe('https://www.bible.com/bible/191/EZK.38.VDC');
    expect(el.querySelector('.bible__read .bp__listen')!.getAttribute('href')).toBe(
      'https://www.bible.com/audio-bible/191/EZK.38.VDC',
    );
  });

  it('elegir otro día cambia la lectura (y lo dice con su fecha)', () => {
    const { fixture, el } = render(false);
    const monday = picks(el)[0];
    monday.click();
    fixture.detectChanges();
    expect(monday.getAttribute('aria-pressed')).toBe('true');
    expect(rowLabels(el)).toEqual(['Ezechiel 32', 'Ezechiel 33']);
    expect(el.querySelector('.bible__read .bp__head')!.textContent).not.toContain('bible.read.today');
  });

  it('enlaza la lectura de hoy del otro plan de la web (Proiectul Împreună)', () => {
    const { el } = render(false);
    const link = el.querySelector<HTMLAnchorElement>('.bible__read-link')!;
    expect(link.getAttribute('href')).toBe('/impreuna');
    expect(link.textContent).toContain('bible.read.impreuna');
  });

  it('en la proyección no cambia nada: ni botones ni tarjeta de lectura', () => {
    const { el } = render(true);
    expect(picks(el).length).toBe(0);
    expect(el.querySelector('.bible__read')).toBeNull();
    expect(el.querySelectorAll('.bible__day').length).toBe(7);
  });
});
