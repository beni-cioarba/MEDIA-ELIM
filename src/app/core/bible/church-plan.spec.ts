import { churchReadingOn } from './church-plan';

describe('churchReadingOn (plan de lectura de la iglesia, para el aviso diario)', () => {
  it('un día de la semana: pasaje con raya, semana y posición', () => {
    expect(churchReadingOn('2026-11-13')).toEqual({
      passage: 'Ezechiel 40–41',
      week: 98,
      summary: 'Ezechiel 32–45',
      day: 5,
      days: 7,
    });
  });

  it('el domingo es el último día de su semana', () => {
    expect(churchReadingOn('2026-11-15')?.day).toBe(7);
    expect(churchReadingOn('2026-11-16')?.week).toBe(99);
  });

  it('fuera del plan, nada', () => {
    expect(churchReadingOn('2027-01-05')).toBeNull();
  });
});
