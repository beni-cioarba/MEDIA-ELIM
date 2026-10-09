/**
 * Lector del calendario público de la app de la masa de tineret
 * (`toate.ics`, RFC 5545, generado por ADM-TINERET en cada despliegue).
 *
 * Puro y sin Angular. Sólo extrae lo que la web enseña —fecha, equipo y
 * horas—; el coordinador y las personas del `DESCRIPTION` se ignoran a
 * propósito (los nombres se quedan en la app).
 */

/** Un turno de la masa de vineri. */
export interface MealTurn {
  /** Día, `YYYY-MM-DD` (hora local de Madrid, como lo escribe el feed). */
  readonly date: string;
  /** «Echipa 7». */
  readonly team: string;
  /** El número del equipo (7), o `null` si el nombre no lo lleva. */
  readonly teamNumber: number | null;
  /** Llegada de los tineri que preparan («19:30»). */
  readonly arrival: string | null;
  /** Cuándo traen la comida los părinți («20:00»). */
  readonly food: string | null;
  /** Comienzo del programa («20:30»). */
  readonly program: string | null;
}

const TIME = String.raw`(\d{1,2}:\d{2})`;
const ARRIVAL = new RegExp(String.raw`Sosire[^:\n]*:\s*` + TIME, 'i');
const FOOD = new RegExp(String.raw`m[aâ]ncare[^:\n]*:\s*` + TIME, 'i');
const PROGRAM = new RegExp(String.raw`(?:[ÎI]nceput|Start)[^:\n]*program[^:\n]*:\s*` + TIME, 'i');

/** Turnos del feed, ordenados por fecha. Los cancelados no cuentan. */
export function parseMealFeed(ics: string): MealTurn[] {
  // «Desplegado» de líneas (RFC 5545 §3.1): un salto seguido de espacio o
  // tabulador continúa la línea anterior.
  const text = ics.replace(/\r?\n[ \t]/g, '');
  const turns: MealTurn[] = [];

  for (const block of text.split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0];
    const field = (name: string): string | null =>
      body.match(new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'm'))?.[1]?.trim() ?? null;

    if (field('STATUS')?.toUpperCase() === 'CANCELLED') continue;
    const start = field('DTSTART')?.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!start) continue;

    const team = field('CATEGORIES') ?? field('SUMMARY')?.split(/\s+[—-]\s+/).at(-1) ?? '';
    const description = unescape(field('DESCRIPTION') ?? '');
    const number = team.match(/\d+/)?.[0];

    turns.push({
      date: `${start[1]}-${start[2]}-${start[3]}`,
      team,
      teamNumber: number ? Number(number) : null,
      arrival: description.match(ARRIVAL)?.[1] ?? null,
      food: description.match(FOOD)?.[1] ?? null,
      program: description.match(PROGRAM)?.[1] ?? null,
    });
  }

  return turns.sort((a, b) => a.date.localeCompare(b.date));
}

/** Texto de iCalendar → texto plano (`\n`, `\,`, `\;`, `\\`). */
function unescape(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}
