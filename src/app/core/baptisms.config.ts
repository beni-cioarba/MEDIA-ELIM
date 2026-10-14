/**
 * BOTEZURI — registro de los bautismos de la iglesia y de sus candidatos
 * =====================================================================
 *
 * Única fuente del módulo `/botezuri` (portada, registro cronológico,
 * carrusel de candidatos y perfil de cada uno). Docs: `docs/ai/34-baptisms.md`.
 *
 * Reglas:
 *  · **Una entrada por botez**, en **orden cronológico** (el más antiguo
 *    primero). El ordinal («Botezul #4») sale de la posición: no se escribe.
 *  · `date` (`YYYY-MM-DD`) es el identificador y la URL
 *    (`/botezuri/2023-06-11`). Si es **futura**, el botez es «el próximo»:
 *    la portada del módulo lo anuncia con cuenta atrás. No hay estado que
 *    mantener: pasa a ser historia solo al llegar el día.
 *  · Cada candidato: `id` (= nombre del retrato importado), nombre tal como
 *    se presentó, y lo que se sepa (`origin` y `age` se guardan pero NO se
 *    publican: son datos internos). Nada se rellena: sin dato, no se pinta.
 *  · `story` es el perfil ampliado (testimonio, versículo), **opcional** y
 *    tal cual lo entregue la persona, como las biografías de `conducere`.
 *  · `youtubeId` + `ministers`: el directo del servicio y quién predicó
 *    (del título del vídeo en el canal; ver la receta en el doc).
 *  · Un botez sin lista todavía (`candidates: []`) sale en el registro con
 *    su foto de grupo y el enlace a las fotos, sin rejilla.
 *
 * Retratos: `node scripts/import-baptism-photos.mjs "<carpeta>" <fecha>`
 * (4:5, mismo encuadre para todos; ver el script).
 *
 * Privacidad: hay menores. Las rutas van con `noindex` (se comparten por
 * enlace, no salen en buscadores), como «Rugăciune pentru familii».
 */

/** Perfil ampliado de un candidato: todo opcional, se pinta lo que haya. */
export interface CandidateStory {
  /** Una frase del propio testimonio (sin reescribir): cita destacada del perfil. */
  readonly summary?: string;
  /** Testimonio, un párrafo por elemento. */
  readonly testimony?: readonly string[];
  /** Versículo que eligió para su botez. */
  readonly verse?: { readonly text: string; readonly ref: string };
  /**
   * Segundo del directo del botez (`youtubeId`) en que empieza su mărturie:
   * el perfil enlaza a ese momento («Ascultă mărturia»).
   */
  readonly at?: number;
}

export interface BaptismCandidate {
  /** Slug único dentro del botez; nombre del retrato (`<id>-640.webp`). */
  readonly id: string;
  /** Nombre y apellidos, como se presentó a la iglesia. */
  readonly name: string;
  /**
   * Edad el día del botez. **Dato interno: no se muestra en la web**
   * (decisión del 14/10/2026). Se guarda cuando se tiene, sin más.
   */
  readonly age?: number;
  /**
   * De dónde es (ciudad de origen · dónde vive, si se dio). **Dato interno:
   * no se publica** en ninguna ficha (14/10/2026, decisión del usuario).
   */
  readonly origin?: string;
  /** Padres, como los nombra la presentación («Remus și Lavinia»). */
  readonly parents?: string;
  readonly story?: CandidateStory;
}

/** Foto de grupo del botez (la de la galería de Media, si la hay). */
export interface BaptismCover {
  readonly image: string;
  readonly medium: string;
  readonly thumb: string;
  /** Color medio de la foto (fondo mientras carga). */
  readonly tone: string;
}

export interface Baptism {
  /** `YYYY-MM-DD`: identificador, URL y orden. */
  readonly date: string;
  /** Hora del servicio (`10:00`), si se conoce: la usa el anuncio del próximo. */
  readonly time?: string;
  readonly cover?: BaptismCover;
  /**
   * Subcarpeta pública de Drive con las fotos del día. Sólo el ID; la URL la
   * construye `driveFolderUrl()` (igual que la galería).
   */
  readonly driveFolderId?: string;
  /**
   * Transmisión del servicio en el canal de la iglesia: sólo el ID del vídeo
   * (`youtube.com/watch?v=<id>`). Los directos empiezan en nov. 2021.
   */
  readonly youtubeId?: string;
  /** Quién predicó / slujitori invitados, tal como lo dice el título del directo. */
  readonly ministers?: readonly string[];
  readonly candidates: readonly BaptismCandidate[];
}

