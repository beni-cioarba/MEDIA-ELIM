import data from './bible-verses.json';
import { passageVerses, readingMinutes } from './bible-verses';
import { PLAN_DAYS } from '../impreuna/impreuna-edition';
import { parseReading, parseRef } from './bible-refs';

const books = (data as unknown as { books: Record<string, { wpv: number; verses: number[] }> }).books;

describe('Proiectul Împreună · versículos y minutos de lectura', () => {
  it('los datos son la Biblia entera: 66 libros, 1.189 capítulos, 31.102 versículos', () => {
    const all = Object.values(books);
    expect(all.length).toBe(66);
    expect(all.reduce((n, b) => n + b.verses.length, 0)).toBe(1189);
    expect(all.reduce((n, b) => n + b.verses.reduce((a, v) => a + v, 0), 0)).toBe(31102);
    expect(all.every((b) => b.wpv > 5 && b.wpv < 60)).toBe(true);
  });

  it('cuenta capítulos enteros y tramos', () => {
    expect(passageVerses(parseRef('JAS.2'))).toBe(26);
    expect(passageVerses(parseRef('PSA.119'))).toBe(176);
    expect(passageVerses(parseRef('PRO.26.22-28'))).toBe(7);
    expect(passageVerses(parseRef('PRO.26.5'))).toBe(1);
    expect(passageVerses(parseRef('JAS.9'))).toBe(0); // no existe: sin datos, sin cifra
  });

  it('minutos aproximados: redondeados, al menos 1, y la suma de un día con varios textos', () => {
    expect(readingMinutes(parseReading('JAS.2'))).toBe(3);
    expect(readingMinutes(parseReading('PSA.117'))).toBe(1);
    expect(readingMinutes(parseReading('PSA.119'))).toBeGreaterThan(15);
    expect(readingMinutes(parseReading('PSA.126;PSA.127;PRO.26.22-28'))).toBe(2);
    expect(readingMinutes([])).toBe(0);
  });

  it('todos los pasajes de la edición tienen versículos', () => {
    const empty = PLAN_DAYS.flatMap((d) => d.refs).filter((ref) => passageVerses(ref) === 0);
    expect(empty).toEqual([]);
  });
});
