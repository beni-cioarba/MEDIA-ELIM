import type { WeeklyProgram, Rehearsal } from '../church.config';

/**
 * Programa semanal fijo (cultos) y ensayos de cor y fanfara.
 *
 * Fichero de **contenido**: lo edita quien publica. Los tipos están en
 * `core/church.config.ts`, que reúne todos los ficheros de `core/content/`
 * en `DEFAULT_CHURCH_CONFIG` (la app lo lee por el token `CHURCH_CONFIG`).
 */

// ---------------------------------------------------------------------
// Programare săptămânală a serviciilor religioase fixe.
// El campo `day` sigue `Date.getDay()` (0=Duminică ... 6=Sâmbătă) para
// poder calcular "es hoy" sin parseo de strings.
// ---------------------------------------------------------------------
export const WEEKLY_PROGRAM: readonly WeeklyProgram[] = [
  {
    id: 'luni',
    day: 1,
    dayLabel: 'Luni',
    time: '20:30',
    title: 'Rugăciune și stăruință după Duhul Sfânt',
    description: '',
  },
  {
    id: 'marti',
    day: 2,
    dayLabel: 'Marți',
    time: '20:30',
    title: 'Rugăciune',
    description: '',
  },
  {
    id: 'miercuri',
    day: 3,
    dayLabel: 'Miercuri',
    time: '20:30',
    title: 'Învățătură · Studiu biblic',
    description: '',
  },
  {
    id: 'joi',
    day: 4,
    dayLabel: 'Joi',
    time: '20:30',
    title: 'Rugăciune și învățătură',
    description: '',
  },
  {
    id: 'vineri',
    day: 5,
    dayLabel: 'Vineri',
    time: '20:30',
    title: 'Seară de tineret',
    description: '',
  },
  {
    id: 'duminica',
    day: 0,
    dayLabel: 'Duminică',
    time: '10:00 & 18:00',
    title: 'Închinare și învățătură',
    description: '',
    // Prima duminică din lună: dimineața Cina Domnului, seara serviciul de
    // tineret (el mismo que `departments.config.ts` → youth → `sunday`).
    monthly: [
      { rule: { weekday: 0, nth: 1 }, time: '10:00', title: 'Cina Domnului' },
      { rule: { weekday: 0, nth: 1 }, time: '18:00', title: 'Seară de tineret', departments: ['youth'] },
    ],
  },
];

// ---------------------------------------------------------------------
// Evenimente puntuale viitoare. Se muestran ordenados por proximidad
// y con un contador "faltan X días". El cálculo se hace en el componente
// (no aquí) para reaccionar a la fecha actual sin recargar la app.
// Formato `date`: ISO YYYY-MM-DD (sin hora, sin zona horaria).
// ---------------------------------------------------------------------
export const REHEARSALS: readonly Rehearsal[] = [
  {
    id: 'cor',
    group: 'Cor',
    department: 'choir',
    slots: [{ days: 'Sâmbătă', time: '19:00' }],
  },
  {
    id: 'fanfara',
    group: 'Fanfară',
    department: 'brass',
    slots: [
      { days: 'Miercuri', time: '19:00' },
      { days: 'Sâmbătă', time: '17:00' },
    ],
  },
  {
    id: 'fanfara_intensiv',
    group: 'Fanfară',
    label: 'săptămână intensivă',
    department: 'brass',
    lastWeekOfMonth: true,
    slots: [
      { days: 'Luni – Vineri', time: '19:00' },
      { days: 'Sâmbătă', time: '17:00' },
    ],
  },
];
