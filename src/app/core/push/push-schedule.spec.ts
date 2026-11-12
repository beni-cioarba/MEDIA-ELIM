import { addDays, dayOfYear, nextDaily, zonedDate, zonedInstant } from './push-schedule';

const MADRID = 'Europe/Madrid';
const utc = (iso: string): number => Date.parse(iso);

describe('push-schedule (hora de envío en España)', () => {
  it('las 08:00 de Madrid son las 07:00 UTC en invierno y las 06:00 en verano', () => {
    expect(new Date(zonedInstant('2026-11-13', 8, MADRID)).toISOString()).toBe('2026-11-13T07:00:00.000Z');
    expect(new Date(zonedInstant('2026-07-01', 8, MADRID)).toISOString()).toBe('2026-07-01T06:00:00.000Z');
  });

  it('acierta los días de cambio de hora (29/03 y 25/10 de 2026)', () => {
    expect(new Date(zonedInstant('2026-03-29', 8, MADRID)).toISOString()).toBe('2026-03-29T06:00:00.000Z');
    expect(new Date(zonedInstant('2026-03-28', 8, MADRID)).toISOString()).toBe('2026-03-28T07:00:00.000Z');
    expect(new Date(zonedInstant('2026-10-25', 8, MADRID)).toISOString()).toBe('2026-10-25T07:00:00.000Z');
    expect(new Date(zonedInstant('2026-10-24', 8, MADRID)).toISOString()).toBe('2026-10-24T06:00:00.000Z');
  });

  it('la fecha del calendario depende de la zona: a las 23:30 UTC en Madrid ya es mañana', () => {
    expect(zonedDate(utc('2026-11-12T23:30:00Z'), MADRID)).toBe('2026-11-13');
    expect(zonedDate(utc('2026-11-12T22:30:00Z'), MADRID)).toBe('2026-11-12');
    expect(zonedDate(utc('2026-11-12T22:30:00Z'), 'Europe/Bucharest')).toBe('2026-11-13');
  });

  it('próximo envío: hoy si aún no son las 8; si no, mañana', () => {
    expect(nextDaily(utc('2026-11-13T06:59:00Z'), 8, MADRID)).toEqual({
      date: '2026-11-13',
      at: utc('2026-11-13T07:00:00Z'),
    });
    expect(nextDaily(utc('2026-11-13T07:00:00Z'), 8, MADRID)).toEqual({
      date: '2026-11-14',
      at: utc('2026-11-14T07:00:00Z'),
    });
    // Último día del año → 1 de enero (fuera de la edición; la tarjeta lo trata).
    expect(nextDaily(utc('2026-12-31T09:00:00Z'), 8, MADRID).date).toBe('2027-01-01');
  });

  it('días del año y fechas sin horas', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
    expect(dayOfYear('2026-11-13')).toBe(317);
    expect(dayOfYear('2026-12-31')).toBe(365);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
