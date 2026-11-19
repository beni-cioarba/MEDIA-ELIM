import type { HeroSlide } from '../church.config';

/**
 * Fotos de la portada (carrusel) y de «Cine suntem».
 *
 * La primera diapositiva se precarga en `src/index.html`: si cambia,
 * hay que cambiarla allí también (lo vigila `npm run check`).
 *
 * Fichero de **contenido**: lo edita quien publica. Los tipos están en
 * `core/church.config.ts`, que reúne todos los ficheros de `core/content/`
 * en `DEFAULT_CHURCH_CONFIG` (la app lo lee por el token `CHURCH_CONFIG`).
 */


// ---------------------------------------------------------------------
// Carrusel de portada. Reutiliza las fotos ya optimizadas de la galería
// para no duplicar peso. Para cambiarlas: sube la foto a
// `src/assets/drive-media/`, ejecuta `node scripts/optimize-images.js`
// y apunta aquí a los `.webp` generados.
// ---------------------------------------------------------------------
/**
 * Foto de «Nuestra historia» (página Quiénes somos).
 *
 * Tiene entrada propia y **no se lee de `heroSlides[0]`**, que es lo que
 * hacía antes: al reordenar el carrusel de portada, esta página cambiaba de
 * foto sola y sin que nadie se enterara. Una ilustración elegida para un
 * texto concreto no puede depender del orden de otra cosa.
 *
 * La congregación sentada en el templo (26/10/2026): el relato pasa de
 * «unos pocos» a «unos 450 miembros», y la foto tiene que enseñar a esa
 * comunidad, no un acto concreto. 960 y 1600 px (`srcset`), WebP q82, en
 * `assets/about/` (fuera de `drive-media/`, que es de la galería).
 */
export const ABOUT_IMAGE: { readonly src: string; readonly srcset: string } = {
  src: 'assets/about/biserica_adunata_2026-1600.webp',
  srcset:
    'assets/about/biserica_adunata_2026-960.webp 960w, assets/about/biserica_adunata_2026-1600.webp 1600w',
};


export const HERO_SLIDES: readonly HeroSlide[] = [
  // El orden es deliberado: abren los slujitori de la iglesia (foto de
  // grupo del 25 aniversario, a petición del usuario, 23/10/2026), sigue
  // el concierto de niños (la foto con más gente y más luz), el tineret
  // en alabanza (04/10/2026, también a petición suya) y, agrupados por
  // tema, la música (coro y fanfara) y el bautismo (candidatos y bautismo).
  // Después Fin de Año y acción social. Desde el 09/11/2026, a petición del
  // usuario, abre la congregación reunida en el templo (la misma foto de
  // «Despre noi») y sale la velada de villancicos.
  // Cambiarlo es cambiar lo primero que ve quien entra.
  {
    // La congregación sentada en el templo: la foto de «Nuestra historia».
    // Comparte ficheros con `aboutImage` (no se duplica peso), pero es una
    // entrada aparte: quitarla de aquí no cambia la página Quiénes somos.
    id: 'hero_congregation',
    i18nKey: 'congregation',
    image: 'assets/about/biserica_adunata_2026-1600.webp',
    medium: 'assets/about/biserica_adunata_2026-960.webp',
    thumb: 'assets/about/biserica_adunata_2026-thumb.webp',
    tone: '#7d6c62',
  },
  {
    // Los slujitori de la iglesia, foto de grupo del 25 aniversario.
    // Primera a petición del usuario (23/10/2026). Única con `large`: el
    // original mide 6269 px.
    id: 'hero_ministers',
    i18nKey: 'ministers',
    image: 'assets/drive-media/slujitori_biserica_2026.webp',
    medium: 'assets/drive-media/slujitori_biserica_2026-960.webp',
    large: 'assets/drive-media/slujitori_biserica_2026-2560.webp',
    thumb: 'assets/drive-media/slujitori_biserica_2026-thumb.webp',
    tone: '#605956',
  },
  {
    id: 'hero_children',
    i18nKey: 'children',
    image: 'assets/drive-media/concert_copii_2025.webp',
    medium: 'assets/drive-media/concert_copii_2025-960.webp',
    thumb: 'assets/drive-media/concert_copii_2025-thumb.webp',
    tone: '#797474',
  },
  {
    // El tineret dirigiendo la alabanza: la letra en pantalla, el coro y
    // la sala.
    id: 'hero_youth',
    i18nKey: 'youth',
    image: 'assets/drive-media/inchinare_tineret_2026.webp',
    medium: 'assets/drive-media/inchinare_tineret_2026-960.webp',
    thumb: 'assets/drive-media/inchinare_tineret_2026-thumb.webp',
    tone: '#6b645f',
    // Con `upper` mandaba la pantalla con la letra y el tineret quedaba
    // cortado por la cabeza en escritorio: centrado entran las dos cosas.
    focus: 'center',
  },
  {
    // El coro, con el director de espaldas y la sala delante.
    id: 'hero_choir',
    i18nKey: 'choir',
    image: 'assets/drive-media/cor_2026.webp',
    medium: 'assets/drive-media/cor_2026-960.webp',
    thumb: 'assets/drive-media/cor_2026-thumb.webp',
    tone: '#78716d',
  },
  {
    // La fanfara tocando, con la letra en la pantalla y la sala llena.
    id: 'hero_brass',
    i18nKey: 'brass',
    image: 'assets/drive-media/fanfara_2026.webp',
    medium: 'assets/drive-media/fanfara_2026-960.webp',
    thumb: 'assets/drive-media/fanfara_2026-thumb.webp',
    tone: '#7d7976',
  },
  {
    id: 'hero_baptism',
    i18nKey: 'baptism',
    image: 'assets/drive-media/botez_2025.webp',
    medium: 'assets/drive-media/botez_2025-960.webp',
    thumb: 'assets/drive-media/botez_2025-thumb.webp',
    tone: '#91979f',
  },
  {
    // Los candidatos al bautismo, de blanco, en primera fila.
    id: 'hero_baptism_candidates',
    i18nKey: 'baptism_candidates',
    image: 'assets/drive-media/candidati_botez_2026.webp',
    medium: 'assets/drive-media/candidati_botez_2026-960.webp',
    thumb: 'assets/drive-media/candidati_botez_2026-thumb.webp',
    tone: '#918880',
    // Las caras están en el tercio de arriba: con `upper` se cortaban las
    // cabezas en escritorio.
    focus: 'top',
  },
  {
    id: 'hero_community',
    i18nKey: 'community',
    image: 'assets/drive-media/revelion_2025.webp',
    medium: 'assets/drive-media/revelion_2025-960.webp',
    thumb: 'assets/drive-media/revelion_2025-thumb.webp',
    tone: '#5e6163',
    // Arriba del todo: con `center`, en escritorio (marco ~2,25:1 sobre una
    // foto 3:2) el recorte se llevaba 211 px de arriba y cortaba las cabezas
    // de los que están de pie. Abajo sólo hay suelo y cajas.
    focus: 'top',
  },
  {
    id: 'hero_outreach',
    i18nKey: 'outreach',
    image: 'assets/drive-media/zambetul_cutie_2025.webp',
    medium: 'assets/drive-media/zambetul_cutie_2025-960.webp',
    thumb: 'assets/drive-media/zambetul_cutie_2025-thumb.webp',
    tone: '#736d74',
    // Los chicos de delante tienen la cabeza pegada al borde de arriba: con
    // `upper` (28 %) se les cortaba el pelo. Abajo sólo hay cajas.
    focus: 'top',
  },
];
