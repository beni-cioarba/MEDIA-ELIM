import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ClockService } from '../../../core/services/clock.service';
import { DayCalendarComponent } from './day-calendar.component';

/** Reloj fijo en el miércoles 11/11/2026 (día 315). */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 11, 10).getTime());
  readonly pageVisible = signal(true);
}

const READ_KEY = 'elim.impreuna.2026.read';

function render(selected: number): { fixture: ComponentFixture<DayCalendarComponent>; el: HTMLElement; picked: number[] } {
  TestBed.configureTestingModule({
    imports: [DayCalendarComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      { provide: ClockService, useClass: FixedClock },
    ],
  });
  const fixture = TestBed.createComponent(DayCalendarComponent);
  fixture.componentRef.setInput('selected', selected);
  const picked: number[] = [];
  fixture.componentInstance.pick.subscribe((day) => picked.push(day));
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, picked };
}

const dayButton = (el: HTMLElement, day: number) => el.querySelector<HTMLButtonElement>(`[data-day="${day}"]`);

function press(fixture: ComponentFixture<DayCalendarComponent>, day: number, key: string): void {
  dayButton(fixture.nativeElement, day)!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
  TestBed.tick();
}

describe('DayCalendarComponent (calendario del plan)', () => {
  beforeEach(() => localStorage.setItem(READ_KEY, '[278]'));
  afterEach(() => {
    localStorage.removeItem(READ_KEY);
    TestBed.resetTestingModule();
  });

  it('enseña el mes del día abierto, con huecos hasta el lunes', () => {
    const { el } = render(279); // martes 6 de octubre
    expect(el.querySelectorAll('.cal__day').length).toBe(31);
    expect(el.querySelectorAll('th').length).toBe(7);
    // El 1 de octubre de 2026 es jueves: tres casillas vacías delante.
    const firstRow = el.querySelector('tbody tr')!;
    expect([...firstRow.querySelectorAll('td')].slice(0, 3).every((td) => !td.querySelector('button'))).toBe(true);
    expect(dayButton(el, 274)!.textContent!.trim()).toBe('1');
  });

  it('distingue día abierto, leído y post și rugăciune', () => {
    const { el } = render(279);
    expect(dayButton(el, 279)!.classList).toContain('is-selected');
    expect(dayButton(el, 279)!.closest('td')!.getAttribute('aria-selected')).toBe('true');
    expect(dayButton(el, 278)!.classList).toContain('is-read');
    expect(dayButton(el, 274)!.classList).toContain('is-fasting'); // jueves 1
    expect(dayButton(el, 281)!.classList).not.toContain('is-fasting'); // jueves 8
    // Una sola casilla tabulable: la del día abierto.
    expect(el.querySelectorAll('.cal__day[tabindex="0"]').length).toBe(1);
    expect(dayButton(el, 279)!.getAttribute('tabindex')).toBe('0');
  });

  it('marca hoy con aria-current y lo dice en su nombre', () => {
    const { el } = render(315);
    const today = dayButton(el, 315)!;
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.classList).toContain('is-today');
    expect(today.getAttribute('aria-label')).toContain('Iacov 1');
  });

  it('la cabecera de días usa tres letras (en rumano «M M» no distinguía martes y miércoles)', () => {
    const { el } = render(279);
    const heads = [...el.querySelectorAll('th span[aria-hidden="true"]')].map((s) => s.textContent!.trim().toLowerCase());
    expect(heads.length).toBe(7);
    expect(new Set(heads).size).toBe(7);
    expect(heads.every((h) => h.length >= 2)).toBe(true);
  });

  it('«Azi» aparece al hojear otro mes y vuelve al de hoy (abriendo hoy)', () => {
    const { fixture, el, picked } = render(315); // hoy, noviembre
    expect(el.querySelector('.cal__today')).toBeNull();
    el.querySelector<HTMLButtonElement>('.cal__nav')!.click(); // ‹ octubre
    fixture.detectChanges();
    const today = el.querySelector<HTMLButtonElement>('.cal__today')!;
    expect(today).not.toBeNull();
    today.click();
    fixture.detectChanges();
    TestBed.tick();
    expect(el.querySelector('.cal__today')).toBeNull();
    expect(dayButton(el, 315)).not.toBeNull();
    // Ya estaba abierto hoy: sólo vuelve el mes, no navega.
    expect(picked).toEqual([]);
  });

  it('desde otro día, «Azi» abre hoy', () => {
    const { el, picked } = render(279); // octubre; hoy es noviembre
    el.querySelector<HTMLButtonElement>('.cal__today')!.click();
    expect(picked).toEqual([315]);
  });

  it('elige un día con el ratón', () => {
    const { el, picked } = render(279);
    dayButton(el, 290)!.click();
    expect(picked).toEqual([290]);
  });

  it('se recorre con el teclado: flechas, Inicio/Fin y cambio de mes', () => {
    const { fixture } = render(279);
    press(fixture, 279, 'ArrowRight');
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 280));
    press(fixture, 280, 'ArrowDown');
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 287));
    press(fixture, 287, 'Home'); // lunes 12 de octubre
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 285));
    press(fixture, 285, 'End'); // domingo 18
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 291));
    // AvPág: mismo número en noviembre (18 → día 322); la rejilla cambia de mes.
    press(fixture, 291, 'PageDown');
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 322));
    expect(fixture.nativeElement.querySelectorAll('.cal__day').length).toBe(30);
  });

  it('no se sale de la edición', () => {
    const { fixture } = render(1);
    press(fixture, 1, 'ArrowLeft');
    expect(document.activeElement).toBe(dayButton(fixture.nativeElement, 1));
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.cal__nav')!.disabled).toBe(true);
  });
});
