import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG, UpcomingEvent, WeeklyProgram } from '../church.config';
import { fakeClock } from '../testing/fake-clock';
import { ScheduleService } from './schedule.service';

const event = (id: string, date: string, time = '18:00'): UpcomingEvent =>
  ({ id, date, time, title: id, description: '' }) as UpcomingEvent;

const service = (id: string, day: number, time: string): WeeklyProgram =>
  ({ id, day, dayLabel: id, time, title: id, description: '' }) as WeeklyProgram;

/** Programa de prueba: domingo doble, jueves por la tarde. Sin reglas mensuales. */
const WEEKLY: readonly WeeklyProgram[] = [service('duminica', 0, '10:00 & 18:00'), service('joi', 4, '20:30')];

const EVENTS: readonly UpcomingEvent[] = [
  event('pasado', '2026-11-08'),
  event('hoy-tarde', '2026-11-16', '20:00'),
  event('hoy-manana', '2026-11-16', '10:00'),
  event('futuro', '2026-12-06'),
  event('proximo', '2026-11-22'),
];

function setup(now: string, events: readonly UpcomingEvent[] = EVENTS) {
  const clock = fakeClock(now);
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      clock.provider,
      {
        provide: CHURCH_CONFIG,
        useValue: { ...DEFAULT_CHURCH_CONFIG, weeklyProgram: WEEKLY, upcomingEvents: events },
      },
    ],
  });
  return { schedule: TestBed.inject(ScheduleService), clock };
}

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);
/** Sólo los cargados a mano: las reglas mensuales generan los suyos. */
const manual = (list: readonly { id: string; auto?: boolean }[]) => ids(list.filter((item) => !item.auto));

describe('ScheduleService · eventos', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('los próximos descartan los pasados y van por día y, el mismo día, por hora', () => {
    const { schedule } = setup('2026-11-16T09:00:00');
    expect(manual(schedule.upcomingEvents())).toEqual(['hoy-manana', 'hoy-tarde', 'proximo', 'futuro']);
    expect(schedule.hasUpcomingEvents()).toBe(true);
  });

  it('el evento de hoy sigue saliendo todo el día (aunque ya haya pasado su hora)', () => {
    const { schedule } = setup('2026-11-16T23:30:00');
    const today = schedule.upcomingEvents().filter((ev) => ev.isToday);
    expect(ids(today)).toEqual(['hoy-manana', 'hoy-tarde']);
    expect(today.every((ev) => ev.daysLeft === 0)).toBe(true);
  });

  it('al cambiar de día el evento pasa al histórico sin recargar', () => {
    const { schedule, clock } = setup('2026-11-16T23:30:00');
    expect(manual(schedule.pastEvents())).toEqual(['pasado']);
    clock.set('2026-11-17T00:10:00');
    expect(manual(schedule.upcomingEvents())).toEqual(['proximo', 'futuro']);
    // Histórico: del más reciente al más antiguo.
    expect(manual(schedule.pastEvents())).toEqual(['hoy-manana', 'hoy-tarde', 'pasado']);
  });

  it('sin eventos por delante, hasUpcomingEvents es false (el bloque sale de la proyección)', () => {
    const { schedule } = setup('2026-11-16T09:00:00', [event('viejo', '2026-01-01')]);
    expect(schedule.hasUpcomingEvents()).toBe(false);
    expect(schedule.upcomingEvents()).toEqual([]);
  });

  it('daysLeft cuenta días de calendario, no bloques de 24 horas', () => {
    const { schedule } = setup('2026-11-21T23:59:00');
    const proximo = schedule.upcomingEvents().find((ev) => ev.id === 'proximo');
    expect(proximo?.daysLeft).toBe(1);
  });

  it('eventsByDate agrupa por fecha, pasados incluidos, ordenados por hora', () => {
    const { schedule } = setup('2026-11-18T09:00:00');
    expect(ids(schedule.eventsByDate().get('2026-11-16') ?? [])).toEqual(['hoy-manana', 'hoy-tarde']);
    expect(ids(schedule.eventsByDate().get('2026-11-08') ?? [])).toEqual(['pasado']);
  });
});

describe('ScheduleService · programa y ventana de culto', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('currentWeekDay sigue al reloj', () => {
    const { schedule, clock } = setup('2026-11-15T10:00:00'); // domingo
    expect(schedule.currentWeekDay()).toBe(0);
    clock.set('2026-11-19T10:00:00'); // jueves
    expect(schedule.currentWeekDay()).toBe(4);
  });

  it('todayProgram es el culto del día, o null si hoy no hay', () => {
    const { schedule, clock } = setup('2026-11-19T10:00:00'); // jueves
    expect(schedule.todayProgram()?.id).toBe('joi');
    clock.set('2026-11-17T10:00:00'); // martes
    expect(schedule.todayProgram()).toBeNull();
  });

  // La llamada con cuota a YouTube sólo se hace dentro de esta ventana: de un
  // poco antes de cada comienzo a un par de horas después.
  it.each([
    ['2026-11-15T09:46:00', true, 'domingo, justo antes del culto de las 10'],
    ['2026-11-15T11:30:00', true, 'domingo, durante el culto'],
    ['2026-11-15T03:00:00', false, 'domingo de madrugada'],
    ['2026-11-15T18:10:00', true, 'domingo, culto de la tarde'],
    ['2026-11-19T20:20:00', true, 'jueves, antes de las 20:30'],
    ['2026-11-17T20:30:00', false, 'martes: no hay culto'],
  ])('%s → %s (%s)', (now, expected) => {
    const { schedule } = setup(now, []);
    expect(schedule.enVentanaDeCulto()).toBe(expected);
  });
});
