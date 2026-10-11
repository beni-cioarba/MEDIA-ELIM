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
  /**
   * Ajustes manuales de la foto. **Sólo para una foto que se sale de lo
   * normal**; lo demás lo resuelve la ficha sola con la proporción real.
   */
  readonly photo?: PrayerPhotoOverride;
}

/** Tamaño de la foto en la ficha web: `compact` si el texto es largo, `large` si la foto manda. */
export type PrayerPhotoSize = 'compact' | 'normal' | 'large';

/** Ajustes manuales de la foto de una familia (ver `PrayerFamily.photo`). */
export interface PrayerPhotoOverride {
  /**
   * Proporción del marco (ancho / alto), p. ej. `0.8` para 4:5. Para una
   * foto con dimensiones imposibles (una tira panorámica, una captura de
   * móvil muy alargada): la foto se ve entera dentro del marco y el hueco lo
   * rellena ella misma difuminada.
   */
  readonly frame?: number;
  /** Tamaño de la foto en la ficha web. */
  readonly size?: PrayerPhotoSize;
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
  {
    number: 5,
    presentedOn: '2026-10-04',
    families: [
      {
        id: 'biroveti-claudiu-claudia',
        surname: 'Biroveti',
        names: 'Claudiu și Claudia',
        children: ['Lucas', 'Marcos'],
        message: [
          'Mulțumim lui Dumnezeu pentru harul Său și pentru toate binecuvântările revărsate peste noi.',
          'Dorim ca El să ne poarte în carul Lui de biruință și să-I rămânem credincioși în orice vreme.',
          'Vă mulțumim pentru toată dăruirea, pentru susținerea în rugăciune, și Domnul să lase mare îndurare de sus peste familia noastră. Domnul să ne asculte!',
        ],
      },
      {
        id: 'biru-ioan-felicia',
        surname: 'Biru',
        names: 'Ioan și Felicia',
        message: [
          'Mulțumim Domnului pentru toate binecuvântările primite din mâna Lui.',
          'Rugămintea noastră este ca Domnul să lase îndurare peste cei 3 copii ai noștri, însă în mod special peste unul dintre ei, cu numele de Radu, ca Domnul să lase mântuire în viața lui.',
          'Mulțumim Bisericii Elim pentru toată susținerea în rugăciune, și Domnul să ne asculte!',
        ],
        verse: {
          text: 'Pot totul în Hristos, care mă întărește.',
          reference: 'Filipeni 4:13',
        },
      },
      {
        id: 'blaj-lucia',
        surname: 'Blaj',
        names: 'Lucia',
        single: true,
        message: [
          'Dorința mea e ca Dumnezeu să mă ajute să fiu lumină oriunde, oricând și în orice loc.',
          'Așa să mă ajute Dumnezeu!',
        ],
      },
      {
        id: 'bloch-elena-liliana',
        surname: 'Bloch',
        names: 'Elena Liliana',
        single: true,
        message: [
          'Dumnezeu să lase mare îndurare peste casa mea și peste toți copiii noștri.',
          'Domnul poate! El poate ridica povara și să fie cu cel împovărat. El poate da odihnă sufletească.',
          'Dumnezeu să binecuvânteze întreaga Biserică Elim și să se îndure de toți copiii noștri!',
        ],
      },
      {
        id: 'bodnariu-petrica-luminita',
        surname: 'Bodnariu',
        names: 'Petrică și Luminița',
        children: ['Bianca', 'Debora', 'Lucas', 'Mateo'],
        message: [
          'Dorința familiei noastre este ca să slujim Domnului cu scumpătate și într-o zi toată familia să fim în Împărăția cerurilor!',
        ],
        verse: {
          text: 'Cât despre mine, eu și casa mea vom sluji Domnului.',
          reference: 'Iosua 24:15',
        },
      },
    ],
  },
  {
    number: 6,
    presentedOn: '2026-10-11',
    families: [
      {
        id: 'bogdan-samuel-naomi',
        surname: 'Bogdan',
        names: 'Samuel și Naomi',
        message: [
          'Dorința noastră este ca Dumnezeu să ne dea înțelepciune, lumină, călăuzire în toate aspectele vieții și mult har în slujire.',
          'El să binecuvânteze familia noastră în toate lucrurile și mâna Lui să ne ocrotească totdeauna.',
        ],
      },
      {
        id: 'bolbos-alex-monica',
        surname: 'Bolbos',
        names: 'Alex și Mónica',
        children: ['Nathanael'],
        message: [
          'Mulțumim lui Dumnezeu pentru fiecare binecuvântare, pentru dragostea Sa și pentru că ne ocrotește în fiecare zi.',
          'Suntem recunoscători Domnului pentru tot și toate!',
          'Toată slava și cinstea să fie a Domnului nostru!',
        ],
        verse: {
          text: 'Mulțumiți lui Dumnezeu pentru toate lucrurile; căci aceasta este voia lui Dumnezeu, în Hristos Isus, cu privire la voi.',
          reference: '1 Tesaloniceni 5:18',
        },
      },
      {
        id: 'bolfa-silviu-valeria',
        surname: 'Bolfă',
        names: 'Silviu și Valeria',
        children: ['Sara', 'Daniel', 'Marta', 'David', 'Maria'],
        message: [
          'Dorința noastră de familie este de a ne apropia tot mai mult de Domnul, de a fi credincioși față de marea Sa îndurare și toată familia să aducem roadă pentru gloria Domnului!',
        ],
      },
      {
        id: 'bontas-dorut-saveta',
        surname: 'Bontaș',
        names: 'Doruț și Saveta',
        message: [
          'Mulțumim lui Dumnezeu pentru toată familia pe care am primit-o de la Domnul, atât copii, cât și nepoți.',
          'Dorința noastră este ca Dumnezeu să ne umple de dragoste, pace, bucurie și putere să-L slujim pe El în fiecare zi și să fim călăuziți de Duhul Domnului!',
        ],
      },
      {
        id: 'bosancu-beniamin',
        surname: 'Bosancu',
        names: 'Beniamin',
        single: true,
        children: ['David'],
        message: [
          'Dorința mea este ca Domnul să-mi dea o inimă bună, El să lucreze la inima lui David ca să-L cunoască personal pe Dumnezeu și Domnul să strălucească prin viața noastră.',
        ],
      },
    ],
  },
];
