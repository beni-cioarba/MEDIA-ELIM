import { SearchIndex, groupHits } from './search-engine';
import { excerpt, fold, highlight, highlightTerms, queryTerms, stem, withinEdits } from './search-text';
import { SearchEntry } from './search.model';

function entry(partial: Partial<SearchEntry> & Pick<SearchEntry, 'id' | 'title'>): SearchEntry {
  return { kind: 'page', path: `/${partial.id}`, icon: 'home', ...partial };
}

const ENTRIES: readonly SearchEntry[] = [
  entry({ id: 'botezuri', title: 'Botezuri', keywords: 'bautismos candidatos', boost: 1.35 }),
  entry({ id: 'familii', title: 'Rugăciune pentru familii', keywords: ['oración', 'familias'], boost: 1.35 }),
  entry({ id: 'tomoiaga', title: 'Grigore Tomoiagă', kind: 'people', context: 'Pastor asistent' }),
  entry({ id: 'pastor', title: 'Pavel Negrușier', kind: 'people', context: 'Pastor', boost: 1.3 }),
  entry({ id: 'cor', title: 'Cor', keywords: 'coro', boost: 1.35 }),
  entry({ id: 'botez-apa', title: 'Botezul în apă', kind: 'belief', body: 'Se face prin scufundare, în numele Tatălui.' }),
  entry({ id: 'evanghelizare', title: 'Evanghelizare', kind: 'event', body: 'Program special în oraș, cu corul bisericii.' }),
  entry({ id: 'parcare', title: 'Am unde parca?', kind: 'help', keywords: 'aparcamiento parking' }),
];

const index = new SearchIndex(ENTRIES);
const ids = (query: string): string[] => index.search(query).hits.map((hit) => hit.entry.id);

describe('Texto del buscador', () => {
  it('pliega los diacríticos rumanos (coma y sedila) y españoles', () => {
    expect(fold('ȘȚĂÎÂ şţ')).toBe('staia st');
    expect(fold('Oración, niño')).toBe('oracion, nino');
  });

  it('quita palabras vacías, pero no la que se está escribiendo', () => {
    expect(queryTerms('unde este biserica').map((t) => t.text)).toEqual(['biserica']);
    expect(queryTerms('horario de la').map((t) => t.text)).toEqual(['horario', 'la']);
    expect(queryTerms('horario de la ').map((t) => t.text)).toEqual(['horario']);
    // Todo palabras vacías: se buscan igual.
    expect(queryTerms('de la ').map((t) => t.text)).toEqual(['de', 'la']);
  });

  it('da la misma raíz a singular, plural y artículo', () => {
    expect(stem('botezuri')).toBe(stem('botezul'));
    expect(stem('familii')).toBe(stem('familie'));
    expect(stem('familias')).toBe(stem('familia'));
    expect(stem('cor')).toBe('cor');
  });

  it('cuenta erratas, también letras bailadas', () => {
    expect(withinEdits('evanghelizare', 'evanhgelizare', 1)).toBe(true);
    expect(withinEdits('tineret', 'tinerte', 1)).toBe(true);
    expect(withinEdits('cor', 'conducere', 2)).toBe(false);
  });

  it('resalta sobre el texto original, con sus diacríticos', () => {
    expect(highlight('Tomoiagă', 'iaga')).toEqual([
      { text: 'Tomo', hit: false },
      { text: 'iagă', hit: true },
    ]);
    expect(highlightTerms('Rugăciune pentru familii', ['ruga', 'famil'])).toEqual([
      { text: 'Rugă', hit: true },
      { text: 'ciune pentru ', hit: false },
      { text: 'famil', hit: true },
      { text: 'ii', hit: false },
    ]);
    // Sólo a principio de palabra.
    expect(highlightTerms('Panou', ['a']).some((s) => s.hit)).toBe(false);
  });

  it('el extracto rodea la coincidencia sin partir palabras', () => {
    const body = `${'cuvânt '.repeat(40)}scufundare ${'cuvânt '.repeat(40)}`;
    const text = excerpt(body, ['scufundare'], 60)!;
    expect(text).toContain('scufundare');
    expect(text.startsWith('… cuvânt')).toBe(true);
    expect(text.endsWith('cuvânt …')).toBe(true);
    expect(excerpt('nada', ['scufundare'])).toBeNull();
  });
});

describe('Motor del buscador', () => {
  it('encuentra con y sin diacríticos, en mayúsculas y por prefijo', () => {
    expect(ids('tomoiaga')).toEqual(['tomoiaga']);
    expect(ids('TOMOIAGĂ')).toEqual(['tomoiaga']);
    expect(ids('tomoi')).toEqual(['tomoiaga']);
    expect(ids('rugaciune')[0]).toBe('familii');
  });

  it('encuentra en el otro idioma por los sinónimos', () => {
    expect(ids('bautismos')[0]).toBe('botezuri');
    expect(ids('oracion')[0]).toBe('familii');
    expect(ids('aparcamiento')).toEqual(['parcare']);
  });

  it('el título manda sobre el contexto y el texto; la página, sobre la pieza', () => {
    expect(ids('cor')[0]).toBe('cor');
    expect(ids('botez')[0]).toBe('botezuri');
    expect(ids('pastor')[0]).toBe('pastor');
  });

  it('singular y plural encuentran lo mismo', () => {
    expect(ids('botezuri')).toContain('botez-apa');
    expect(ids('familia')).toContain('familii');
  });

  it('tienen que estar todas las palabras; si no hay, las más cercanas y lo dice', () => {
    expect(ids('pastor tomoiaga')).toEqual(['tomoiaga']);
    const result = index.search('pastor inexistente');
    expect(result.partial).toBe(true);
    expect(result.hits.length).toBeGreaterThan(0);
  });

  it('perdona erratas sólo cuando no hay nada mejor, y nunca en palabras cortas', () => {
    expect(ids('evanhgelizare')).toEqual(['evanghelizare']);
    expect(ids('tomoiagga')).toEqual(['tomoiaga']);
    expect(ids('cot')).toEqual([]);
  });

  it('enseña el trozo del texto que coincide si el título no lo explica', () => {
    const [hit] = index.search('scufundare').hits;
    expect(hit.entry.id).toBe('botez-apa');
    expect(hit.excerpt).toContain('scufundare');
    expect(index.search('tomoiaga').hits[0].excerpt).toBeNull();
  });

  it('sin nada que buscar no hay resultados', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('¿?')).toEqual([]);
    expect(ids('zzzzz')).toEqual([]);
  });

  it('agrupa por tipo en el orden del mejor resultado', () => {
    const groups = groupHits(index.search('botez').hits);
    expect(groups.map((g) => g.kind)).toEqual(['page', 'belief']);
  });

  it('aguanta miles de entradas sin notarse', () => {
    const many = new SearchIndex(
      Array.from({ length: 5_000 }, (_, i) => entry({ id: String(i), title: `Predica ${i} despre har`, body: `text ${i % 97}` })),
    );
    const start = performance.now();
    many.search('predica 4321');
    expect(performance.now() - start).toBeLessThan(250);
  });
});
