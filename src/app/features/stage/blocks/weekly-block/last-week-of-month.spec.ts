import { lastWeekOfMonth } from './weekly-block.component';

/** `YYYY-MM-DD` local. */
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const week = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const { start, end } = lastWeekOfMonth(new Date(y, m - 1, d, 15, 30));
  return `${iso(start)}..${iso(end)}`;
};

describe('lastWeekOfMonth (semana intensiva de fanfara)', () => {
  it('va del lunes al último sábado del mes', () => {
    // Noviembre de 2026: el último sábado es el 28.
    expect(week('2026-11-09')).toBe('2026-11-23..2026-11-28');
  });

  it('el propio sábado sigue siendo esa semana', () => {
    expect(week('2026-11-28')).toBe('2026-11-23..2026-11-28');
    expect(week('2026-11-23')).toBe('2026-11-23..2026-11-28');
  });

  it('pasada la semana, salta a la del mes siguiente', () => {
    // Domingo 29/11 → diciembre: último sábado el 26.
    expect(week('2026-11-29')).toBe('2026-12-21..2026-12-26');
  });

  it('mes que acaba en sábado (octubre de 2026, febrero de 2026)', () => {
    expect(week('2026-10-01')).toBe('2026-10-26..2026-10-31');
    expect(week('2026-02-10')).toBe('2026-02-23..2026-02-28');
  });

  it('cruza de año (diciembre → enero)', () => {
    // 2026-12-27 → enero de 2027: último sábado el 30.
    expect(week('2026-12-27')).toBe('2027-01-25..2027-01-30');
  });
});
