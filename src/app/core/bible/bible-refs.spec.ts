import {
  androidIntentUrl,
  bibleAudioUrl,
  bibleUrl,
  formatReading,
  groupRefs,
  parseReading,
  parseRef,
  parseRomanianPassage,
  refLabel,
} from './bible-refs';
import { BIBLE_READING_PLAN } from '../bible-reading.config';

describe('Referencias bíblicas', () => {
  it('lee una referencia con y sin versículos', () => {
    expect(parseRef('JAS.1')).toEqual({ code: 'JAS.1', book: 'JAS', chapter: 1 });
    expect(parseRef('PRO.26.17-21')).toEqual({ code: 'PRO.26.17-21', book: 'PRO', chapter: 26, from: 17, to: 21 });
    expect(parseRef('PRO.26.5')).toEqual({ code: 'PRO.26.5', book: 'PRO', chapter: 26, from: 5, to: 5 });
  });

  it('agrupa capítulos seguidos del mismo libro y escribe cada idioma', () => {
    const refs = parseReading('PSA.124;PSA.125;PRO.26.17-21');
    expect(formatReading(refs, 'ro')).toBe('Psalmii 124, 125; Proverbe 26:17–21');
    expect(formatReading(refs, 'es')).toBe('Salmos 124, 125; Proverbios 26:17–21');
    expect(groupRefs(refs, 'ro').map((g) => g.refs.length)).toEqual([2, 1]);
  });

  it('un solo salmo va en singular y un libro de un capítulo sin número', () => {
    expect(formatReading(parseReading('PSA.36;PRO.8.32-36'), 'ro')).toBe('Psalmul 36; Proverbe 8:32–36');
    expect(refLabel(parseRef('PSA.36'), 'es')).toBe('Salmo 36');
    expect(formatReading(parseReading('PHM.1'), 'ro')).toBe('Filimon');
    expect(formatReading(parseReading('JUD.1'), 'es')).toBe('Judas');
    expect(formatReading(parseReading('ACT.13'), 'ro')).toBe('Faptele apostolilor 13');
  });

  it('enlaza a bible.com en Cornilescu o en Reina-Valera 1960', () => {
    expect(bibleUrl(parseRef('JAS.1'), 'ro')).toBe('https://www.bible.com/bible/191/JAS.1.VDC');
    expect(bibleUrl(parseRef('PRO.26.17-21'), 'es')).toBe('https://www.bible.com/bible/149/PRO.26.17-21.RVR1960');
  });

  it('el audio del pasaje y el intent de Android que abre la app o vuelve aquí', () => {
    expect(bibleAudioUrl(parseRef('JAS.2'), 'ro')).toBe('https://www.bible.com/audio-bible/191/JAS.2.VDC');
    expect(bibleAudioUrl(parseRef('JAS.2'), 'es')).toBe('https://www.bible.com/audio-bible/149/JAS.2.RVR1960');
    expect(
      androidIntentUrl(
        'https://www.bible.com/bible/191/JAS.2.VDC',
        'com.sirma.mobile.bible.android',
        'https://elimarganda.com/impreuna/ziua/316?biblia=lipsa&text=JAS.2',
      ),
    ).toBe(
      'intent://www.bible.com/bible/191/JAS.2.VDC#Intent;scheme=https;package=com.sirma.mobile.bible.android;' +
        'S.browser_fallback_url=https%3A%2F%2Felimarganda.com%2Fimpreuna%2Fziua%2F316%3Fbiblia%3Dlipsa%26text%3DJAS.2;end',
    );
  });

});

describe('Referencias bíblicas · textos en rumano (planes de lectura)', () => {
  const codes = (text: string) => parseRomanianPassage(text).map((r) => r.code);

  it('un tramo de capítulos se abre en un capítulo por referencia', () => {
    expect(codes('Isaia 43-44')).toEqual(['ISA.43', 'ISA.44']);
    expect(codes('Ezechiel 1')).toEqual(['EZK.1']);
    expect(codes('Iona 1–4')).toEqual(['JON.1', 'JON.2', 'JON.3', 'JON.4']);
  });

  it('varios libros, diacríticos de cualquier forma y nombres de varias palabras', () => {
    expect(codes('Plângerile lui Ieremia 5, Ezechiel 1')).toEqual(['LAM.5', 'EZK.1']);
    expect(codes('Ţefania 1-3')).toEqual(['ZEP.1', 'ZEP.2', 'ZEP.3']); // cedilla
    expect(codes('Țefania 1')).toEqual(['ZEP.1']); // coma
    expect(codes('1 Samuel 3-4; Psalmul 23')).toEqual(['1SA.3', '1SA.4', 'PSA.23']);
    expect(codes('Obadia 1')).toEqual(['OBA.1']);
  });

  it('versículos sueltos y el texto ya compuesto (raya y WORD JOINER)', () => {
    expect(codes('Proverbe 26:22-28')).toEqual(['PRO.26.22-28']);
    expect(codes('Isaia 5–⁠6')).toEqual(['ISA.5', 'ISA.6']);
  });

  it('lo que no reconoce lo descarta, sin inventar', () => {
    expect(codes('Septembrie 2026')).toEqual([]);
    expect(codes('Libro inventado 3')).toEqual([]);
    expect(codes('')).toEqual([]);
  });

  it('todas las lecturas del plan de la iglesia se entienden', () => {
    const texts = BIBLE_READING_PLAN.months.flatMap((m) =>
      m.weeks.flatMap((w) => [w.summary, ...w.readings, ...(w.newTestament ?? [])]),
    );
    const unread = texts.flatMap((t) => t.split(/[,;]/)).filter((part) => parseRomanianPassage(part).length === 0);
    expect(unread).toEqual([]);
  });
});