export const BAPTISMS: readonly Baptism[] = [
  {
    date: '2020-07-23',
    // Sin edades ni procedencia en la presentación.
    candidates: [
      { id: 'bea-tomoioaga', name: 'Bea Tomoioaga' },
      { id: 'rebeca-mocan', name: 'Rebeca Mocan' },
      { id: 'dorina-mitache', name: 'Dorina Mitache' },
      { id: 'denisa-marcu', name: 'Denisa Marcu' },
      { id: 'denisa-toma', name: 'Denisa Toma' },
      { id: 'maria-toma', name: 'Maria Toma' },
      { id: 'lidia-haprian', name: 'Lidia Haprian' },
      { id: 'iulia-lusca', name: 'Iulia Lusca' },
      { id: 'samuel-lusca', name: 'Samuel Lusca' },
      { id: 'ruben-toderic', name: 'Ruben Toderic' },
      { id: 'daniel-pop', name: 'Daniel Pop' },
    ],
  },
  {
    date: '2021-10-18',
    candidates: [
      { id: 'andrei-iasciuc', name: 'Andrei Iasciuc', age: 31 },
      { id: 'andres-tomoiaga', name: 'Andrés Tomoiaga', age: 19 },
      { id: 'samuel-calini', name: 'Samuel Calini', age: 19 },
      { id: 'marta-zagrean', name: 'Marta Zagrean', age: 16 },
      { id: 'luca-marc', name: 'Luca Marc', age: 16 },
      { id: 'alexandru-ioan-fratila', name: 'Alexandru Ioan Fratila', age: 32 },
    ],
  },
  {
    date: '2021-11-28',
    youtubeId: 'grXGFevqzm8',
    // Fotos originales con el nombre impreso al lado: se borró al importarlas.
    candidates: [
      { id: 'patricia-marcu', name: 'Patricia Marcu', age: 16, origin: 'Botoșani' },
      { id: 'marta-bahmata', name: 'Marta Bahmata', age: 17, origin: 'Pitești' },
      { id: 'rut-mocan', name: 'Rut Mocan', age: 15, origin: 'Timișoara' },
      { id: 'eunice-tomoiaga', name: 'Eunice Tomoiaga', age: 16, origin: 'Bistrița' },
      { id: 'amelia-valean', name: 'Amelia Valean', age: 18, origin: 'Bistrița' },
      { id: 'ruben-mocan', name: 'Ruben Mocan', age: 17, origin: 'Timișoara' },
    ],
  },
  {
    date: '2022-10-23',
    youtubeId: 'RypOL82vbpw',
    ministers: ['Cristi Boariu', 'Frații Strugariu'],
    // Fotos originales a 3000 px (mejores que las de la presentación).
    candidates: [
      { id: 'david-copran', name: 'David Copran', age: 18, origin: 'Bistrița' },
      { id: 'radu-albu', name: 'Radu Albu', age: 20, origin: 'Bistrița' },
      { id: 'timotei-rus', name: 'Timotei Rus', age: 21, origin: 'Zalău' },
      { id: 'cristina-toma', name: 'Cristina Toma', age: 17, origin: 'Reșița' },
      { id: 'rebeca-bahmata', name: 'Rebeca Bahmata', age: 20, origin: 'Pitești' },
      { id: 'damaris-federiga', name: 'Damaris Federiga', age: 17, origin: 'Dej' },
    ],
  },
  {
    date: '2023-06-11',
    youtubeId: 'uxTYRbOiSnU',
    ministers: ['Mihai Dumitrașcu'],
    candidates: [
      { id: 'natalia-cuth', name: 'Natalia Cuth', age: 17, origin: 'Arganda del Rey' },
      { id: 'naomi-valean', name: 'Naomi Valean', age: 15, origin: 'Arganda del Rey' },
      { id: 'noemi-toader', name: 'Noemi Toader', age: 15, origin: 'Arganda del Rey' },
      { id: 'david-pintilei', name: 'David Pintilei', age: 16, origin: 'Arganda del Rey' },
      { id: 'david-emanuel-tomoioaga', name: 'David Emanuel Tomoioaga', age: 18, origin: 'Arganda del Rey' },
      { id: 'luis-sebastian-marc', name: 'Luis Sebastian Marc', age: 17, origin: 'Arganda del Rey' },
      { id: 'gheorghe-fat', name: 'Gheorghe Fat', age: 46, origin: 'Baia Mare' },
      { id: 'darius-gaita', name: 'Darius Gaita', age: 24, origin: 'Arganda del Rey' },
      { id: 'daniel-neftali-handolescu', name: 'Daniel Neftali Handolescu', age: 19, origin: 'Arganda del Rey' },
    ],
  },
  {
    date: '2023-12-10',
    youtubeId: 'IT3YdFDJOMg',
    candidates: [
      { id: 'kevin-mitoseriu', name: 'Kevin Mitoseriu', age: 16, origin: 'Arganda del Rey' },
      { id: 'david-neag', name: 'David Neag', age: 16, origin: 'Arganda del Rey' },
      { id: 'adriana-runcan', name: 'Adriana Runcan', age: 26, origin: 'Bistrița' },
      { id: 'darius-runcan', name: 'Darius Runcan', age: 28, origin: 'Bistrița' },
      { id: 'gabriel-bogdan-hristea', name: 'Gabriel Bogdan Hristea', age: 38, origin: 'Timișoara · Talavera' },
      { id: 'ioana-dumitrean', name: 'Ioana Dumitrean', age: 36, origin: 'Bistrița' },
      { id: 'florin-daniel-pirgu', name: 'Florin Daniel Pirgu', age: 34, origin: 'Timișoara · Campo Real' },
    ],
  },
  {
    date: '2024-06-16',
    youtubeId: 'Gk0FxQ5viq8',
    candidates: [
      { id: 'nela-ispas', name: 'Nela Ispas', age: 30 },
      { id: 'amalia-bosancu', name: 'Amalia Bosancu', age: 16 },
      { id: 'ioana-crisan', name: 'Ioana Crisan', age: 41 },
      { id: 'costina-amelia-dumitrescu', name: 'Costina Amelia Dumitrescu', age: 31 },
      { id: 'ana-maria-varga', name: 'Ana Maria Varga', age: 29 },
      { id: 'iosua-bena', name: 'Iosua Bena', age: 27 },
      { id: 'elena-liliana', name: 'Elena Liliana', age: 56 },
      { id: 'mircea-daniel-trandafir', name: 'Mircea Daniel Trandafir', age: 36 },
    ],
  },
  {
    date: '2025-05-25',
    youtubeId: 'B5-HdGNV2lI',
    ministers: ['Adi Mocan', 'Adi Kovaci'],
    // Fotos originales (las de la presentación iban recortadas). Perfiles
    // (14/10/2026) de las mărturii grabadas que sonaron en el directo, desde
    // la transcripción automática (`yt-dlp --write-auto-subs`), corregida:
    // nombre y edad dichos al inicio se quitan (la edad no se publica);
    // las dichas en español (Nereea Marcu, Sara Toth) se publican traducidas
    // al rumano, como todo el contenido (la app las traduce);
    // padres confirmados con la presentación del pastor (≈ 0:57).
    // `at` = segundo del directo en que empieza cada mărturie.
    candidates: [
      {
        id: 'nereea-marcu',
        name: 'Nereea Marcu',
        age: 15,
        parents: 'Doru și Emanuela',
        story: {
          at: 9917, // 2:45:17
          summary: 'Astăzi eu sunt cea care face acest pas în mod conștient, înțelegând că botezul simbolizează începutul unei vieți noi în Hristos.',
          testimony: [
            'În această zi atât de specială am luat hotărârea de a mă boteza, ca un act de credință și ascultare față de Domnul nostru Isus Hristos. Această hotărâre se naște din dorința mea profundă de a-I preda viața lui Dumnezeu și de a umbla după voia Lui.',
            'Vin dintr-o familie creștină penticostală și sunt fiica lui Doru și a Emanuelei Marcu. De mică am învățat valoarea credinței, a rugăciunii și a Cuvântului lui Dumnezeu. Totuși, astăzi eu sunt cea care face acest pas în mod conștient, înțelegând că botezul simbolizează începutul unei vieți noi în Hristos.',
            'Îi mulțumesc Domnului pentru dragostea Lui, pentru că m-a chemat și pentru că mi-a dat ocazia de a face parte din Biserica Lui. Astăzi mă angajez să-L urmez, să-L slujesc și să trăiesc călăuzită de Duhul Său cel Sfânt în toate zilele vieții mele. Amin.',
          ],
        },
      },
      {
        id: 'noemi-halas',
        name: 'Noemi Halas',
        parents: 'Petrică și Lidia',
        story: {
          at: 10035, // 2:47:15
          summary: 'Simt că acum e timpul să fac acest pas, să las în urmă viața dinainte și să încep un drum nou cu Dumnezeu.',
          testimony: [
            'Am ales să mă botez pentru că vreau să-L urmez pe Domnul Isus din toată inima. M-am născut într-o familie penticostală — părinții mei sunt Petrică și Lidia Halas — și am crescut în biserică, unde am învățat despre dragostea și puterea lui Dumnezeu.',
            'Simt că acum e timpul să fac acest pas, să las în urmă viața dinainte și să încep un drum nou cu Dumnezeu, călăuzit de Duhul Sfânt. Vreau să trăiesc pentru El și să cresc în credință împreună cu biserica aceasta. Amin.',
          ],
          verse: {
            text: 'Pocăiți-vă și fiecare din voi să fie botezat în Numele lui Isus Hristos, spre iertarea păcatelor voastre; apoi veți primi darul Sfântului Duh.',
            ref: 'Faptele Apostolilor 2:38',
          },
        },
      },
      {
        id: 'sara-toth',
        name: 'Sara Toth',
        age: 16,
        parents: 'Zoltan și Paraschiva',
        story: {
          at: 10212, // 2:50:12
          summary: 'În anul 2023, într-o seară de rugăciune, am avut binecuvântarea de a-L primi pe Domnul Isus în inima mea.',
          testimony: [
            'Vin dintr-o familie care Îl iubește pe Dumnezeu și ascultă de El; părinții mei sunt Zoltan și Paraschiva Toth. De mică am crescut în credință, dar în anul 2023, într-o seară de rugăciune, am avut binecuvântarea de a-L primi pe Domnul Isus în inima mea. A fost un moment special, care mi-a schimbat viața.',
            'După aceea, Domnul m-a cercetat și mi-a dat Duhul Sfânt, care mă întărește și mă călăuzește până astăzi. De atunci simt tot mai mult dragostea și puterea lui Dumnezeu în viața mea de zi cu zi.',
            'Astăzi am hotărât să închei un legământ cu Dumnezeu prin botez, ca semn public că Îl voi urma și Îi voi fi credincioasă în toate zilele vieții mele. Amin.',
          ],
        },
      },
      {
        id: 'ester-zagrean',
        name: 'Ester Zăgrean',
        age: 19,
        parents: 'Mihai și Emanuela',
        story: {
          at: 10322, // 2:52:02
          summary: 'Am hotărât să-L urmez pe Isus din toată inima mea, toată viața mea, și înapoi eu nu voi da.',
          testimony: [
            'Vin dintr-o familie creștină și de mică am crescut într-o biserică penticostală. Părinții mei sunt Mihai și Emanuela Zăgrean.',
            'Schimbarea în viața mea a început în martie 2023. A fost momentul în care am înțeles că viața mea fără Dumnezeu n-are niciun sens: totul este gol și deșertăciune fără El. Am înțeles că Isus a venit pe pământ ca să mă salveze de o viață fără El.',
            'În noiembrie 2023 am fost botezată cu Duhul Sfânt și sunt mulțumitoare Domnului pentru tot harul pe care mi l-a acordat și mi-l dăruiește în fiecare zi.',
            'De aceea am hotărât să mărturisesc înaintea martorilor văzuți și nevăzuți legământul pe care l-am făcut cu Dumnezeu. Am hotărât să-L urmez pe Isus din toată inima mea, toată viața mea, și înapoi eu nu voi da. Amin.',
          ],
        },
      },
      {
        id: 'sara-gherasim',
        name: 'Sara Gherasim',
        age: 16,
        parents: 'Bogdan și Adriana',
        story: {
          at: 10463, // 2:54:23
          summary: 'M-a iubit mereu, chiar și atunci când eu nu-L căutam.',
          testimony: [
            'M-am născut și am crescut într-o familie care Îl iubește pe Dumnezeu. De mică am mers la biserică cu părinții mei și am știut că Dumnezeu este real.',
            'La vârsta de 14 ani am avut un moment special în care L-am simțit aproape și am început să construiesc o relație personală cu El. În acești doi ani, Dumnezeu mi-a arătat dragostea Lui în fiecare zi. M-a iubit mereu, chiar și atunci când eu nu-L căutam.',
            'De aceea acum vreau să fac legământ cu El prin botez. Amin.',
          ],
          verse: {
            text: 'Cine va crede și se va boteza va fi mântuit.',
            ref: 'Marcu 16:16',
          },
        },
      },
      {
        id: 'maria-ciobanu',
        name: 'Maria Ciobanu',
        age: 34,
        story: {
          at: 10569, // 2:56:09
          summary: 'El ne acceptă așa cum suntem noi și face din noi o făptură nouă.',
          testimony: [
            'Provin dintr-o familie de ortodocși. Soțul meu este Oleg Ciobanu. Dumnezeu mi-a vegheat pașii încă din fragedă copilărie. Cu doi ani în urmă mi-a dăruit o mărturie vie, exact în căminul meu, că El există și că poate schimba inimi.',
            'Și totuși, aceasta nu a fost de ajuns până în ziua când, fără să-mi dau seama, L-am pus pe Dumnezeu la încercare, făcând o juruință care știam că nu poate deveni realitate în timpul apropiat. Dar bunul Dumnezeu a schimbat totul, așa cum nici nu m-am așteptat, și mi-a demonstrat că planurile noastre nu coincid cu ale Lui.',
            'Într-o minunată zi, pragul casei noastre l-au pășit doi oameni minunați și atunci am decis să-L urmez pe Domnul cu toată ființa mea, să deschid o filă nouă în viața mea alături de Tine, Domnul meu. În acea noapte, prin harul Domnului, am avut un vis în care Dumnezeu mi-a arătat cu desăvârșire că pe El trebuie să-L urmez, că El ne acceptă așa cum suntem noi și face din noi o făptură nouă. Amin.',
          ],
          verse: {
            text: 'Căci, dacă este cineva în Hristos, este o făptură nouă. Cele vechi s-au dus: iată că toate lucrurile s-au făcut noi.',
            ref: '2 Corinteni 5:17',
          },
        },
      },
      {
        id: 'maria-carp',
        name: 'Maria Carp',
        age: 55,
        origin: 'Moldova',
        story: {
          at: 10775, // 2:59:35
          summary: 'Când am auzit Cuvântul lui Dumnezeu, mi-a străpuns inima.',
          testimony: [
            'Provin dintr-o familie de ortodocși. Când am auzit Cuvântul lui Dumnezeu, mi-a străpuns inima.',
            'După câțiva ani buni de încercări, Dumnezeu mi-a pregătit calea și am ajuns la copiii mei aici, în Biserica Elim. Domnul Isus mi-a pus pe inimă să-L urmez, să încep un drum nou cu Dumnezeu. Amin.',
          ],
        },
      },
      {
        id: 'andres-sidor',
        name: 'Andres Sidor',
        age: 20,
        parents: 'Ionel și Lavinia',
        story: {
          at: 10864, // 3:01:04
          summary: 'Nu fac acest pas din datorie, ci din convingere și recunoștință.',
          testimony: [
            'Am ales să închei legământ cu Domnul în apa botezului pentru că am fost cercetat profund de Duhul Sfânt într-o seară, în urma unui mesaj care mi-a atins inima. Atunci am realizat cât de mult mă iubește Dumnezeu și cât de goală era viața mea fără El.',
            'Acea întâlnire personală cu prezența Domnului m-a determinat să mă pocăiesc sincer și să renunț la păcat. Nu fac acest pas din datorie, ci din convingere și recunoștință.',
            'Vreau să trăiesc curat, după voia Lui, și să fiu o lumină în lumea în care trăiesc. Aleg să fiu botezat pentru că Îl iubesc pe Hristos și vreau ca întreaga mea viață să-I aparțină. Amin.',
          ],
        },
      },
      {
        id: 'natanael-filimon',
        name: 'Natanael Filimon',
        age: 18,
        parents: 'Gabriel și Lenuța',
        story: {
          at: 10988, // 3:03:08
          summary: 'Îmi încredințez soarta în mâna Domnului și știu că El va lucra.',
          testimony: [
            'Vin dintr-o familie de creștini. Am ales a încheia legământ cu Domnul Isus în apă. Decizia de a mă boteza am luat-o anul trecut și am ales să urmez calea lui Hristos.',
            'Am lăsat lumea în urmă și am început transformarea vieții mele și apropierea mea de Dumnezeu. Decizia mea este să-L urmez pe El până la sfârșitul vieții. Îmi încredințez soarta în mâna Domnului și știu că El va lucra. Amin.',
          ],
        },
      },
      {
        id: 'gabriel-cetanas',
        name: 'Gabriel Cetanas',
        age: 42,
        story: {
          at: 11069, // 3:04:29
          summary: 'Doresc ca Domnul să mă ajute să slujesc cât mai mult.',
          testimony: [
            'Provin dintr-o familie de ortodocși și m-am hotărât să-L urmez pe Domnul Isus Hristos prin credință și astăzi să închei un legământ prin apa botezului.',
            'Am luat această decizie după ce, în anul 2023, Dumnezeu, prin harul Său, mi-a vorbit într-un vis de descoperire asupra evenimentelor viitoare din viața mea. Apoi a urmat o transformare spre pocăință și credință în Isus Hristos. Doresc ca Domnul să mă ajute să slujesc cât mai mult. Amin.',
          ],
        },
      },
    ],
  },
  {
    date: '2025-11-30',
    youtubeId: 'mo_9HFVg7-E',
    ministers: ['Gabi Zăgrean', 'Alin Jucu'],
    cover: {
      image: 'assets/drive-media/botez_2025.webp',
      medium: 'assets/drive-media/botez_2025-960.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
      tone: '#91979f',
    },
    // Drive: «BOTEZ 2025-11-30»
    driveFolderId: '1neyEzyRpK9wnlSJ4cXp_JMi7jlu5lNfU',
    // Presentación «BOTEZ 2025-11-30 CANDIDATI.pptx» con perfil completo
    // (testimonio, edad, padres y, a veces, versículo); sin ciudades.
    // Fotos: las de la presentación; la de Andrea Sidor, de IMAGINI (mayor).
    candidates: [
      {
        id: 'andrea-sidor',
        name: 'Andrea Sidor',
        age: 20,
        parents: 'Ionel și Lavinia',
        story: {
          summary: 'Astăzi mărturisesc public că Isus Hristos este Domnul meu și aleg să-L urmez în fiecare zi.',
          testimony: [
            'Provin dintr-o familie de credincioși care întotdeauna m-au învățat să-L caut pe Domnul și să mă încred în El. De mică am văzut credința părinților mei și rugăciunile lor pentru mine.',
            'Au fost momente în viața mea în care m-am îndepărtat sau nu am înțeles pe deplin voia Lui, dar Dumnezeu m-a chemat înapoi și mi-a arătat harul și dragostea Lui. Momentul deciziei mele a fost atunci când am realizat că Domnul m-a schimbat și a lucrat în viața mea mai mult decât meritam. În acel moment am simțit clar chemarea Lui și am ales să-mi predau viața în mâna Sa.',
            'Astăzi mărturisesc public că Isus Hristos este Domnul meu și aleg să-L urmez în fiecare zi. Căci o viață fără El este o viață fără scop. Amin.',
          ],
        },
      },
      {
        id: 'noelia-valean',
        name: 'Noelia Vălean',
        age: 19,
        parents: 'Vasile și Ana',
        story: {
          summary: 'În copilărie am crezut în Dumnezeu pentru că așa m-au învățat, dar cu trecerea timpului am înțeles că trebuie să-L caut eu însămi.',
          testimony: [
            'Am avut binecuvântarea de a mă naște într-o familie credincioasă și, încă de foarte mică, părinții m-au dus la biserică și mi-au vorbit despre Dumnezeu și despre minunile Lui.',
            'În copilărie am crezut în Dumnezeu pentru că așa m-au învățat, dar cu trecerea timpului am înțeles că trebuie să-L caut eu însămi. Atunci, în inima mea s-a născut dorința de a mă apropia de El și de a avea o relație personală cu El.',
            'Dumnezeu mi-a ascultat rugăciunile și m-a botezat cu Duhul Sfânt. Din acel moment am simțit în interiorul meu o bucurie profundă și o pace pe care nu o mai simțisem până atunci.',
            'Astăzi vreau să declar public această experiență și Îi mulțumesc lui Dumnezeu pentru această zi atât de specială, în care îmi confirm și înaintea cerului angajamentul de a-L sluji până la sfârșit. Amin.',
          ],
        },
      },
      {
        id: 'maria-florina-tomoiaga',
        name: 'Maria Florina Tomoiagă',
        age: 19,
        parents: 'Gheorghe și Floarea',
        story: {
          summary: 'Schimbarea mea nu vine din meritul meu, ci din harul Lui.',
          testimony: [
            'Provin dintr-o familie creștină și încă de mică am crescut în Biserica Elim. Decizia de a mă boteza am luat-o acum câteva luni.',
            'Atunci treceam printr-o încercare personală foarte grea, din care am crezut că nu voi mai ieși. Dar acolo a fost Domnul. El m-a ajutat să trec peste acea încercare și să îmi dau seama că o viață fără El nu are niciun sens.',
            'Deși am avut și alte întâlniri personale cu Domnul, abia atunci am înțeles că trebuie să Îi dedic toată viața mea. Schimbarea mea nu vine din meritul meu, ci din harul Lui. Dumnezeu m-a atins cu blândețe, m-a chemat aproape și mi-a arătat că nu sunt niciodată singură.',
            'Am hotărât să-L urmez pe Isus pentru că vreau să trăiesc în adevăr, în curăție și în iubire. Amin.',
          ],
        },
      },
      {
        id: 'dina-istratoaie',
        name: 'Dina Istrătoaie',
        age: 20,
        parents: 'Petrică și Garofița',
        story: {
          summary: 'Am înțeles că viața fără El nu are niciun scop și că doar prezența Lui dă sens fiecărei zile.',
          testimony: [
            'Provin dintr-o familie de creștini. De mică am crescut în această biserică și, de-a lungul anilor, am văzut mâna Domnului la lucru în familia mea și în viața mea.',
            'În vara anului 2023, într-o seară de rugăciune, Domnul mi-a vorbit și mi-a mișcat inima. Am înțeles că viața fără El nu are niciun scop și că doar prezența Lui dă sens fiecărei zile.',
            'Cu câteva luni în urmă, printr-un vas de lucru, Domnul mi-a arătat cum mi-a pregătit o haină albă. În acel moment am înțeles că e vremea să iau hotărârea de a încheia legământul în apa botezului, iar în seara de 26 septembrie am primit Duhul Sfânt, ceea ce m-a umplut de o bucurie și o pace pe care nu le pot descrie în cuvinte. Amin.',
          ],
          verse: {
            text: 'Veniți la Mine, toți cei trudiți și împovărați, și Eu vă voi da odihnă.',
            ref: 'Matei 11:28',
          },
        },
      },
      {
        id: 'alessia-toma',
        name: 'Alessia Toma',
        age: 18,
        parents: 'Marius Viorel și Giorgeta',
        story: {
          summary: 'Cu timpul am înțeles că Hristos nu este doar o învățătură sau o tradiție de familie.',
          testimony: [
            'M-am născut într-o casă creștină. Deși de mică am crescut auzind vorbindu-se despre Hristos, a venit un moment în viața mea în care am simțit nevoia să-L caut eu însămi, să descopăr cine este El cu adevărat pentru mine.',
            'Cu timpul am înțeles că Hristos nu este doar o învățătură sau o tradiție de familie. Hristos este companie în momentele de singurătate, este lumină când totul pare întunecat, este vocea care te susține atunci când simți că nu mai poți.',
            'El a fost pentru mine un adăpost, o speranță și o mână care m-a ridicat de fiecare dată. Am văzut cum dragostea Lui transformă, cum vindecă răni pe care nici măcar nu știi că le ai și cum umple inima cu o pace care nu vine din lume.',
            'Astăzi sunt aici pentru că vreau să răspund acelei iubiri, pentru că vreau să-L urmez cu tot ce sunt. De aceea fac acest pas: pentru că cred în Hristos, cred în dragostea Lui și vreau ca viața mea să fie un drum alături de El. Amin.',
          ],
        },
      },
      {
        id: 'ana-costin',
        name: 'Ana Costin',
        age: 55,
        parents: 'Gheorghe și Maria',
        // Su diapositiva sólo trae el versículo, sin testimonio.
        story: {
          verse: {
            text: 'Un lucru cer de la Domnul și-l doresc fierbinte: aș vrea să locuiesc toată viața mea în Casa Domnului, ca să privesc frumusețea Domnului și să mă minunez de Templul Lui. Căci El mă va ocroti în coliba Lui în ziua necazului, mă va ascunde sub acoperișul cortului Lui și mă va înălța pe o stâncă.',
            ref: 'Psalmul 27:4-5',
          },
        },
      },
      {
        id: 'denis-muresan',
        name: 'Denis Mureșan',
        age: 18,
        parents: 'Iosif și Daniela',
        story: {
          summary: 'În ziua de azi voi încheia un legământ cu Domnul în fața martorilor văzuți și nevăzuți.',
          testimony: [
            'În ziua de azi voi încheia un legământ cu Domnul în fața martorilor văzuți și nevăzuți. Am crescut într-o familie de credincioși care m-au crescut în Biserica Elim încă de când eram mic.',
            'Momentul schimbării mele a început în mai 2025, când o predică mi-a deschis ochii și mi-am dat seama că sunt un om păcătos și că nu pot trăi fără Dumnezeu în viața mea. Am înțeles că El este Salvatorul și Mântuitorul.',
            'În septembrie 2025 am fost botezat cu Duhul Sfânt și Îi mulțumesc lui Dumnezeu pentru harul pe care l-a revărsat și pentru bunătatea pe care o are față de mine în fiecare zi. Amin.',
          ],
          verse: {
            text: 'Eu sunt Pâinea vieții. Cine vine la Mine nu va flămânzi niciodată și cine crede în Mine nu va înseta niciodată.',
            ref: 'Ioan 6:35',
          },
        },
      },
      {
        id: 'david-blejusca',
        name: 'David Blejușcă',
        age: 15,
        parents: 'Constantin și Mirela',
        story: {
          summary: 'Am trecut prin multe încercări până în acest moment, dar harul și bunătatea Domnului m-au scăpat de fiecare dată.',
          testimony: [
            'Provin dintr-o familie creștină. Am crescut într-o biserică penticostală și m-am hotărât să închei un legământ cu Domnul, deoarece am văzut cât de mult am nevoie de El în viața mea și mi-a arătat că El este singura cale care mă poate salva.',
            'Am trecut prin multe încercări până în acest moment, dar harul și bunătatea Domnului m-au scăpat de fiecare dată. Am fost atras de anturaje, dar Dumnezeu m-a schimbat: mi-a schimbat mintea, mi-a schimbat comportamentul față de lume și față de anturajele din jur.',
            'Prin faptul că m-am schimbat, am fost botezat cu Duhul Sfânt în data de 27 septembrie 2025, iar acest lucru m-a întărit în decizia mea. De aceea mărturisesc în fața martorilor văzuți și nevăzuți hotărârea de a-L urma pe Domnul meu Isus Hristos până la sfârșitul vieții mele. Amin.',
          ],
        },
      },
      {
        id: 'andreas-bena',
        name: 'Andreas Bena',
        age: 30,
        parents: 'Mircea și Maria',
        story: {
          summary: 'A venit ziua în care Dumnezeu m-a eliberat de aceste gânduri și mi-a dat puterea să fac acest pas și să urmez calea Lui.',
          testimony: [
            'Provin dintr-o familie numeroasă. Mama mea este creștină, dar tatăl meu încă nu este; însă Dumnezeu este mare și sperăm ca într-o zi să facă și el acest pas.',
            'Am luat decizia de a-L urma pe Dumnezeu, de a urma calea Lui și de a mă îndepărta de lume, după multe lupte cu mine însumi, gândindu-mă că poate nu este momentul sau că nu sunt pregătit.',
            'A venit ziua în care Dumnezeu m-a eliberat de aceste gânduri și mi-a dat puterea să fac acest pas și să urmez calea Lui. Amin.',
          ],
        },
      },
      {
        id: 'alin-cristian-calini',
        name: 'Alin Cristian Călini',
        age: 27,
        parents: 'Ilie și Alina',
        story: {
          summary: 'Am luat decizia să mă botez, să mă întorc pe calea Domnului.',
          testimony: [
            'Provin dintr-o familie creștină. Am fost îndrumat pentru o vreme spre lume, însă am luat decizia să mă botez, să mă întorc pe calea Domnului.',
            'Într-o zi, când a avut loc botezul altor persoane, alții în locul meu s-au botezat și în acea clipă mi-am dat seama că și eu trebuie să fac acest pas și că acela este momentul și vremea potrivită să mă întorc pe deplin la calea Domnului.',
            'După acel botez am luat decizia că și eu voi urma acest pas, încheind un legământ înaintea Domnului. Amin.',
          ],
        },
      },
    ],
  },
  {
    date: '2026-05-31',
    youtubeId: 'nS_TRRnlzj4',
    ministers: ['Ioan Szasz'],
    cover: {
      image: 'assets/drive-media/candidati_botez_2026.webp',
      medium: 'assets/drive-media/candidati_botez_2026-960.webp',
      thumb: 'assets/drive-media/candidati_botez_2026-thumb.webp',
      tone: '#918880',
    },
    // Drive: «ELIM - MEDIA POZE › BOTEZ 31/05/2026»
    driveFolderId: '175k8wIpTRg_ZamgF8mBnVoGKbQez-ayY',
    // Presentación con perfil completo: testimonio, padres (y versículo).
    // Fotos: los originales de POZE_CANDIDATI (≥ resolución de la diapositiva).
    candidates: [
      {
        id: 'damaris-halas',
        name: 'Damaris Halas',
        age: 16,
        parents: 'Remus și Lavinia',
        story: {
          summary: 'Astăzi, o zi de mare bucurie pentru mine, am luat hotărârea să-L urmez pe Cel ce a murit pentru mine.',
          testimony: [
            'Astăzi, o zi de mare bucurie pentru mine, am luat hotărârea să-L urmez pe Cel ce a murit pentru mine.',
            'Îi mulțumesc Domnului Isus că m-a binecuvântat cu o familie de penticostali și de mică am fost adusă la biserică de părinții mei. Sunt implicată în diverse slujiri ale Bisericii Elim și sunt recunoscătoare pentru fiecare în parte.',
            'De ceva vreme am înțeles personal cine este Dumnezeu pentru mine și că vreau să trăiesc diferit. La El găsesc pace și vin înaintea Lui, căci Îl iubesc și știu că are un plan cu mine. Amin.',
          ],
        },
      },
      {
        id: 'timotei-halas',
        name: 'Timotei Halaș',
        age: 19,
        parents: 'Remus și Lavinia',
        story: {
          summary: 'Cred că botezul este cel mai important pas din viața mea și o mărturisire publică a credinței mele.',
          testimony: [
            'Provin dintr-o familie de penticostali. Am ales să mă botez pentru că Îl iubesc pe Dumnezeu și vreau să-L urmez din toată inima mea.',
            'Cred că botezul este cel mai important pas din viața mea și o mărturisire publică a credinței mele. Vreau să trăiesc mai aproape de Dumnezeu, să ascult de voia Lui și să rămân pe calea Sa în fiecare zi.',
            'Mă simt binecuvântat să-L am pe Dumnezeu în viața mea. Amin.',
          ],
        },
      },
      {
        id: 'parasca-rad',
        name: 'Parasca Rad',
        age: 74,
        parents: 'Gheorghe și Floarea',
        story: {
          summary: 'Mulțumesc Domnului că m-a așteptat atâția ani ca să fac legământul.',
          testimony: [
            'Provin dintr-o familie ortodoxă. Acum câțiva ani am fost la o adunare și am avut o lucrare: „Femeie, femeie, până când ești șovăită? Ia-ți crucea și Eu am să fiu cu tine.”',
            'Și n-am putut să fac pasul acesta, că am avut piedici. Iarna aceasta am fost bolnavă și am promis Domnului că, dacă mă vindecă, am să-L urmez.',
            'Mulțumesc Domnului că m-a așteptat atâția ani ca să fac legământul și să-L primesc în inima mea ca Domn, Stăpân și Mântuitor. Și mă va ajuta să intru în Împărăția Sa.',
            'Vreau să-L urmez, cu ajutorul Domnului Isus Hristos, până la sfârșitul zilelor vieții mele. Amin.',
          ],
        },
      },
      {
        id: 'rebeca-sangeorzan-cotut',
        name: 'Rebeca Sângeorzan Cotuț',
        age: 18,
        parents: 'Vasile și Cătălina',
        story: {
          summary: 'M-am hotărât să iau botezul pentru că Îl iubesc pe Domnul Isus.',
          testimony: ['M-am hotărât să iau botezul pentru că Îl iubesc pe Domnul Isus. Amin.'],
        },
      },
      {
        id: 'miriam-mitoseriu',
        name: 'Miriam Mitoșeriu',
        age: 16,
        parents: 'Ionuț și Aura',
        story: {
          summary: 'Azi vreau să mărturisesc întregii lumi că Iisus Hristos este Domnul meu și-L voi urma toată viața mea.',
          testimony: [
            'Provin dintr-o familie creștină, unde de mică m-au învățat cu iubire și dragoste calea lui Dumnezeu. De nenumărate ori Dumnezeu mi-a arătat iubirea Sa față de mine și, când credeam că eram singură și fără nicio speranță, tot El a fost cu mine.',
            'Decizia de a-L urma pe Iisus cu toată inima mea am luat-o cu câteva luni în urmă, aici, în Biserica Elim, când Dumnezeu m-a chemat cu dragoste și blândețe. Atunci am realizat că am nevoie de El și trebuie să-mi predau viața Lui.',
            'Știu că fără El nu sunt nimic; de aceea azi vreau să mărturisesc întregii lumi că Iisus Hristos este Domnul meu și-L voi urma toată viața mea. Amin.',
          ],
        },
      },
      {
        id: 'jessica-elisa-zagrean',
        name: 'Jessica Elisa Zăgrean',
        age: 17,
        parents: 'Daniel și Semida',
        story: {
          summary: 'Știu că Isus Hristos este Domnul și Mântuitorul meu și vreau să-L urmez toată viața.',
          testimony: [
            'Provin dintr-o familie creștină care de mică m-a adus la biserică și întotdeauna m-a învățat să mă încred în Dumnezeu și să-L urmez din toată inima.',
            'Încă de mică am văzut minunile pe care Dumnezeu le-a făcut în viața mea și cum m-a ajutat când credeam că nu mai pot.',
            'Decizia de a mă boteza am luat-o pentru că știu că Isus Hristos este Domnul și Mântuitorul meu și vreau să-L urmez toată viața. Amin.',
          ],
        },
      },
      {
        id: 'manuel-mic',
        name: 'Manuel Mic',
        age: 19,
        parents: 'Dănuț și Mihaela',
        story: {
          summary: 'Cred în Isus Hristos ca Domn și Mântuitor și vreau să-L urmez și să-L slujesc toată viața.',
          testimony: [
            'Am decis să închei legământ în apa botezului, pentru că cred în Isus Hristos ca Domn și Mântuitor și vreau să-L urmez și să-L slujesc toată viața. Amin.',
          ],
        },
      },
      {
        id: 'lenuta-elena-calina',
        name: 'Lenuța Elena Călina',
        age: 27,
        parents: 'Dănuț și Elena',
        story: {
          summary: 'Slăvit să fie Domnul, căci mi-a schimbat inima.',
          testimony: [
            'Provin dintr-o familie creștină ortodoxă. Decizia de a mă boteza a fost atunci când mi-am dat seama că dragostea pe care o caut este doar în Domnul meu Isus.',
            'Sunt prima din familie care face legământ cu Domnul. Slăvit să fie Domnul, căci mi-a schimbat inima. Amin.',
          ],
        },
      },
      {
        id: 'luigi-samuel-halas',
        name: 'Luigi Samuel Halas',
        age: 20,
        parents: 'Petrică și Lidia',
        story: {
          summary: 'De astăzi înainte vreau să-L urmez și să-L slujesc pe Domnul cu toată inima mea până la moarte.',
          testimony: [
            'Provin dintr-o familie de penticostali. Părinții mei m-au adus la binecuvântare de mic copil și de atunci, cu timpul, am început să-L slujesc pe Domnul prin diferite slujbe în biserică.',
            'Îi mulțumesc Domnului că Și-a arătat bunătatea față de mine chiar și când nu o meritam. Prin aceasta am înțeles că Iisus Hristos a murit și pentru păcatele mele. De aceea, decizia mea este ca de astăzi înainte să-L urmez și să-L slujesc pe Domnul cu toată inima mea până la moarte. Amin.',
          ],
          verse: {
            text: 'Am fost răstignit împreună cu Hristos și trăiesc… dar nu mai trăiesc eu, ci Hristos trăiește în mine. Și viața pe care o trăiesc acum în trup o trăiesc în credința în Fiul lui Dumnezeu, care m-a iubit și S-a dat pe Sine Însuși pentru mine.',
            ref: 'Galateni 2:20',
          },
        },
      },
    ],
  },
];
