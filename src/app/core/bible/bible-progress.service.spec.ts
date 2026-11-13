import { planStreak } from './bible-progress.service';

describe('planStreak (racha del plan de la iglesia)', () => {
  const due = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];

  it('cuenta los días seguidos hasta hoy', () => {
    expect(planStreak(due, new Set(['2026-11-11', '2026-11-12', '2026-11-13']), '2026-11-13')).toBe(3);
  });

  it('hoy sin marcar aún no la rompe: cuenta hasta ayer', () => {
    expect(planStreak(due, new Set(['2026-11-11', '2026-11-12']), '2026-11-13')).toBe(2);
  });

  it('un hueco la corta', () => {
    expect(planStreak(due, new Set(['2026-11-09', '2026-11-12']), '2026-11-13')).toBe(1);
    expect(planStreak(due, new Set(), '2026-11-13')).toBe(0);
  });
});
