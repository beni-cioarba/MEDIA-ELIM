import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FAMILY_PRAYER_WEEKS } from '../family-prayer.config';
import { fakeClock } from '../testing/fake-clock';
import { addDays, parseIsoDate, toIsoDate } from '../util/iso-date';
import { FamilyPrayerService } from './family-prayer.service';

/**
 * Se prueba contra los **datos reales** (`FAMILY_PRAYER_WEEKS` no es
 * inyectable): las fechas del test se calculan a partir de ellos, así que
 * cargar una semana nueva no rompe nada.
 */
const weeks = [...FAMILY_PRAYER_WEEKS].sort((a, b) => a.presentedOn.localeCompare(b.presentedOn));
const first = weeks[0];
const second = weeks[1];
const at = (isoDate: string, offsetDays: number, time = '12:00:00') =>
  `${toIsoDate(addDays(parseIsoDate(isoDate), offsetDays))}T${time}`;

function setup(now: string) {
  const clock = fakeClock(now);
  TestBed.configureTestingModule({ providers: [provideTranslateService(), clock.provider] });
  return { prayer: TestBed.inject(FamilyPrayerService), clock };
}

describe('FamilyPrayerService (semana que toca)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('hay datos con los que probar', () => {
    expect(weeks.length).toBeGreaterThan(1);
  });

  it('antes de la primera semana no se anuncia ninguna', () => {
    const { prayer } = setup(at(first.presentedOn, -10));
    expect(prayer.current()).toBeNull();
    expect(prayer.hasCurrent()).toBe(false);
    expect(prayer.past()).toEqual([]);
  });

  it('el domingo de presentación ya se anuncia esa semana', () => {
    const { prayer } = setup(at(first.presentedOn, 0, '08:00:00'));
    expect(prayer.current()?.presentedOn).toBe(first.presentedOn);
  });

  it('entre semana se sigue anunciando la del domingo anterior', () => {
    const { prayer } = setup(at(first.presentedOn, 3));
    expect(prayer.current()?.presentedOn).toBe(first.presentedOn);
    expect(prayer.current()?.status).toBe('current');
  });

  it('al llegar el domingo siguiente cambia sola, y la anterior pasa al archivo', () => {
    const { prayer, clock } = setup(at(first.presentedOn, 3));
    clock.set(at(second.presentedOn, 0, '00:05:00'));
    expect(prayer.current()?.presentedOn).toBe(second.presentedOn);
    expect(prayer.past().map((w) => w.presentedOn)).toEqual([first.presentedOn]);
  });

  it('las semanas cargadas por adelantado no se publican: están en upcoming', () => {
    const { prayer } = setup(at(first.presentedOn, 0));
    const upcoming = prayer.upcoming().map((w) => w.presentedOn);
    expect(upcoming).toContain(second.presentedOn);
    expect(prayer.next()?.presentedOn).toBe(second.presentedOn);
    // La web pública no adelanta semanas; las herramientas sí pueden pedirla.
    expect(prayer.byDate(second.presentedOn)).toBeNull();
    expect(prayer.anyByDate(second.presentedOn)?.presentedOn).toBe(second.presentedOn);
  });

  it('el archivo va de la más reciente a la más antigua', () => {
    const last = weeks[weeks.length - 1];
    const { prayer } = setup(at(last.presentedOn, 2));
    const past = prayer.past().map((w) => w.presentedOn);
    expect(past).toEqual([...past].sort().reverse());
    expect(past).not.toContain(last.presentedOn);
    expect(past.length).toBe(weeks.length - 1);
  });

  it('cada familia de la semana tiene identificador y nombre para mostrar', () => {
    const { prayer } = setup(at(first.presentedOn, 1));
    const families = prayer.current()?.families ?? [];
    expect(families.length).toBeGreaterThan(0);
    for (const family of families) {
      expect(family.id).toBeTruthy();
      expect(family.fullName.length).toBeGreaterThan(0);
    }
  });

  it('una fecha que no es de ninguna semana no devuelve nada', () => {
    const { prayer } = setup(at(first.presentedOn, 1));
    expect(prayer.anyByDate('1999-01-03')).toBeNull();
    expect(prayer.anyByDate(null)).toBeNull();
  });
});
