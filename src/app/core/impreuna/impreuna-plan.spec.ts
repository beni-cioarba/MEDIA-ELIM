import {
  announcedWeek,
  bibleUrl,
  dayKind,
  dayOfEdition,
  daysInYear,
  formatReading,
  groupRefs,
  isFastingDay,
  isoDateOfDay,
  monthGrid,
  monthOfDay,
  monthRange,
  nextFastingDay,
  nextFirstThursday,
  parseReading,
  parseRef,
  parseWpPost,
  parseYoutubeUpload,
  readingStreak,
  refLabel,
  relativeDay,
  weekOf,
  youversionDay,
} from './impreuna-plan';

describe('Proiectul Împreună · lecturas', () => {
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

  it('distingue los días de Nuevo Testamento de los de Psalmi y Proverbe', () => {
    expect(dayKind(parseReading('JAS.1'))).toBe('nt');
    expect(dayKind(parseReading('PSA.148;PSA.149;PSA.150;PRO.31.10-31'))).toBe('wisdom');
    expect(dayKind(parseReading('GEN.1;PSA.1'))).toBe('ot');
  });
});

describe('Proiectul Împreună · calendario', () => {
  it('el día 82 de YouVersion se saltó: desde ahí la app va un día por delante', () => {
    expect(youversionDay(1, [82])).toBe(1);
    expect(youversionDay(81, [82])).toBe(81);
    expect(youversionDay(82, [82])).toBe(83);
    expect(youversionDay(315, [82])).toBe(316);
    expect(youversionDay(365, [82])).toBe(366);
  });

  it('cuenta el día del año con la fecha local, también fuera de la edición', () => {
    expect(daysInYear(2026)).toBe(365);
    expect(dayOfEdition(new Date(2026, 10, 11, 0, 5), 2026)).toBe(315);
    expect(dayOfEdition(new Date(2026, 10, 11, 23, 55), 2026)).toBe(315);
    expect(dayOfEdition(new Date(2025, 11, 31, 12), 2026)).toBe(0);
    expect(dayOfEdition(new Date(2027, 0, 1, 12), 2026)).toBe(366);
    expect(isoDateOfDay(2026, 315)).toBe('2026-11-11');
  });

  it('la semana va de lunes a domingo y no se sale de la edición', () => {
    // 11/11/2026 es miércoles → lunes 9 (313) … domingo 15 (319).
    expect(weekOf(2026, 315, 365)).toEqual([313, 314, 315, 316, 317, 318, 319]);
    // 1/1/2026 es jueves: la primera semana sólo tiene 4 días.
    expect(weekOf(2026, 1, 365)).toEqual([1, 2, 3, 4]);
    expect(weekOf(2026, 365, 365)).toEqual([362, 363, 364, 365]);
  });

  it('en la iglesia se anuncia la semana de mañana: el domingo, la que empieza el lunes', () => {
    const running = (day: number) => ({ status: 'running' as const, day });
    // Miércoles 11/11 (315) → su semana; sábado 14/11 (318) → la misma.
    expect(announcedWeek(2026, running(315), 365)).toEqual([313, 314, 315, 316, 317, 318, 319]);
    expect(announcedWeek(2026, running(318), 365)).toEqual([313, 314, 315, 316, 317, 318, 319]);
    // Domingo 15/11 (319) → lunes 16 (320) … domingo 22 (326).
    expect(announcedWeek(2026, running(319), 365)).toEqual([320, 321, 322, 323, 324, 325, 326]);
    // Fuera de la edición: la primera y la última semana.
    expect(announcedWeek(2026, { status: 'before', day: 1 }, 365)).toEqual([1, 2, 3, 4]);
    expect(announcedWeek(2026, { status: 'ended', day: 365 }, 365)).toEqual([362, 363, 364, 365]);
    // El 31/12 (jueves): mañana ya no es de la edición → la semana de hoy.
    expect(announcedWeek(2026, running(365), 365)).toEqual([362, 363, 364, 365]);
  });

  it('rejilla del mes: semanas de lunes a domingo con huecos al principio y al final', () => {
    // Octubre de 2026 empieza en jueves: tres huecos; 31 días → 5 semanas.
    const october = monthGrid(2026, 9);
    expect(october.length).toBe(5);
    expect(october[0]).toEqual([null, null, null, 274, 275, 276, 277]);
    expect(october[4]).toEqual([299, 300, 301, 302, 303, 304, null]); // 26–31 de octubre
    // Febrero de 2026 (lunes 2): 28 días en 5 filas, la primera con 6 huecos.
    expect(monthGrid(2026, 1)[0]).toEqual([null, null, null, null, null, null, 32]);
    expect(monthGrid(2026, 1).flat().filter((d) => d !== null).length).toBe(28);
  });

  it('día de ayuno = primer jueves de cada mes', () => {
    expect(isFastingDay(2026, 1)).toBe(true); // jueves 1 de enero
    expect(isFastingDay(2026, 309)).toBe(true); // jueves 5 de noviembre
    expect(isFastingDay(2026, 316)).toBe(false); // jueves 12 de noviembre
    expect(isFastingDay(2026, 337)).toBe(true); // jueves 3 de diciembre
    expect(nextFastingDay(2026, 315, 365)).toBe(337);
    expect(nextFastingDay(2026, 337, 365)).toBe(337);
    expect(nextFastingDay(2026, 338, 365)).toBeNull();
  });

  it('dice dónde cae un día respecto a hoy', () => {
    expect(relativeDay(315, 315, 'ro')).toBe('Azi');
    expect(relativeDay(314, 315, 'ro')).toBe('Ieri');
    expect(relativeDay(316, 315, 'es')).toBe('Mañana');
    expect(relativeDay(279, 315, 'ro')).toBe('Acum 36 de zile');
    expect(relativeDay(320, 315, 'es')).toBe('Dentro de 5 días');
  });

  it('rango y mes de cada día', () => {
    expect(monthRange(2026, 0)).toEqual({ first: 1, last: 31 });
    expect(monthRange(2026, 1)).toEqual({ first: 32, last: 59 });
    expect(monthRange(2026, 10)).toEqual({ first: 305, last: 334 });
    expect(monthOfDay(2026, 315)).toBe(10);
  });

  it('primer jueves de mes: el de este mes si no ha pasado, si no el siguiente', () => {
    expect(nextFirstThursday(new Date(2026, 10, 11)).getDate()).toBe(3);
    expect(nextFirstThursday(new Date(2026, 10, 11)).getMonth()).toBe(11);
    expect(nextFirstThursday(new Date(2026, 10, 5)).getDate()).toBe(5);
    expect(nextFirstThursday(new Date(2026, 10, 1)).getMonth()).toBe(10);
  });

  it('racha: días seguidos hasta hoy, o hasta ayer si hoy aún no se ha marcado', () => {
    expect(readingStreak(new Set([313, 314, 315]), 315)).toBe(3);
    expect(readingStreak(new Set([313, 314]), 315)).toBe(2);
    expect(readingStreak(new Set([312, 314, 315]), 315)).toBe(2);
    expect(readingStreak(new Set(), 315)).toBe(0);
  });
});

