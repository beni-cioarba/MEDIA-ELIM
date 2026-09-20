/**
 * Plan de lectura bíblica — GENERADO desde el Excel de la iglesia.
 *
 * No lo edites a mano: ejecuta
 *   python scripts/import-bible-plan.py "ruta/PROGRAMARE_CITIREA_BIBLIEI.xlsx"
 * y el fichero se regenera entero (un mes = una hoja del Excel).
 *
 * Fuente: Copia de PROGRAMARE_CITIREA_BIBLIEI.xlsx
 */

/** Semana del plan: empieza en lunes; `readings[i]` es la lectura del día `start + i`. */
export interface BibleReadingWeek {
  /** Número de semana dentro del plan plurianual (90, 91…). */
  readonly number: number;
  /** Lunes de la semana, `YYYY-MM-DD`. */
  readonly start: string;
  /** Tramo de la semana, tal como se anuncia («Isaia 57-66, Ieremia 1-4»). */
  readonly summary: string;
  /** Lecturas diarias, lunes→domingo (puede haber menos de 7 al cerrar el plan). */
  readonly readings: readonly string[];
  /** Lecturas del Nuevo Testamento del mismo día, si el plan las trae. */
  readonly newTestament?: readonly string[];
}

/** Un mes del plan = una hoja del Excel. */
export interface BibleReadingMonth {
  /** `YYYY-MM`. */
  readonly id: string;
  /** Rótulo en rumano («Octombrie 2026»). */
  readonly label: string;
  /** Tramo del mes completo. */
  readonly scope: string;
  readonly weeks: readonly BibleReadingWeek[];
}

export interface BibleReadingPlan {
  /** Título del plan («Programare citirea Bibliei – VDC»). */
  readonly title: string;
  readonly months: readonly BibleReadingMonth[];
}

