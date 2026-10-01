/**
 * «Cauzele Bisericii Elim» — las causas por las que ora la iglesia.
 *
 * Es una **lista vigente**, no semanal: se edita cuando cambia (alguien se
 * recupera, entra una familia nueva…) y se actualiza `updatedOn`. Receta en
 * `docs/ai/37-prayer-causes.md`.
 *
 * Dos tipos de causa, que se maquetan distinto (lo decide el dato, no una
 * etiqueta):
 *   · Con **personas** (`people`): se ora por ellas por su nombre.
 *   · **Generales** (`intent`): un título y la intención en una frase.
 *
 * El texto va en rumano y no se traduce, como el resto del contenido de la
 * iglesia.
 */

export interface PrayerCause {
  /** Estable, minúsculas: ancla en la web (`#vindecare`). */
  readonly id: string;
  /** «Vindecare», «Biserica Elim». */
  readonly title: string;
  /** La intención en una frase («Revigorare spirituală»). */
  readonly intent?: string;
  /** Nombres por los que se ora, tal como se dicen en la iglesia. */
  readonly people?: readonly string[];
}

export interface PrayerCausesList {
  /** Última revisión de la lista (`YYYY-MM-DD`): se muestra como «actualizada el…». */
  readonly updatedOn: string;
  /** En el orden en que se leen. */
  readonly causes: readonly PrayerCause[];
}

export const PRAYER_CAUSES: PrayerCausesList = {
  updatedOn: '2026-10-01',
  causes: [
    {
      id: 'familii',
      title: 'Rugăciune pentru familii',
      people: ['Popițan Grigore și Maria', 'Zăgrean Mihael și Emanuela'],
    },
    {
      id: 'vindecare',
      title: 'Vindecare',
      people: [
        'Neluțu Andor',
        'Mirela Bucur',
        'Gicu Tomoiagă',
        'Zoltan Toth',
        'Alex Popițan',
        'Marcos Zăgrean',
        'Raúl García',
        'Marius Răduț',
      ],
    },
    {
      id: 'fiii-risipitori',
      // «ai Bisericii Elim» ya lo dice el rótulo de la lista.
      title: 'Fiii risipitori',
      intent: 'Întoarcere cu fața spre Dumnezeu',
    },
    {
      id: 'familiile-bisericii',
      title: 'Familiile bisericii',
      intent: 'Implicarea lui Dumnezeu în fiecare familie',
    },
    {
      id: 'romania',
      title: 'România',
      intent: 'Pentru țara noastră',
    },
    {
      id: 'biserica-elim',
      title: 'Biserica Elim',
      intent: 'Revigorare spirituală',
    },
  ],
};