describe('Proiectul Împreună · YouTube', () => {
  const item = (title: string, publishedAt: string, videoId = 'IQjsyn26RTY') => ({
    snippet: { title, publishedAt, resourceId: { videoId } },
  });

  it('lee «Ziua 316 Paul Răducanu» subido a las 22:15 UTC de la víspera', () => {
    expect(parseYoutubeUpload(item('Ziua 316 Paul Răducanu', '2026-11-11T22:15:02Z'), 2026)).toEqual({
      day: 316,
      video: 'IQjsyn26RTY',
      speaker: 'Paul Răducanu',
      postId: null,
    });
    expect(parseYoutubeUpload(item('Ziua 001 Nelu Filip', '2025-12-31T22:15:00Z'), 2026)?.day).toBe(1);
  });

  it('descarta lo que no es del proyecto o no casa con la fecha de subida', () => {
    expect(parseYoutubeUpload(item('Gala Credo TV', '2026-11-11T22:15:02Z'), 2026)).toBeNull();
    expect(parseYoutubeUpload(item('Ziua 2 Alguien', '2026-11-11T22:15:02Z'), 2026)).toBeNull();
    expect(parseYoutubeUpload(item('Ziua 316 X', 'no es fecha'), 2026)).toBeNull();
    expect(parseYoutubeUpload(item('Ziua 316 X', '2026-11-11T22:15:02Z', 'corto'), 2026)).toBeNull();
  });
});

describe('Proiectul Împreună · web del proyecto', () => {
  const post = {
    id: 12449,
    title: { rendered: 'Ziua 315 &#8211; Adi Ion &#8211; 11 Noiembrie 2026' },
    content: { rendered: '<p>Iacov 1</p><iframe src="https://www.youtube.com/embed/91WVKzPoQ-4?feature=oembed"></iframe>' },
  };

  it('saca día, ponente, vídeo e id de una entrada diaria', () => {
    expect(parseWpPost(post)).toEqual({ day: 315, speaker: 'Adi Ion', video: '91WVKzPoQ-4', postId: 12449 });
  });

  it('acepta diacríticos y ceros a la izquierda; ignora lo que no es un día', () => {
    expect(parseWpPost({ ...post, title: { rendered: 'Ziua 001 &#8211; Victor Cîmpean &#8211; 7 Ianuarie 2026' } })).toMatchObject({
      day: 1,
      speaker: 'Victor Cîmpean',
    });
    expect(parseWpPost({ ...post, title: { rendered: 'Anunț' } })).toBeNull();
    expect(parseWpPost({ ...post, content: { rendered: '<p>Iacov 1</p>' } })?.video).toBeNull();
  });
});
