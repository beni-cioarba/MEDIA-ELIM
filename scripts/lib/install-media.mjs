/**
 * **Qué dicen** las láminas de instalación y el manifiesto, en un solo sitio
 * (datos puros, sin Chrome ni sharp: lo leen los generadores y sus tests).
 *
 *  · Láminas (`PLATES`): las imágenes verticales que Chrome enseña en su hoja
 *    «Instalar» de Android, las horizontales de la de escritorio y las que
 *    enseña nuestra propia hoja en iPhone, iPad y el resto.
 *  · Manifiesto (`buildManifest`): uno por idioma de la web, la misma app.
 *
 * Un texto nuevo: se cambia aquí y `npm run pwa:install`.
 * Docs: `docs/ai/79-install.md`.
 */
import { createHash } from 'node:crypto';

/** Idiomas de la web; el primero es el de por defecto (`manifest.webmanifest`). */
export const LANGS = ['ro', 'es'];

/**
 * Límites de la «Richer Install UI» de Chromium (documentación de Chrome y
 * `installable_data_fetcher.cc`). Lo que no los cumple se descarta **sin
 * avisar**: por eso hay un test.
 */
export const CHROME_LIMITS = {
  minSide: 320,
  maxSide: 3840,
  /** Lado mayor ≤ 2,3 × lado menor. */
  maxRatio: 2.3,
  /** Entre todas: el recuento de Chromium mezcla `narrow` y `wide`. */
  maxCount: 8,
  types: ['image/jpeg', 'image/png'],
  /** Más allá, la descripción sale cortada (7 líneas). */
  descriptionLength: 324,
};

/** Peso máximo por lámina: se descargan todas al abrir la hoja, con datos móviles. */
export const MAX_PLATE_BYTES = 190 * 1024;

/** Tamaños publicados. `narrow` mide lo mismo que las de la web de referencia (9:16). */
export const SIZES = {
  narrow: { width: 1080, height: 1920 },
  wide: { width: 1920, height: 1080 },
  /** Para la hoja propia: se ve a ~150 px de ancho (3×). */
  thumb: { width: 432, height: 768 },
};

/** Carpeta publicada (relativa a la raíz de la web). */
export const MEDIA_DIR = 'assets/pwa/install';

/**
 * Las láminas, en orden. Titulares de 2–3 líneas: en la hoja de Android la
 * lámina se ve a unos 165 px de ancho, así que el titular (112 px de 1080) se
 * lee a 17. `wide: true` = también tiene versión de escritorio.
 */
export const PLATES = [
  {
    id: 'acasa',
    art: 'welcome',
    theme: 'photo',
    wide: true,
    title: { ro: ['Biserica ta,', 'la o atingere'], es: ['Tu iglesia,', 'a un toque'] },
  },
  {
    id: 'program',
    art: 'program',
    theme: 'gold',
    wide: true,
    title: { ro: ['Programul', 'fiecărei', 'săptămâni'], es: ['El programa', 'de cada', 'semana'] },
  },
  {
    id: 'anunturi',
    art: 'cards',
    theme: 'navy',
    title: { ro: ['Anunțuri,', 'evenimente', 'și rugăciune'], es: ['Anuncios,', 'eventos', 'y oración'] },
    cards: {
      ro: ['Anunțuri', 'Evenimente', 'Rugăciune', 'Galerie'],
      es: ['Anuncios', 'Eventos', 'Oración', 'Galería'],
    },
  },
  {
    id: 'citire',
    art: 'reading',
    theme: 'paper',
    title: { ro: ['Citirea zilei,', 'la ora 8:00'], es: ['La lectura', 'del día, a las 8:00'] },
    notice: {
      ro: ['Citirea de azi', 'Textul și meditația'],
      es: ['La lectura de hoy', 'El texto y la meditación'],
    },
    // Sin esto la lámina prometería un aviso que hay que activar.
    note: { ro: 'Amintirea o activezi tu', es: 'El aviso lo activas tú' },
  },
  {
    id: 'direct',
    art: 'live',
    theme: 'blue',
    wide: true,
    title: { ro: ['Serviciile,', 'în direct'], es: ['Los cultos,', 'en directo'] },
    chip: { ro: 'ÎN DIRECT', es: 'EN DIRECTO' },
  },
];

/** Días de la lámina del programa: abreviados, en el orden de la semana. */
export const DAY_NAMES = {
  ro: ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
};

/** Filas de la lámina del programa, del contenido real (`weekly.content.ts`). */
export function programRows(weekly, lang) {
  return weekly.map(({ day, time }) => ({ day: DAY_NAMES[lang][day], time: time.replace(/\s*&\s*/g, ' · ') }));
}

/** Ruta publicada de una lámina. */
export function plateFile(plate, lang, shape) {
  return `${MEDIA_DIR}/${lang}/${plate.id}${shape === 'narrow' ? '' : `-${shape}`}.${shape === 'thumb' ? 'webp' : 'jpg'}`;
}

/**
 * Huella de lo que las láminas **pintan** (textos y horario). Se guarda al
 * generarlas y un test la compara: si alguien cambia el horario del culto, la
 * lámina que lo enseña no puede quedarse con el viejo.
 */
