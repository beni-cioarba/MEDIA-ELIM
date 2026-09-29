/**
 * «Rugăciune pentru familii» — las familias por las que ora la iglesia cada
 * semana, con su foto y su motivo de oración.
 *
 * Cómo añadir una semana (receta completa en `docs/ai/36-family-prayer.md`):
 *   1. `node scripts/import-family-photos.mjs "<carpeta de fotos>" <domingo>`
 *      → optimiza las fotos en `assets/family-prayer/<domingo>/` (3 tamaños)
 *        y regenera el manifiesto `family-photos.generated.ts`.
 *   2. Añade aquí un `PrayerWeek` con esas familias, **en el orden del
 *      resumen** (es el orden de las diapositivas).
 *
 * Nada más: la web, el panel de control y la proyección toman la semana que
 * toca por la fecha (`FamilyPrayerService`). El texto va en rumano, tal como
 * lo escribe cada familia (sólo se corrigen erratas y diacríticos), y no se
 * traduce.
 */

/** Versículo que la familia acompaña a su petición. */
export interface PrayerVerse {
  readonly text: string;
  /** «Psalmul 68:19». */
  readonly reference: string;
}

/**
 * Una familia (o una persona) por la que se ora esa semana.
 *
 * La foto no se declara aquí: si el script la ha importado, está en el
 * manifiesto generado (`family-photos.generated.ts`, clave `<domingo>/<id>`)
 * con sus medidas y tamaños reales. Sin foto se pinta un monograma.
 */
export interface PrayerFamily {
  /**
   * Estable, en minúsculas y sin diacríticos: es el nombre de la foto y el
   * ancla del enlace compartido (`…/rugaciune-pentru-familii/<domingo>#<id>`).
   */
  readonly id: string;
  /** «Bîrle». */
  readonly surname: string;
  /** «Sebastian și Maria» · «Andreas» (persona sola). */
  readonly names: string;
  /** Persona sola: se titula «Bena Andreas», no «Familia Bena». */
  readonly single?: boolean;
  readonly children?: readonly string[];
  /** Motivo de oración o mensaje, un párrafo por elemento. */
  readonly message?: readonly string[];
  readonly verse?: PrayerVerse;
}

/** Las familias de una semana, tal como se presentan el domingo. */
export interface PrayerWeek {
  /** Número de la semana en la serie («Săptămâna 04»). */
  readonly number: number;
  /**
   * Domingo en que se presenta (`YYYY-MM-DD`): el de la carpeta y del
   * PowerPoint. Se ora por ellas **la semana siguiente** (lunes → domingo).
   */
  readonly presentedOn: string;
  readonly families: readonly PrayerFamily[];
}

