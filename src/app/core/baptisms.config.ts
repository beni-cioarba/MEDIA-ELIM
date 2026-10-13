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
 *    se presentó, y lo que se sepa (`age` el día del botez, `origin`).
 *    Nada se rellena: sin edad, no se pinta la edad.
 *  · `story` es el perfil ampliado (testimonio, versículo), **opcional** y
 *    tal cual lo entregue la persona, como las biografías de `conducere`.
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
  /** Una o dos frases: entradilla del perfil. */
  readonly summary?: string;
  /** Testimonio, un párrafo por elemento. */
  readonly testimony?: readonly string[];
  /** Versículo que eligió para su botez. */
  readonly verse?: { readonly text: string; readonly ref: string };
}

export interface BaptismCandidate {
  /** Slug único dentro del botez; nombre del retrato (`<id>-640.webp`). */
  readonly id: string;
  /** Nombre y apellidos, como se presentó a la iglesia. */
  readonly name: string;
  /** Edad el día del botez. */
  readonly age?: number;
  /** De dónde es (ciudad de origen · dónde vive, si se dio). */
  readonly origin?: string;
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
    // Sin edades en la presentación. Fotos originales (las de la presentación iban recortadas).
    candidates: [
      { id: 'nereea-marcu', name: 'Nereea Marcu' },
      { id: 'noemi-halas', name: 'Noemi Halas' },
      { id: 'sara-toth', name: 'Sara Toth' },
      { id: 'ester-zagrean', name: 'Ester Zagrean' },
      { id: 'sara-gherasim', name: 'Sara Gherasim' },
      { id: 'maria-ciobanu', name: 'Maria Ciobanu' },
      { id: 'maria-carp', name: 'Maria Carp' },
      { id: 'andres-sidor', name: 'Andres Sidor' },
      { id: 'natanael-filimon', name: 'Natanael Filimon' },
      { id: 'gabriel-cetanas', name: 'Gabriel Cetanas' },
    ],
  },
  {
    date: '2025-11-30',
    // Aún sin lista de candidatos: foto de grupo y carpeta de la galería.
    cover: {
      image: 'assets/drive-media/botez_2025.webp',
      medium: 'assets/drive-media/botez_2025-960.webp',
      thumb: 'assets/drive-media/botez_2025-thumb.webp',
      tone: '#91979f',
    },
    // Drive: «BOTEZ 2025-11-30»
    driveFolderId: '1neyEzyRpK9wnlSJ4cXp_JMi7jlu5lNfU',
    candidates: [],
  },
  {
    date: '2026-05-31',
    cover: {
      image: 'assets/drive-media/candidati_botez_2026.webp',
      medium: 'assets/drive-media/candidati_botez_2026-960.webp',
      thumb: 'assets/drive-media/candidati_botez_2026-thumb.webp',
      tone: '#918880',
    },
    // Drive: «ELIM - MEDIA POZE › BOTEZ 31/05/2026»
    driveFolderId: '175k8wIpTRg_ZamgF8mBnVoGKbQez-ayY',
    candidates: [],
  },
];
