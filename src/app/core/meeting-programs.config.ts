import type { PersonId } from './leadership.config';

/**
 * PROGRAMA DE TEMAS DE LAS REUNIONES FIJAS
 * ========================================
 *
 * Qué se trata cada noche de una reunión fija (`weekly` / `monthly` en
 * `departments.config.ts`). La reunión ya sabe **cuándo** es (sus fechas se
 * calculan); esto sólo añade **de qué va** una fecha concreta.
 *
 * Fuente: el calendario interno de tineret (`adtineretelim@gmail.com`), que
 * es **privado** y mezcla lo público con la organización interna. No se
 * vincula: se copia aquí a mano y sólo lo publicable (ver
 * `docs/ai/39-departments.md` › «Programa de temas»).
 *
 * Reglas de lo que entra:
 *  · Sólo fechas **con tema asignado**. «Seara tineret: predica X» (sólo un
 *    nombre), «Dezbatere: tema» (aún sin tema) y las salidas con «???» se
 *    quedan fuera.
 *  · Texto en rumano, con diacríticos y corregido; no se traduce (como los
 *    títulos de `upcomingEvents`).
 *  · Las fechas pasadas desaparecen solas: no hace falta borrarlas.
 */
export interface MeetingTopic {
  /** `YYYY-MM-DD`: una de las fechas de la reunión. */
  readonly date: string;
  readonly title: string;
  /** Serie a la que pertenece («Rugăciunea»), si la hay. */
  readonly series?: string;
  /** Quién lo trae, si es alguien del organigrama (sale su nombre completo). */
  readonly speaker?: PersonId;
  /** Invitado de fuera del organigrama: nombre tal cual. */
  readonly guest?: string;
  /** `HH:MM` sólo si esa noche cambia la hora habitual. */
  readonly time?: string;
}

/** Calendario de tineret a 14/10/2026 (copiado de la vista «Agenda»). */
export const YOUTH_FRIDAY_PROGRAM: readonly MeetingTopic[] = [
  // ── Octubre: serie sobre la oración ──────────────────────────────────
  {
    date: '2026-10-02',
    series: 'Rugăciunea',
    title: 'Mai mult decât o rutină: de la „bifat” la o conversație reală',
    speaker: 'gabriel-daniel-cifor',
  },
  {
    date: '2026-10-09',
    series: 'Rugăciunea',
    title: 'Citește Biblia ca să te schimbe, nu doar ca să știi mai multe',
    guest: 'Raul Garcia',
  },
  {
    date: '2026-10-16',
    series: 'Rugăciunea',
    title: 'Găsește timp pentru Dumnezeu',
  },
  {
    date: '2026-10-23',
    series: 'Rugăciunea',
    title: 'Ascultă, nu doar vorbi: cum recunoști vocea lui Dumnezeu?',
    speaker: 'samuel-bogdan',
  },
  {
    date: '2026-10-30',
    series: 'Rugăciunea',
    title: 'Seară de rugăciune cu părinții',
  },
  // ── Noviembre ────────────────────────────────────────────────────────
  {
    date: '2026-11-06',
    title: 'Dragoste adevărată sau doar fluturi în stomac?',
    speaker: 'gabriel-daniel-cifor',
  },
  {
    date: '2026-11-13',
    title: 'De ce contează curăția (și de ce nu e demodată)',
    speaker: 'samuel-bogdan',
  },
  {
    // En el calendario, de 19:00 a 20:00 (no a la hora de siempre).
    date: '2026-11-20',
    title: 'Înainte să spui „da”',
    guest: 'Condrat',
    time: '19:00',
  },
  // ── Diciembre: Daniel ────────────────────────────────────────────────
  {
    date: '2026-12-04',
    series: 'Daniel, tânărul care n-a cedat presiunii',
    title: 'Linia trasă din timp și curajul de a nu te conforma',
    speaker: 'gabriel-daniel-cifor',
  },
  {
    date: '2026-12-11',
    series: 'Daniel, tânărul care n-a cedat presiunii',
    title: 'Excelează, nu doar rezista: rutina care te ține tare sub presiune',
  },
  {
    date: '2026-12-18',
    title: 'Seară de Crăciun',
    speaker: 'samuel-bogdan',
  },
  // ── Enero–febrero 2027 ───────────────────────────────────────────────
  {
    date: '2027-01-15',
    series: 'Cine sunt eu de fapt?',
    title: 'Ce spune Dumnezeu despre tine, nu ce spune Instagramul',
  },
  {
    date: '2027-01-22',
    series: 'Cine sunt eu de fapt?',
    title: 'Capcana „valorezi cât realizezi”',
  },
  {
    date: '2027-01-29',
    series: 'Cine sunt eu de fapt?',
    title: 'Să trăiești din identitate, nu pentru ea',
  },
  {
    date: '2027-02-05',
    series: 'Iov',
    title: 'Când viața pare să nu mai aibă sens',
  },
];