export function sourceDigest(weekly) {
  const painted = { PLATES, rows: Object.fromEntries(LANGS.map((lang) => [lang, programRows(weekly, lang)])) };
  return createHash('sha256').update(JSON.stringify(painted)).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------
// Manifiesto
// ---------------------------------------------------------------------

const TEXTS = {
  ro: {
    description:
      'Biserica, la o atingere: programul, anunțurile, transmisiunile în direct și citirea zilei. Gratuită, fără cont și fără magazin de aplicații.',
    shortcuts: {
      announcements: ['Anunțuri', 'Anunțuri', 'Avizele bisericii în vigoare'],
      impreuna: ['Proiectul Împreună: citirea de azi', 'Citirea de azi', 'Textul și meditația video a zilei'],
      weekly: ['Program săptămânal', 'Program', 'Serviciile fiecărei zile'],
      live: ['În direct', 'În direct', 'Transmisiunile în direct și cele mai recente'],
      donate: ['Donează', 'Donează', 'Susține lucrarea bisericii'],
    },
  },
  es: {
    description:
      'La iglesia, a un toque: el programa, los anuncios, los cultos en directo y la lectura del día. Gratis, sin cuenta y sin tienda de aplicaciones.',
    shortcuts: {
      announcements: ['Anuncios', 'Anuncios', 'Avisos de la iglesia en vigor'],
      impreuna: ['Proiectul Împreună: la lectura de hoy', 'Lectura de hoy', 'El texto y la meditación en vídeo del día'],
      weekly: ['Programa semanal', 'Programa', 'Los cultos de cada día'],
      live: ['En directo', 'En directo', 'El directo y los últimos cultos'],
      donate: ['Donativos', 'Donativos', 'Sostén la obra de la iglesia'],
    },
  },
};

/** Orden de los atajos: Android enseña los primeros. */
const SHORTCUT_URLS = {
  announcements: './anunturi',
  impreuna: './impreuna',
  weekly: './media/program',
  live: './media/transmisiuni',
  donate: './doneaza',
};

/** Fichero del manifiesto de un idioma (el de por defecto, el de siempre). */
export function manifestFile(lang) {
  return lang === LANGS[0] ? 'manifest.webmanifest' : `manifest.${lang}.webmanifest`;
}

const icon = (name, size, purpose) => ({
  src: `assets/pwa/${name}-${size}.png`,
  sizes: `${size}x${size}`,
  type: 'image/png',
  ...(purpose ? { purpose } : {}),
});

/**
 * Manifiesto de un idioma.
 *
 * Los dos describen **la misma app**: `id`, `start_url`, `scope`, nombre e
 * iconos idénticos (lo vigila el test). Con nombres distintos, Android pediría
 * confirmar un «cambio de nombre» al alternar de idioma. Cambian los textos,
 * los atajos y las láminas.
 *
 * @param {string} publicUrl URL pública con barra final (`core/site.ts`).
 */
export function buildManifest(lang, publicUrl) {
  const t = TEXTS[lang];
  const shots = (shape) =>
    PLATES.filter((plate) => shape === 'narrow' || plate.wide).map((plate) => ({
      src: plateFile(plate, lang, shape),
      sizes: `${SIZES[shape].width}x${SIZES[shape].height}`,
      type: 'image/jpeg',
      form_factor: shape,
      label: plate.title[lang].join(' '),
    }));
  return {
    id: './',
    name: 'Biserica Elim Arganda',
    short_name: 'Elim Arganda',
    description: t.description,
    lang,
    dir: 'ltr',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#faf9f6',
    background_color: '#1a365d',
    categories: ['lifestyle', 'social', 'education'],
    icons: [
      icon('icon-any', 192, 'any'),
      icon('icon-any', 512, 'any'),
      icon('icon-maskable', 192, 'maskable'),
      icon('icon-maskable', 512, 'maskable'),
      icon('icon-monochrome', 512, 'monochrome'),
    ],
    shortcuts: Object.entries(SHORTCUT_URLS).map(([id, url]) => {
      const [name, short_name, description] = t.shortcuts[id];
      return { name, short_name, description, url, icons: [icon(`shortcut-${id}`, 192)] };
    }),
    // `narrow` delante: si se llegara al tope, lo que se pierde es escritorio.
    screenshots: [...shots('narrow'), ...shots('wide')],
    // La propia app: `getInstalledRelatedApps()` dice si ya está instalada
    // (Chrome Android; Chrome y Edge de escritorio). Las dos direcciones,
    // porque se instala con el manifiesto del idioma en que se esté.
    related_applications: LANGS.map((l) => ({
      platform: 'webapp',
      url: `${publicUrl}${manifestFile(l)}`,
      id: publicUrl,
    })),
    prefer_related_applications: false,
  };
}

/** Texto del fichero, byte a byte (lo compara el test). */
export function renderManifest(lang, publicUrl) {
  return `${JSON.stringify(buildManifest(lang, publicUrl), null, 2)}\n`;
}