export const FAMILY_PRAYER_WEEKS: readonly PrayerWeek[] = [
  {
    number: 1,
    presentedOn: '2026-09-06',
    families: [
      {
        id: 'andor-ioan-iuliana',
        surname: 'Andor',
        names: 'Ioan și Iuliana',
        verse: {
          text: 'Pace și dragoste împreună cu credința din partea lui Dumnezeu Tatăl și din partea Domnului Isus Hristos, și harul să fie cu toți cei ce iubesc pe Domnul nostru Isus Hristos în curăție.',
          reference: 'Efeseni 6:23-24',
        },
      },
      {
        id: 'andor-nelutu-dana',
        surname: 'Andor',
        names: 'Neluțu și Dana',
        children: ['Isac', 'Sofia'],
        message: [
          'Dorim ca Domnul Dumnezeu să ne țină treji și veghetori pe calea Lui și mâna Lui să fie peste casa noastră cu vindecare, înțelepciune și putere!',
        ],
      },
      {
        id: 'albu-vasile-voichita',
        surname: 'Albu',
        names: 'Vasile și Voichița',
        children: ['Gabriel', 'Raul', 'Isac'],
        message: [
          'Îl rugăm pe Domnul ca să se lucreze în toate compartimentele de familie, să ne dea înțelepciune, pricepere și Duhul Său să ne lumineze inima, mintea și viața.',
        ],
      },
      {
        id: 'albu-radu-ionela',
        surname: 'Albu',
        names: 'Radu și Ionela',
        children: ['Daniel'],
        message: [
          'Avem nevoie de implicarea lui Dumnezeu în casa noastră, însă ne dorim să fie în milă, îndurare și bunătate. Domnul să restaureze toată familia.',
          'Vă mulțumim!',
        ],
      },
      {
        id: 'albu-radu-araceli',
        surname: 'Albu',
        names: 'Radu și Araceli',
        message: [
          'Dorința noastră este ca Domnul să ne călăuzească spre ce este bine și bun în viață, să ne dea putere în slujire și să rămânem toată viața aproape de Domnul.',
        ],
      },
    ],
  },
  {
    number: 2,
    presentedOn: '2026-09-13',
    families: [
      {
        id: 'andrei-daniela-florin',
        surname: 'Andrei',
        names: 'Daniela și Florin',
        children: ['Natalia-Florina', 'Robert-Daniel', 'Sofia-Cristina', 'Martina-Paula'],
        message: [
          'Vă rog să mă sprijiniți în rugăciune ca Domnul să fie cu mine și cu casa mea. Voi fi programată pentru două operații și-mi doresc ca Domnul să lase vindecarea Lui în trupul meu.',
          'De asemenea, vă rog să vă rugați și pentru Florin, soțul meu, și copiii noștri, ca Domnul să lase multă călăuzire de sus și mântuire deplină în toată casa noastră.',
        ],
      },
      {
        id: 'apalaghiei-iulian-lenuta',
        surname: 'Apalaghiei',
        names: 'Iulian și Lenuța',
        children: ['Samuel', 'Sara', 'David', 'Rebeca', 'Naomi', 'Daniel'],
        verse: {
          text: 'Voi lăuda pe Domnul din toată inima mea, voi istorisi toate minunile Lui. Voi face din Tine bucuria și veselia mea, voi cânta Numele Tău, Dumnezeule Preaînalt.',
          reference: 'Psalmul 9:1-2',
        },
      },
      {
        id: 'aparaschivei-cristina',
        surname: 'Aparaschivei',
        names: 'Cristina',
        single: true,
        message: [
          'Dorința mea este ca Domnul să mântuiască toată familia părinților mei, ca într-o zi să fim toată familia în Cerul lui Dumnezeu.',
          'De asemenea, mă rog și pentru mine, ca Domnul să-mi dea curăție de inimă, putere prin Duhul Sfânt, iar lumina lui Dumnezeu să strălucească prin viața mea.',
        ],
      },
      {
        id: 'bagosi-richard-marta',
        surname: 'Bagoși',
        names: 'Richard și Marta',
        message: [
          'Ca familie, ne dorim călăuzirea lui Dumnezeu în toate deciziile și planurile noastre pentru viitor și, de asemenea, ne dorim ca voia Lui să se împlinească în viețile noastre.',
        ],
      },
      {
        id: 'baceanu-emanuela',
        surname: 'Băceanu',
        names: 'Emanuela',
        single: true,
        message: [
          'Să mă ajute Dumnezeu să trăiesc în sfințenie, ca El să-Și poată împlini promisiunile în viața mea. Inima mea să fie întotdeauna aliniată cu voia Lui.',
        ],
      },
    ],
  },
  {
    number: 3,
    presentedOn: '2026-09-20',
    families: [
      {
        id: 'bahmata-daniel-mihaela',
        surname: 'Bahmătă',
        names: 'Daniel și Mihaela',
        children: ['Rebeca'],
        message: [
          'Dorința noastră ca familie este ca prezența lui Dumnezeu să vină în casa noastră și implicarea Lui în familia noastră să aducă pace, liniște și vindecare.',
        ],
      },
      {
        id: 'barba-bogdan-magdalena',
        surname: 'Barbă',
        names: 'Bogdan și Magdalena',
        children: ['Levi', 'Rebeca', 'Daniel'],
        message: [
          'Avem nevoie de implicarea lui Dumnezeu în toate aspectele.',
          'Ne rugăm ca Domnul să lase Duhul Său cel Sfânt peste noi și copiii noștri, ca în ziua veșniciei să fim toți în bucuria veșnică, împreună cu Dumnezeu.',
        ],
      },
      {
        id: 'baleanu-antonel-rodica',
        surname: 'Băleanu',
        names: 'Antonel și Rodica',
        children: ['Samuel', 'Elias'],
        message: [
          'Mulțumim Domnului pentru absolut toate binecuvântările revărsate peste familia noastră, pentru harul de a face parte din familia (biserica Domnului) Elim.',
          'Dorința noastră este să rămânem statornici, veghetori și să luptăm lupta cea bună a credinței.',
        ],
      },
      {
        id: 'bena-andreas',
        surname: 'Bena',
        names: 'Andreas',
        single: true,
        message: [
          'Aș vrea să vă rugați pentru mine și pentru familia mea, ca Domnul să ne țină în continuare și să ne țină aproape de El.',
        ],
      },
      {
        id: 'bena-iosua',
        surname: 'Bena',
        names: 'Iosua',
        single: true,
        message: [
          'Dorința mea este ca Dumnezeu să mă întărească și să-mi pregătească inima, să lucreze la viața mea, în așa fel încât să fiu plăcut în fața Lui.',
        ],
        verse: {
          text: 'Am fost răstignit împreună cu Hristos și trăiesc… dar nu mai trăiesc eu, ci Hristos trăiește în mine. Și viața pe care o trăiesc acum în trup o trăiesc în credința în Fiul lui Dumnezeu, care m-a iubit și S-a dat pe Sine Însuși pentru mine.',
          reference: 'Galateni 2:20',
        },
      },
    ],
  },
  {
    number: 4,
    presentedOn: '2026-09-27',
    families: [
      {
        id: 'bena-maria-mircea',
        surname: 'Bena',
        names: 'Maria și Mircea',
        children: ['Roxana', 'Emanuel', 'Damaris', 'Angel', 'Mircea', 'Ioan', 'Andreas', 'Iosua'],
        message: [
          'Dorința mea este ca Domnul să lase mântuire în toată familia și toți împreună să slujim Domnului din toată inima și toată viața.',
        ],
      },
      {
        id: 'bindea-dorel-ana',
        surname: 'Bindea',
        names: 'Dorel și Ana',
        children: ['David', 'Robert', 'Lucas', 'Samuel'],
        message: [
          'Ne dorim ca Dumnezeu să ne ajute să facem voia Lui, El să ne ferească de orice rău, să ne dea înțelepciune, sănătate, iar pacea lui Hristos să locuiască din belșug în inima și casa noastră.',
          'De asemenea, dorim ca Domnul să facă din copiii noștri niște slujitori ai Săi și cu toții să slujim Domnului pentru mântuirea și salvarea oamenilor.',
        ],
      },
      {
        id: 'biris-florin-anca',
        surname: 'Biriș',
        names: 'Florin și Anca',
        children: ['Sara', 'David'],
        message: [
          'Dorința noastră este ca Dumnezeu să lucreze în dreptul familiei noastre și să reverse peste noi înțelepciune, lumină, pricepere, mântuire și vindecare.',
        ],
        verse: {
          text: 'Mulțumiri fie aduse lui Dumnezeu, care ne dă biruința prin Domnul nostru Isus Hristos!',
          reference: '1 Corinteni 15:57',
        },
      },
      {
        id: 'birle-sebastian-maria',
        surname: 'Bîrle',
        names: 'Sebastian și Maria',
        children: ['Filip', 'Tania', 'Artur'],
        verse: {
          text: 'Binecuvântat să fie Domnul, care zilnic ne poartă povara, Dumnezeu, mântuirea noastră!',
          reference: 'Psalmul 68:19',
        },
      },
      {
        id: 'birle-otniel-cristina',
        surname: 'Bîrle',
        names: 'Otniel și Cristina',
        children: ['Elías', 'David'],
        message: [
          'Mulțumim Domnului pentru binecuvântările revărsate peste casa noastră!',
          'Bunul Dumnezeu să ne ajute să rămânem aproape de El, în ascultare și în împlinirea voii Lui în trăirea de zi cu zi.',
        ],
      },
    ],
  },
];