export const BIBLE_READING_PLAN: BibleReadingPlan = {
  title: 'Programare citirea Bibliei – VDC',
  months: [
    {
      id: '2026-09',
      label: 'Septembrie 2026',
      scope: 'Isaia 43-66, Ieremia 1-18',
      weeks: [
        {
          number: 90,
          start: '2026-09-14',
          summary: 'Isaia 43-56',
          readings: [
            'Isaia 43-44',
            'Isaia 45-46',
            'Isaia 47-48',
            'Isaia 49-50',
            'Isaia 51-52',
            'Isaia 53-54',
            'Isaia 55-56',
          ],
        },
        {
          number: 91,
          start: '2026-09-21',
          summary: 'Isaia 57-66, Ieremia 1-4',
          readings: [
            'Isaia 57-58',
            'Isaia 59-60',
            'Isaia 61-62',
            'Isaia 63-64',
            'Isaia 65-66',
            'Ieremia 1-2',
            'Ieremia 3-4',
          ],
        },
        {
          number: 92,
          start: '2026-09-28',
          summary: 'Ieremia 5-18',
          readings: [
            'Ieremia 5-6',
            'Ieremia 7-8',
            'Ieremia 9-10',
            'Ieremia 11-12',
            'Ieremia 13-14',
            'Ieremia 15-16',
            'Ieremia 17-18',
          ],
        },
      ],
    },
    {
      id: '2026-10',
      label: 'Octombrie 2026',
      scope: 'Ieremia 19-52, Plângerile lui Ieremia 1-5, Ezechiel 1-17',
      weeks: [
        {
          number: 93,
          start: '2026-10-05',
          summary: 'Ieremia 19-32',
          readings: [
            'Ieremia 19-20',
            'Ieremia 21-22',
            'Ieremia 23-24',
            'Ieremia 25-26',
            'Ieremia 27-28',
            'Ieremia 29-30',
            'Ieremia 31-32',
          ],
        },
        {
          number: 94,
          start: '2026-10-12',
          summary: 'Ieremia 33-46',
          readings: [
            'Ieremia 33-34',
            'Ieremia 35-36',
            'Ieremia 37-38',
            'Ieremia 39-40',
            'Ieremia 41-42',
            'Ieremia 43-44',
            'Ieremia 45-46',
          ],
        },
        {
          number: 95,
          start: '2026-10-19',
          summary: 'Ieremia 47-52, Plângerile lui Ieremia 1-5, Ezechiel 1-3',
          readings: [
            'Ieremia 47-48',
            'Ieremia 49-50',
            'Ieremia 51-52',
            'Plângerile lui Ieremia 1-2',
            'Plângerile lui Ieremia 3-4',
            'Plângerile lui Ieremia 5, Ezechiel 1',
            'Ezechiel 2-3',
          ],
        },
        {
          number: 96,
          start: '2026-10-26',
          summary: 'Ezechiel 4-17',
          readings: [
            'Ezechiel 4-5',
            'Ezechiel 6-7',
            'Ezechiel 8-9',
            'Ezechiel 10-11',
            'Ezechiel 12-13',
            'Ezechiel 14-15',
            'Ezechiel 16-17',
          ],
        },
      ],
    },
    {
      id: '2026-11',
      label: 'Noiembrie 2026',
      scope: 'Ezechiel 18-48, Daniel, Osea, Ioel, Amos, Obadia',
      weeks: [
        {
          number: 97,
          start: '2026-11-02',
          summary: 'Ezechiel 18-31',
          readings: [
            'Ezechiel 18-19',
            'Ezechiel 20-21',
            'Ezechiel 22-23',
            'Ezechiel 24-25',
            'Ezechiel 26-27',
            'Ezechiel 28-29',
            'Ezechiel 30-31',
          ],
        },
        {
          number: 98,
          start: '2026-11-09',
          summary: 'Ezechiel 32-45',
          readings: [
            'Ezechiel 32-33',
            'Ezechiel 34-35',
            'Ezechiel 36-37',
            'Ezechiel 38-39',
            'Ezechiel 40-41',
            'Ezechiel 42-43',
            'Ezechiel 44-45',
          ],
        },
        {
          number: 99,
          start: '2026-11-16',
          summary: 'Ezechiel 46-48, Daniel 1-11',
          readings: [
            'Ezechiel 46-47',
            'Ezechiel 48, Daniel 1',
            'Daniel 2-3',
            'Daniel 4-5',
            'Daniel 6-7',
            'Daniel 8-9',
            'Daniel 10-11',
          ],
        },
        {
          number: 100,
          start: '2026-11-23',
          summary: 'Daniel 12, Osea 1-13',
          readings: [
            'Daniel 12, Osea 1',
            'Osea 2-3',
            'Osea 4-5',
            'Osea 6-7',
            'Osea 8-9',
            'Osea 10-11',
            'Osea 12-13',
          ],
        },
        {
          number: 101,
          start: '2026-11-30',
          summary: 'Osea 14, Ioel 1-3, Amos 1-9, Obadia 1',
          readings: [
            'Osea 14, Ioel 1',
            'Ioel 2-3',
            'Amos 1-2',
            'Amos 3-4',
            'Amos 5-6',
            'Amos 7-8',
            'Amos 9, Obadia 1',
          ],
        },
      ],
    },
    {
      id: '2026-12',
      label: 'Decembrie 2026',
      scope: 'Iona, Mica, Naum, Habacuc, Țefania, Hagai, Zaharia, Maleahi',
      weeks: [
        {
          number: 102,
          start: '2026-12-07',
          summary: 'Iona 1-4, Mica 1-7, Naum 1-3',
          readings: [
            'Iona 1-2',
            'Iona 3-4',
            'Mica 1-2',
            'Mica 3-4',
            'Mica 5-6',
            'Mica 7, Naum 1',
            'Naum 2-3',
          ],
        },
        {
          number: 103,
          start: '2026-12-14',
          summary: 'Habacuc 1-3, Țefania 1-3, Hagai 1-2, Zaharia 1-6',
          readings: [
            'Habacuc 1-2',
            'Habacuc 3, Țefania 1',
            'Țefania 2-3',
            'Hagai 1-2',
            'Zaharia 1-2',
            'Zaharia 3-4',
            'Zaharia 5-6',
          ],
        },
        {
          number: 104,
          start: '2026-12-21',
          summary: 'Zaharia 7-14, Maleahi 1-4',
          readings: [
            'Zaharia 7-8',
            'Zaharia 9-10',
            'Zaharia 11-12',
            'Zaharia 13-14',
            'Maleahi 1-2',
            'Maleahi 3-4',
          ],
        },
      ],
    },
  ],
};
