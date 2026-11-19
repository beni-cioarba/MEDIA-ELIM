import type { Announcement } from '../church.config';

/**
 * Anunțuri: los avisos de la iglesia (web + una diapositiva cada uno).
 *
 * Se añaden, redactan y retiran según `docs/ai/35-announcements.md`. Cada
 * uno se ve hasta su `expiresOn` (incluido) y luego desaparece solo.
 * `npm run check` valida fechas, ids y ficheros (`scripts/check-content.mjs`).
 *
 * Fichero de **contenido**: lo edita quien publica. Los tipos están en
 * `core/church.config.ts`, que reúne todos los ficheros de `core/content/`
 * en `DEFAULT_CHURCH_CONFIG` (la app lo lee por el token `CHURCH_CONFIG`).
 */

// ---------------------------------------------------------------------
// Anunțuri. Reglas (detalle en `docs/ai/35-announcements.md`):
//  · `expiresOn` es el último día que se muestra; después desaparece solo.
//  · Título de una frase; `lead` de 1-2 frases (lo que se lee en voz alta).
//  · Máximo 3 `sections` y ~7 líneas por sección: en proyección cada
//    sección es una columna y todo tiene que leerse desde el fondo.
//  · Texto en rumano, revisado (diacríticos, «18:00» y no «18;OO»).
// ---------------------------------------------------------------------
export const ANNOUNCEMENTS: readonly Announcement[] = [
  /*
   * Semana de intercesión por el ministerio de música.
   *
   * El texto original llegó con erratas de tecleo (biserici→Bisericii,
   * jerfa→jertfă, los→lor, todeauna→totdeauna, «pe unul fie care»→«pe
   * fiecare», y el versículo entero sin diacríticos). Corregido y
   * estructurado: el aviso en el `lead`, a quién se ora y qué se pide en
   * dos listas, y el texto bíblico en su campo propio.
   */
  {
    id: 'mijlocire_slujirea_prin_cantare',
    title: 'Săptămână de rugăciune pentru slujirea prin cântare',
    lead: 'Săptămâna aceasta, Grupul de Mijlocire și Post stă în rugăciune și jertfă pentru cei ce ne slujesc prin cântare.',
    sections: [
      {
        heading: 'Îi aducem înaintea Domnului',
        kind: 'list',
        items: [
          { label: 'Corul' },
          { label: 'Fanfara' },
          { label: 'Grupurile de laudă' },
          { label: 'Dirijorii de cor și de fanfară' },
        ],
      },
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        items: [
          { label: 'Mult har în slujire' },
          { label: 'Duhul Sfânt să fie peste ei' },
          { label: 'Ungere proaspătă în tot ce slujesc' },
          { label: 'Binecuvântare peste ei și peste familiile lor' },
        ],
      },
    ],
    verse: {
      text: 'Voi înșivă ne veți ajuta cu rugăciunile voastre…',
      reference: '2 Corinteni 1:11',
    },
    publishedOn: '2026-09-26',
    // Cede el sitio el domingo 04/10 al de ordine, sunet și proiecție (pasa al archivo).
    expiresOn: '2026-10-03',
  },
  /*
   * Semana de intercesión por quienes sirven en el orden, el sonido, la
   * transmisión y la proyección (04/10 → 10/10).
   *
   * El original llegó sin diacríticos y con erratas (aducen→aducem,
   * sai→să-i, «Sta»→stă, pt→pentru, Duhul sau cel sfânt→Duhul Său cel
   * Sfânt). Misma estructura que la semana anterior: a quién se ora y qué
   * se pide en dos listas; la oración por la iglesia, al pie.
   */
  {
    id: 'mijlocire_ordine_sunet_proiectie',
    title: 'Săptămână de rugăciune pentru frații de la ordine, sunet și proiecție',
    lead: 'În săptămâna care ne stă în față îi aducem în rugăciune pe frații care ne slujesc în aceste lucrări.',
    sections: [
      {
        heading: 'Îi aducem înaintea Domnului',
        kind: 'list',
        items: [
          { label: 'Cei care slujesc la ordine în biserică' },
          { label: 'Cei de la amplificare și transmisia live' },
          { label: 'Cei care slujesc la videoproiector' },
        ],
      },
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        items: [
          { label: 'Binecuvântare pentru ei și familiile lor' },
          { label: 'Putere și înțelepciune' },
          { label: 'Lumină în slujire' },
        ],
      },
    ],
    footnote: 'Continuăm să ne rugăm pentru o înviorare în Biserica Elim, prin Duhul Sfânt.',
    publishedOn: '2026-10-04',
    expiresOn: '2026-10-10',
  },
  /*
   * Semana de intercesión por traducción, administración, recepción de
   * invitados y las hermanas que preparan los eventos (11/10 → 17/10).
   *
   * Erratas del original: «Dragi frații»→frați, acesta→aceasta, «traducere
   * ,cei»→«traducere, cei», oaspeți→oaspeților, «să le de»→dea,
   * familile→familiile, «pregătirea când sunt evenimente»→pregătirea
   * evenimentelor. Misma estructura que las semanas anteriores: a quién se
   * ora y qué se pide en dos listas, cada línea en un renglón (≤ 30
   * caracteres a lo ancho de media diapositiva: así el autoajuste crece en
   * vez de partir palabras sueltas). El original no trae nota ni versículo.
   */
  {
    id: 'mijlocire_traducere_administratie_primire',
    title: 'Săptămână de rugăciune pentru traducere, administrație și primire',
    lead: 'Dragi frați și surori, în săptămâna aceasta îi aducem în rugăciune pe cei care slujesc în aceste lucrări.',
    sections: [
      {
        heading: 'Îi aducem înaintea Domnului',
        kind: 'list',
        items: [
          { label: 'Cei de la traducere' },
          { label: 'Cei de la administrație' },
          { label: 'Cei de la primirea oaspeților' },
          { label: 'Surorile care se implică în pregătirea evenimentelor' },
        ],
      },
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        highlight: true,
        items: [
          { label: 'Domnul să îi binecuvânteze' },
          { label: 'Să le dea multă putere în slujire' },
          { label: 'Să binecuvânteze și familiile lor' },
        ],
      },
    ],
    publishedOn: '2026-10-11',
    expiresOn: '2026-10-17',
  },
  /*
   * Semana de intercesión por las dos familias de misioneros que la
   * iglesia sostiene económicamente (18/10 → 24/10).
   *
   * El original llegó sin diacríticos y con erratas (famili→familii,
   * sai→să-i, bunecuvanteze→binecuvânteze, vestí→vestească,
   * indeazneala→îndrăzneală). Misma estructura que las semanas anteriores;
   * como cada familia lleva su campo de misión, la lista es `people`
   * (familia en negrita · destino atenuado) en vez de las flechas del aviso.
   */
  {
    id: 'mijlocire_misionari',
    title: 'Săptămână de rugăciune pentru misionarii noștri',
    lead: 'În săptămâna aceasta stăm în rugăciune pentru cele două familii de misionari pe care Biserica noastră le susține financiar.',
    sections: [
      {
        heading: 'Îi aducem înaintea Domnului',
        kind: 'people',
        items: [
          { label: 'Familia Lețu', value: 'Mongolia' },
          { label: 'Familia Fahrodin', value: 'printre refugiații musulmani' },
        ],
      },
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        highlight: true,
        items: [
          { label: 'Domnul să îi binecuvânteze' },
          { label: 'Să le dăruiască multă putere' },
          { label: 'Să vestească Cuvântul cu îndrăzneală' },
          { label: 'Domnul să scoată mulți oameni la mântuire' },
        ],
      },
    ],
    publishedOn: '2026-10-18',
    expiresOn: '2026-10-24',
  },
  /*
   * Semana de intercesión por el tineret y sus líderes (25/10 → 31/10).
   *
   * Erratas del original: «,dorim» (coma suelta), «înțelepciune putere»
   * sin coma, «îi îmbrace cu duhul sfânt»→Duhul Sfânt, «lucrarea
   * domnului»→Domnului, «lideri de tineret»→liderii, «cu de amănuntul
   * călea»→«cu de-amănuntul calea», «tineri bisericii»→tinerii Bisericii.
   * Como el aviso pide cosas distintas para los jóvenes y para sus líderes,
   * las dos columnas son una por destinatario; la de los líderes, más
   * corta, va en `highlight` para no dejar hueco. La bendición final, al pie.
   */
  {
    id: 'mijlocire_tineret',
    title: 'Săptămână de rugăciune pentru tineretul bisericii',
    lead: 'În săptămâna aceasta stăm înaintea Domnului în rugăciune pentru tineretul casei Domnului.',
    sections: [
      {
        heading: 'Pentru tineri',
        kind: 'list',
        items: [
          { label: 'Înțelepciune, putere și sănătate' },
          { label: 'Să-i păzească de planurile celui rău' },
          { label: 'Să-i îmbrace cu Duhul Sfânt' },
          { label: 'Să fie folositori în lucrarea Domnului' },
        ],
      },
      {
        heading: 'Pentru liderii de tineret',
        kind: 'list',
        highlight: true,
        items: [
          { label: 'Înțelepciune și călăuzire' },
          // U+2060 (word joiner) tras el guion: «de-amănuntul» no se parte en dos renglones.
          { label: 'Să-i învețe cu de-⁠amănuntul calea Domnului' },
        ],
      },
    ],
    footnote: 'Domnul să binecuvânteze pe toți tinerii Bisericii Elim!',
    publishedOn: '2026-10-25',
    expiresOn: '2026-10-31',
  },
  /*
   * Semana de intercesión por los niños de la iglesia y los hermanos y
   * hermanas educadoras de los grupos (01/11 → 07/11).
   *
   * Erratas del original: «Multa»→Multă, «copii bisericii»→copiii,
   * «mintă»→minte, «binecuvinteze»→binecuvânteze, espacios antes de coma.
   * Como en la del tineret, una columna por destinatario; la de los
   * educadores en `highlight`. Los tres grupos van al pie (no son lo que se
   * pide, sino a quién) y el saludo final se omite. Se mantiene
   * «frații și surorile educatoare» del original: hay de los dos, más hermanas.
   */
  {
    id: 'mijlocire_copii_educatori',
    title: 'Săptămână de rugăciune pentru copiii bisericii',
    lead: 'În săptămâna aceasta aducem înaintea Domnului copiii bisericii și pe frații și surorile educatoare de la grupele de copii.',
    sections: [
      {
        heading: 'Pentru copii',
        kind: 'list',
        items: [
          { label: 'Creștere sănătoasă' },
          { label: 'Înțelepciune de sus și minte sănătoasă' },
          { label: 'Să-i păzească de planurile celui rău' },
          { label: 'Să facă să lumineze fața Lui peste ei' },
        ],
      },
      {
        heading: 'Pentru frații și surorile educatoare',
        kind: 'list',
        highlight: true,
        items: [
          { label: 'Multă răbdare și înțelepciune' },
          { label: 'Să-i învețe pe copii din Cuvântul sfânt' },
          { label: 'Răsplată pentru toată osteneala' },
          { label: 'Binecuvântare peste ei și familiile lor' },
        ],
      },
    ],
    footnote: 'Grupa mică · Grupa mijlocie · Grupa mare și adolescenți',
    publishedOn: '2026-11-01',
    expiresOn: '2026-11-07',
  },
  /*
   * Semana de intercesión por los departamentos de Ajutorare y Misiune
   * (08/11 → 14/11).
   *
   * Erratas del original: «pt»→pentru, «care le susțin»→«pe care le
   * susțin», «frați»→frații, espacios antes de coma. Mismo patrón que las
   * semanas anteriores: lo que se pide para los departamentos en una
   * columna y los hermanos en Uganda en `highlight`; la doxología al pie.
   */
  {
    id: 'mijlocire_ajutorare_misiune',
    title: 'Săptămână de rugăciune pentru Ajutorare și Misiune',
    lead: 'În săptămâna aceasta ne rugăm pentru frații din departamentul de Ajutorare și Misiune.',
    sections: [
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        items: [
          { label: 'Multă propășire în toate proiectele pe care le susțin și le realizează cu ajutorul Domnului și al Bisericii Elim' },
          { label: 'Călăuzire, înțelepciune și lumină de sus' },
          { label: 'Ungere sfântă și binecuvântare peste orice lucrare' },
        ],
      },
      {
        heading: 'Pentru frații în misiune',
        kind: 'list',
        highlight: true,
        items: [{ label: 'Domnul să-i binecuvânteze pe frații plecați în misiune în Uganda' }],
      },
    ],
    footnote: 'Numele Domnului să fie proslăvit în toate lucrurile!',
    publishedOn: '2026-11-08',
    expiresOn: '2026-11-14',
  },
  /*
   * Semana de intercesión por los candidatos al bautismo (15/11 → 21/11).
   *
   * Erratas del original: «pt»→pentru, «da a-l»→«de a-L», «care au
   * luat-o»→«pe care au luat-o», «ispita»→ispită. Mismo patrón que las
   * semanas anteriores: lo que se pide en una lista y la bendición al pie.
   * La segunda mención de «hotărârea care au luat-o» se acorta a «în
   * hotărârea lor» para no repetir la frase entera en dos líneas seguidas.
   */
  {
    id: 'mijlocire_candidati_botez',
    title: 'Săptămână de rugăciune pentru candidații la botez',
    lead: 'În săptămâna aceasta ne rugăm pentru candidații la botez.',
    sections: [
      {
        heading: 'Ce cerem pentru ei',
        kind: 'list',
        items: [
          { label: 'Multă biruință în hotărârea pe care au luat-o de a-L urma pe Dumnezeu' },
          { label: 'Putere de a birui orice piedică și ispită' },
          { label: 'Să rămână statornici în hotărârea lor până la capăt' },
        ],
      },
    ],
    footnote: 'Domnul să-i binecuvânteze!',
    publishedOn: '2026-11-15',
    expiresOn: '2026-11-21',
  },
  /*
   * Lanzamiento de Proiectul Împreună en la web (`/impreuna`,
   * docs/ai/32-impreuna.md). Redactado por la IA a petición del usuario
   * (11/11/2026), no llegó como aviso en bruto: revisar el tono antes de
   * leerlo. Dos domingos en pantalla (15 y 22/11); después la semana del
   * proyecto sigue proyectándose sola en su propio bloque, con QR.
   * Qué hacer en una columna y lo del teléfono en `highlight`; la cita de
   * Cornilescu (Psalmul 119:105) cortada con «…» por el límite de una línea.
   */
  {
    id: 'proiectul_impreuna',
    title: 'Proiectul Împreună: citim Biblia zi de zi',
    lead: 'Un text pe zi și o meditație video scurtă, împreună cu frații din tot Cultul Penticostal. Totul pe elimarganda.com/impreuna.',
    sections: [
      {
        heading: 'Cum îl urmezi',
        kind: 'list',
        items: [
          { label: 'Citește textul zilei: 5–10 minute' },
          { label: 'Urmărește meditația video a zilei' },
          { label: 'Bifează ce ai citit și vezi progresul' },
        ],
      },
      {
        heading: 'Pe telefon',
        kind: 'list',
        highlight: true,
        items: [
          { label: 'Calendar cu citirea zilnică, la 07:00' },
          { label: 'Planul în aplicația Biblia (YouVersion)' },
          { label: 'Fișa lunii, pentru tipar' },
        ],
      },
    ],
    footnote: 'Prima joi din fiecare lună: zi de post și rugăciune.',
    verse: {
      text: 'Cuvântul Tău este o candelă pentru picioarele mele…',
      reference: 'Psalmul 119:105',
    },
    // Fuera de la presentación a petición del usuario (15/11/2026): se
    // queda sólo en la web.
    webOnly: true,
    expiresOn: '2026-11-22',
  },
  {
    id: 'aniversare_25_ani',
    title: 'Sărbătoare: 25 de ani de la înființarea Bisericii Elim',
    date: '2026-10-18',
    time: '10:00',
    place: 'Biserica Elim · masă festivă la restaurantul Oma Bodas, Arganda del Rey',
    lead:
      'Continuăm sărbătoarea și la masă. Înscrierea este necesară pentru fiecare loc, inclusiv pentru copiii mici care au nevoie de scaun lângă părinți.',
    sections: [
      {
        heading: 'Meniu',
        kind: 'prices',
        items: [
          { label: 'Adult', value: '26 €' },
          { label: 'Copil sub 10 ani', value: '13 €' },
          {
            label: 'Copil sub 4 ani',
            value: 'gratuit',
            note: 'fără meniu; cu meniu 13 €. Se înscrie dacă are nevoie de loc.',
          },
        ],
      },
      {
        heading: 'Înscrieri la frații',
        kind: 'people',
        items: [
          { label: 'Halas Petrică' },
          { label: 'Sidor Ionel' },
          { label: 'Bogdan Samuel' },
          { label: 'Șanta Pavel' },
          { label: 'Vasile Vălean' },
          { label: 'Silviu Dobre' },
          { label: 'Aurel Burdeț' },
        ],
      },
      {
        heading: 'Vor fi împreună cu noi',
        kind: 'people',
        // Se proyecta entero (petición del usuario, 03/10/2026): en la
        // segunda diapositiva, con la nota del mensaje principal. La 1/2
        // queda para lo práctico (menú e inscripciones).
        part: 2,
        items: [
          { label: 'Pastor Gavrilă Zăgrean', value: 'cu sora Ana' },
          { label: 'Pastor Mircea Coptil', value: 'cu soția' },
          { label: 'Prezbiter Adrian Mureșan', value: 'cu soția' },
          { label: 'Prezbiter Nicu Răducanu' },
          { label: 'Prezbiter Ioan Șuiu', value: 'cu Maria' },
          { label: 'Prezbiter Daniel Oros', value: 'cu Camelia' },
          { label: 'Diacon Dan Cifor', value: 'cu Dana' },
        ],
      },
    ],
    footnote:
      'Mesajul de bază: pastorul Simion Bumbar, secretarul Cultului Creștin Penticostal din România.',
    expiresOn: '2026-10-18',
  },
  {
    id: 'ancorat_2026',
    title: 'Conferință de tineret "ANCORAT"',
    date: '2026-09-26',
    time: '18:00',
    place: 'Biserica Elim',
    lead: '',
    sections: [
      {
        heading: 'Invitat',
        kind: 'people',
        items: [{ label: 'Daniel Popa', value: 'Timișoara' }],
      },
      {
        heading: 'Program',
        kind: 'schedule',
        items: [
          { label: 'Sâmbătă 26 septembrie, 18:00', value: 'Mesaj, apoi întrebări și răspunsuri' },
          { label: 'Duminică 27 septembrie, 10:00 & 18:00', value: 'Evanghelizare cu fratele Daniel Popa' },
        ],
      },
    ],
    expiresOn: '2026-09-26',
  },
];
