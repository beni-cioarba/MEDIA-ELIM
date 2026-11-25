import {
  DELAY_MS,
  InviteMemory,
  REST_DISMISSED,
  REST_GUIDED,
  REST_NEVER,
  REST_SEEN,
  REST_TIP,
  dismissed,
  guided,
  inviteKind,
  never,
  newMemory,
  offersNever,
  parseMemory,
  shown,
  visited,
  waitMs,
} from './invite-policy';

const DAY = 86_400_000;
const START = Date.parse('2026-11-24T12:00:00Z');
const day = (n: number) => new Date(START + n * DAY).toISOString().slice(0, 10);
const ctx = (n: number, installed = false) => ({ now: START + n * DAY, today: day(n), installed });
const FIRST = newMemory(day(0));

/** Entra cada `every` días durante un año; devuelve en qué días sale cada aviso. */
function simulate(every: number, react: (m: InviteMemory, now: number) => InviteMemory): string[] {
  const out: string[] = [];
  let memory = FIRST;
  for (let n = 0; n <= 365; n += every) {
    memory = visited(memory, day(n));
    const kind = inviteKind(memory, ctx(n));
    if (!kind) continue;
    out.push(`${n}:${kind}`);
    memory = react(shown(memory, kind, ctx(n)), ctx(n).now);
  }
  return out;
}

describe('bienvenida', () => {
  it('la primera vez, a los 8 segundos', () => {
    expect(inviteKind(FIRST, ctx(0))).toBe('welcome');
    expect(waitMs(FIRST, { ...ctx(0), elapsedMs: 2_000 })).toBe(DELAY_MS.welcome - 2_000);
    expect(waitMs(FIRST, { ...ctx(0), elapsedMs: 60_000 })).toBe(0);
  });

  it('una sola vez, y nada más ese día', () => {
    const after = shown(FIRST, 'welcome', ctx(0));
    expect(inviteKind(after, ctx(0))).toBeNull();
    expect(waitMs(after, { ...ctx(0), elapsedMs: 60_000 })).toBeNull();
    expect(inviteKind(visited(after, day(400)), ctx(400))).toBe('reminder');
  });
});

describe('recordatorios', () => {
  it('sólo a quien vuelve otro día, aunque pase el tiempo', () => {
    const after = shown(FIRST, 'welcome', ctx(0));
    expect(inviteKind(after, ctx(REST_SEEN[0]))).toBeNull();
    expect(inviteKind(visited(after, day(REST_SEEN[0] - 1)), ctx(REST_SEEN[0] - 1))).toBeNull();
    expect(inviteKind(visited(after, day(REST_SEEN[0])), ctx(REST_SEEN[0]))).toBe('reminder');
  });

  it('si los deja pasar, cada vez más espaciados', () => {
    expect(simulate(1, (m) => m)).toEqual([
      '0:welcome', '3:reminder', '10:reminder', '24:reminder', '54:reminder',
      '114:reminder', '174:reminder', '234:reminder', '294:reminder', '354:reminder',
    ]);
  });

  it('«ahora no» descansa más y pide volver dos días', () => {
    expect(simulate(1, dismissed)).toEqual(['0:welcome', '14:reminder', '44:reminder', '104:reminder', '194:reminder', '284:reminder']);
    const after = dismissed(shown(FIRST, 'welcome', ctx(0)), START);
    const back = visited(after, day(REST_DISMISSED[0]));
    expect(inviteKind(back, ctx(REST_DISMISSED[0]))).toBeNull();
    expect(inviteKind(visited(back, day(20)), ctx(20))).toBe('reminder');
  });

  it('tras ver los pasos, a la semana', () => {
    const after = guided(shown(FIRST, 'welcome', ctx(0)), START);
    const back = visited(after, day(REST_GUIDED));
    expect(inviteKind(back, ctx(REST_GUIDED))).toBe('reminder');
  });

  it('a la tercera se puede pedir que no salga más: un año', () => {
    let memory = shown(FIRST, 'welcome', ctx(0));
    expect(offersNever(memory)).toBe(false);
    memory = dismissed(dismissed(memory, START), START);
    expect(offersNever(memory)).toBe(true);
    memory = never(memory, START);
    const back = visited(visited(memory, day(1)), day(2));
    expect(inviteKind(back, ctx(REST_NEVER - 1))).toBeNull();
    expect(inviteKind(back, ctx(REST_NEVER))).toBe('reminder');
  });
});

describe('quien ya la tiene y entra por el navegador', () => {
  it('nunca la invitación; «ábrela desde el icono», de tarde en tarde', () => {
    expect(inviteKind(FIRST, ctx(0, true))).toBeNull();
    const back = visited(FIRST, day(1));
    expect(inviteKind(back, ctx(1, true))).toBe('open');
    const tip = shown(back, 'open', ctx(1, true));
    expect(inviteKind(visited(tip, day(2)), ctx(2, true))).toBeNull();
    expect(inviteKind(visited(tip, day(1 + REST_TIP)), ctx(1 + REST_TIP, true))).toBe('open');
  });
});

describe('visited', () => {
  it('cuenta días, no páginas', () => {
    expect(visited(FIRST, day(0))).toBe(FIRST);
    expect(visited(FIRST, day(1)).visits).toBe(2);
  });
});

describe('parseMemory', () => {
  it('lee lo guardado y descarta lo que no tiene sentido', () => {
    const memory = visited(shown(FIRST, 'welcome', ctx(0)), day(1));
    expect(parseMemory(JSON.stringify(memory), day(1))).toEqual(memory);
    expect(parseMemory(null, day(0))).toEqual(FIRST);
    expect(parseMemory('{', day(0))).toEqual(FIRST);
    expect(parseMemory('null', day(0))).toEqual(FIRST);
    expect(parseMemory('{"since":"2026-01-01","dismissals":"x","snoozedUntil":-1}', day(0))).toEqual(newMemory('2026-01-01'));
  });

  it('respeta el formato anterior: lo rechazado sigue rechazado y no hay otra bienvenida', () => {
    const old = JSON.stringify({ since: day(-9), shownOn: day(-1), ignored: 0, dismissals: 1, snoozedUntil: START + 29 * DAY });
    const memory = visited(parseMemory(old, day(0)), day(0));
    expect(inviteKind(memory, ctx(0))).toBeNull();
    expect(inviteKind(memory, ctx(30))).toBe('reminder');
  });
});
