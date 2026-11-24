import {
  FIRST_VISIT,
  InviteMemory,
  MAX_IGNORED,
  RETURNING,
  dismissed,
  newMemory,
  parseMemory,
  shouldInvite,
  shown,
  waitMs,
} from './invite-policy';

const TODAY = '2026-11-24';
const NOW = Date.parse(`${TODAY}T12:00:00Z`);
const DAY = 86_400_000;
const returning: InviteMemory = { ...newMemory('2026-11-01') };
const ctx = (extra = {}) => ({ now: NOW, today: TODAY, pages: 1, elapsedMs: RETURNING.elapsedMs, ...extra });

describe('shouldInvite', () => {
  it('a quien vuelve otro día, tras un rato', () => {
    expect(shouldInvite(returning, ctx())).toBe(true);
    expect(shouldInvite(returning, ctx({ elapsedMs: RETURNING.elapsedMs - 1 }))).toBe(false);
  });

  it('en la primera visita, sólo si se queda y recorre páginas', () => {
    const first = newMemory(TODAY);
    expect(shouldInvite(first, ctx({ elapsedMs: 600_000 }))).toBe(false);
    expect(shouldInvite(first, ctx({ pages: FIRST_VISIT.pages }))).toBe(false);
    expect(shouldInvite(first, ctx({ pages: FIRST_VISIT.pages, elapsedMs: FIRST_VISIT.elapsedMs }))).toBe(true);
  });

  it('una vez al día', () => {
    const after = shown(returning, { now: NOW, today: TODAY });
    expect(shouldInvite(after, ctx())).toBe(false);
    expect(shouldInvite(after, ctx({ now: NOW + DAY, today: '2026-11-25' }))).toBe(true);
  });
});

describe('dismissed', () => {
  it('descansa 30 días, luego 90 y después un año', () => {
    let memory = returning;
    for (const days of [30, 90, 365, 365]) {
      memory = dismissed(memory, NOW);
      expect(memory.snoozedUntil).toBe(NOW + days * DAY);
      expect(shouldInvite(memory, ctx({ now: NOW + days * DAY - 1, today: '2026-12-31' }))).toBe(false);
    }
  });

  it('verla varias veces sin responder cuenta como «ahora no»', () => {
    let memory = returning;
    for (let i = 0; i < MAX_IGNORED; i++) memory = shown(memory, { now: NOW, today: TODAY });
    expect(memory.dismissals).toBe(1);
    expect(memory.ignored).toBe(0);
    expect(memory.snoozedUntil).toBe(NOW + 30 * DAY);
  });
});

describe('parseMemory', () => {
  it('lee lo guardado y descarta lo que no tiene sentido', () => {
    expect(parseMemory(JSON.stringify(returning), TODAY)).toEqual(returning);
    expect(parseMemory(null, TODAY)).toEqual(newMemory(TODAY));
    expect(parseMemory('{', TODAY)).toEqual(newMemory(TODAY));
    expect(parseMemory('null', TODAY)).toEqual(newMemory(TODAY));
    expect(parseMemory('{"since":"2026-01-01","dismissals":"x","snoozedUntil":-1}', TODAY)).toEqual(
      newMemory('2026-01-01'),
    );
  });
});

describe('waitMs', () => {
  it('lo que falta, nunca negativo', () => {
    expect(waitMs(returning, { today: TODAY, elapsedMs: 2_000 })).toBe(RETURNING.elapsedMs - 2_000);
    expect(waitMs(newMemory(TODAY), { today: TODAY, elapsedMs: 0 })).toBe(FIRST_VISIT.elapsedMs);
    expect(waitMs(returning, { today: TODAY, elapsedMs: 99_999 })).toBe(0);
  });
});
