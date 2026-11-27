import type { MediaEvent } from '../church.config';

/**
 * Galería: carpeta raíz de Drive y álbumes destacados.
 * `npm run check:drive` comprueba que cada carpeta exista y sea pública.
 *
 * Fichero de **contenido**: lo edita quien publica. Los tipos están en
 * `core/church.config.ts`, que reúne todos los ficheros de `core/content/`
 * en `DEFAULT_CHURCH_CONFIG` (la app lo lee por el token `CHURCH_CONFIG`).
 */

export const MEDIA_GALLERY_URL: string =
  'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing';

// Eventos destacados ordenados aproximadamente por relevancia litúrgica.
// Para añadir un nuevo evento manualmente:
//  1. Sube la imagen JPG/WebP a `src/assets/drive-media/`.
//  2. Añade aquí una entrada con `image` apuntando a la nueva ruta.
//  3. Añade los textos en `assets/i18n/ro.json` y `assets/i18n/es.json`
//     bajo `gallery.events.<i18nKey>` (campos `name` y `date`).
//  4. `driveFolderId`: el ID de su subcarpeta en «ELIM - ACCES PUBLIC»
//     (compartida como «cualquiera con el enlace»). Después
//     `npm run check:drive`. Receta completa: docs/ai/20-content-i18n.md.
//  5. ¿Es una nueva edición de un álbum que ya existe (otro bautizo)? No
//     se crea entrada: la actual pasa a `pastEditions` (primera posición)
//     y la entrada toma la foto, `date` y carpeta de la nueva.
export const MEDIA_EVENTS: readonly MediaEvent[] = [
  {
    // Álbum con ediciones: la entrada es el bautizo más reciente y
    // `pastEditions` el registro de los anteriores (`pastEditions` va
    // siempre al final: `check:drive` corta cada entrada por `{ id:`).
    id: 'botez',
    i18nKey: 'botez',
    date: '2026-11-22',
    image: 'assets/drive-media/candidati_botez_2026_11_grup.webp',
    medium: 'assets/drive-media/candidati_botez_2026_11_grup-960.webp',
    thumb: 'assets/drive-media/candidati_botez_2026_11_grup-thumb.webp',
    tone: '#7d7672',
    gradient: ['#1e3a8a', '#3b82f6'],
    // Drive: «BOTEZ 22-11-2026»
    driveFolderId: '1sPHtHQvRIKPihxpIWNyVSQOHQxDXSqRB',
    pastEditions: [
      {
        id: 'botez_2026_05_31',
        date: '2026-05-31',
        image: 'assets/drive-media/candidati_botez_2026.webp',
        medium: 'assets/drive-media/candidati_botez_2026-960.webp',
        thumb: 'assets/drive-media/candidati_botez_2026-thumb.webp',
        tone: '#918880',
        // Drive: «ELIM - MEDIA POZE › BOTEZ 31/05/2026»
        driveFolderId: '175k8wIpTRg_ZamgF8mBnVoGKbQez-ayY',
      },
      {
        id: 'botez_2025_11_30',
        date: '2025-11-30',
        image: 'assets/drive-media/botez_2025.webp',
        medium: 'assets/drive-media/botez_2025-960.webp',
        thumb: 'assets/drive-media/botez_2025-thumb.webp',
        tone: '#91979f',
        // Drive: «BOTEZ 2025-11-30»
        driveFolderId: '1neyEzyRpK9wnlSJ4cXp_JMi7jlu5lNfU',
      },
    ],
  },
  {
    id: 'concert_colinde_copii',
    i18nKey: 'concert_colinde_copii',
    image: 'assets/drive-media/concert_copii_2025.webp',
    medium: 'assets/drive-media/concert_copii_2025-960.webp',
    thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
    tone: '#797474',
    gradient: ['#7c3aed', '#ec4899'],
    // Drive: «Concert Colinde Copi»
    driveFolderId: '1ME9BBG20zQtqm7esd5elx9pwSRdqHHoH',
  },
  {
    id: 'concert_colinde_elim',
    i18nKey: 'concert_colinde_elim',
    image: 'assets/drive-media/concert_colinde_2025.webp',
    medium: 'assets/drive-media/concert_colinde_2025-960.webp',
    thumb: 'assets/drive-media/concert_colinde_2025-thumb.webp',
    tone: '#777e7e',
    gradient: ['#b45309', '#f59e0b'],
    // Drive: «Concert De Colinde Elim»
    driveFolderId: '1vnZxeXBrojLXcghG6o8HcgE5vbJ7MFUl',
  },
  {
    id: 'seara_revelion',
    i18nKey: 'seara_revelion',
    image: 'assets/drive-media/revelion_2025.webp',
    medium: 'assets/drive-media/revelion_2025-960.webp',
    thumb: 'assets/drive-media/revelion_2025-thumb.webp',
    tone: '#5e6163',
    gradient: ['#831843', '#f43f5e'],
    // Drive: «Revelion - 2026»
    driveFolderId: '1RCc6LWKTb-vG2jxtFSV6fjD9-qEp2rbi',
  },
  {
    id: 'zambetul_din_cutie',
    i18nKey: 'zambetul_din_cutie',
    image: 'assets/drive-media/zambetul_cutie_2025.webp',
    medium: 'assets/drive-media/zambetul_cutie_2025-960.webp',
    thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
    tone: '#736d74',
    gradient: ['#9d174d', '#f472b6'],
    // Drive: «Zambetul din cutie - 2025»
    driveFolderId: '1ADjG_UdCDXSEthe6Hr1GcYNXIWRKxXw-',
  },
  {
    id: 'ancorat_2026',
    // También es la crónica de Tineret (`departments.config.ts`): mismas
    // fotos optimizadas, sin duplicar peso.
    i18nKey: 'ancorat_2026',
    image: 'assets/drive-media/ancorat_2026_sala.webp',
    medium: 'assets/drive-media/ancorat_2026_sala-960.webp',
    thumb: 'assets/drive-media/ancorat_2026_sala-thumb.webp',
    tone: '#776760',
    gradient: ['#0f2440', '#d4af37'],
    // Drive: «ELIM - MEDIA POZE › ANCORAT › POZE CONFERINTA - NAOMI»
    driveFolderId: '1bzwggHsitKUKdterJ_wkie7vbQsXdpQO',
  },
  {
    id: 'inainte_da_2026',
    // También es la crónica de Tineret (`departments.config.ts`): mismas fotos.
    i18nKey: 'inainte_da_2026',
    image: 'assets/drive-media/inainte_da_2026_sala.webp',
    medium: 'assets/drive-media/inainte_da_2026_sala-960.webp',
    thumb: 'assets/drive-media/inainte_da_2026_sala-thumb.webp',
    tone: '#6a5e55',
    gradient: ['#0f2440', '#d4af37'],
    // Drive: «2026-11-20 Conferinta tineret - Înainte Să Spui Da»
    driveFolderId: '1tdPONU5XW8uTRB0wiPT-TG9A54gmy1kc',
  },
];
