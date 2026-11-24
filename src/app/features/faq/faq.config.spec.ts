import { DEFAULT_CHURCH_CONFIG } from '../../core/church.config';
import { FAQ_GROUPS, FAQ_INDEX, HOME_FAQ } from '../../core/faq.config';
import { GUEST_FAQ } from '../../core/guests.config';
import { APP_ROUTES } from '../../app.routes';
import es from '../../../assets/i18n/faq.es.json';
import ro from '../../../assets/i18n/faq.ro.json';
import { splitColumns } from './faq.view';

type Pack = { readonly faq: Record<string, unknown> };

function lookup(pack: Pack, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      pack.faq,
    );
}

const items = FAQ_GROUPS.flatMap((group) => group.items);

describe('Preguntas frecuentes · datos', () => {
  it('ids únicos, también frente a las anclas de los temas', () => {
    const ids = [...items.map((i) => i.id), ...FAQ_GROUPS.map((g) => `g-${g.id}`)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada pregunta, tema y acción tiene su texto en los dos idiomas', () => {
    for (const pack of [ro, es] as unknown as Pack[]) {
      for (const group of FAQ_GROUPS) expect(lookup(pack, `groups.${group.id}`), group.id).toBeTruthy();
      for (const item of items) {
        for (const field of ['q', 'a', 'k']) expect(lookup(pack, `items.${item.id}.${field}`), item.id).toBeTruthy();
        for (const action of item.actions ?? []) {
          const key =
            action.kind === 'whatsapp'
              ? `messages.${action.message}`
              : `actions.${action.kind === 'call' ? 'call' : action.label}`;
          expect(lookup(pack, key), key).toBeTruthy();
        }
      }
    }
  });

  it('no hay textos de preguntas que ya no existen', () => {
    for (const pack of [ro, es]) expect(Object.keys(pack.faq.items).sort()).toEqual([...FAQ_INDEX.keys()].sort());
  });

  it('cada enlace interno lleva a una ruta que existe', () => {
    const shell = APP_ROUTES.find((r) => r.path === '' && r.children)!.children!;
    const patterns = shell
      .filter((r) => r.path !== '**')
      .map((r) => new RegExp(`^/${(r.path ?? '').replace(/:[^/]+/g, '[^/]+')}$`));
    for (const action of items.flatMap((i) => i.actions ?? [])) {
      if (action.kind === 'route') expect(patterns.some((p) => p.test(action.path)), action.path).toBe(true);
    }
  });

  it('la portada e Invitați sólo piden preguntas que existen', () => {
    for (const id of [...HOME_FAQ, ...GUEST_FAQ]) expect(FAQ_INDEX.has(id), id).toBe(true);
  });

  it('«de lunes a viernes, a las…»: los cinco días siguen teniendo la misma hora', () => {
    const times = [1, 2, 3, 4, 5].map((day) => DEFAULT_CHURCH_CONFIG.weeklyProgram.find((p) => p.day === day)?.time);
    expect(new Set(times).size).toBe(1);
    expect(times[0]).toBeTruthy();
  });
});

describe('splitColumns', () => {
  const weight = (n: number): number => n;

  it('parte en dos columnas seguidas y equilibradas', () => {
    expect(splitColumns([7, 5, 4, 4, 5], weight)).toEqual([
      [7, 5],
      [4, 4, 5],
    ]);
  });

  it('con uno o ninguno no parte', () => {
    expect(splitColumns([3], weight)).toEqual([[3]]);
    expect(splitColumns([], weight)).toEqual([]);
  });
});
