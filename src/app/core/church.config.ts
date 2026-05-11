import { InjectionToken } from '@angular/core';
import { SocialLink } from './social-link.model';

/**
 * Evento del directorio público de fotos/vídeos de la iglesia.
 * Cada uno se corresponde con una subcarpeta de Google Drive y se
 * representa visualmente con un gradient + icono + i18n key para nombre.
 */
export interface MediaEvent {
  readonly id: string;
  /** Sub-clave dentro de `gallery.events.*` (name, date) en los JSON i18n. */
  readonly i18nKey: string;
  /** Icono representativo (mapea a iconos en `MediaIconComponent`). */
  readonly icon: 'baptism' | 'concert' | 'evangelism' | 'celebration' | 'youth' | 'gift' | 'star';
  /** Gradient de fondo de la card [from, to]. */
  readonly gradient: readonly [string, string];
  /** URL pública directa a la subcarpeta de Drive. */
  readonly driveUrl: string;
}

/**
 * Configuración estática de la iglesia.
 *
 * Centralizar aquí URLs y datos no traducibles (handles, IDs de YouTube…)
 * permite a un no-desarrollador actualizar el contenido sin tocar plantillas.
 * Los textos visibles viven en `assets/i18n/*.json`.
 */
export interface ChurchConfig {
  readonly logo: string;
  readonly youtubeChannelUrl: string;
  readonly youtubeStreamsUrl: string;
  /** YouTube channel ID (UC...). Necesario para llamadas a YouTube Data API. */
  readonly youtubeChannelId: string;
  /** API Key restringida por HTTP referrer; segura para uso en cliente. */
  readonly youtubeApiKey: string;
  /** URL pública canónica — fallback para el QR si no hay `window`. */
  readonly publicUrl: string;
  readonly socials: readonly SocialLink[];
  /** URL raíz al directorio público de fotos en Google Drive. */
  readonly mediaGalleryUrl: string;
  /** Eventos destacados del departamento de media. */
  readonly mediaEvents: readonly MediaEvent[];
}

export const CHURCH_CONFIG = new InjectionToken<ChurchConfig>('CHURCH_CONFIG');

export const DEFAULT_CHURCH_CONFIG: ChurchConfig = {
  logo: 'assets/logo-elim.png',
  youtubeChannelUrl: 'https://www.youtube.com/@ElimArganda',
  youtubeStreamsUrl: 'https://www.youtube.com/@ElimArganda/streams',
  youtubeChannelId: 'UCJqLlk6CS6uNtJWS5r-7P9g',
  youtubeApiKey: 'AIzaSyCliQqAiyf0qZuKoOi76MbU-NOrQrDcCoA',
  publicUrl: 'https://beni-cioarba.github.io/MEDIA-ELIM/',
  socials: [
    {
      id: 'instagram_main',
      i18nKey: 'instagram_main',
      handle: '@elimarganda',
      url: 'https://www.instagram.com/elimarganda/',
      icon: 'instagram',
      gradient: ['#f58529', '#dd2a7b'],
    },
    {
      id: 'instagram_youth',
      i18nKey: 'instagram_youth',
      handle: '@tineretelimarganda',
      url: 'https://www.instagram.com/tineretelimarganda/',
      icon: 'instagram',
      gradient: ['#8a3ab9', '#e95950'],
    },
    {
      id: 'facebook_main',
      i18nKey: 'facebook_main',
      handle: 'elimargandaoficial',
      url: 'https://www.facebook.com/elimargandaoficial',
      icon: 'facebook',
      gradient: ['#1877f2', '#0a52c4'],
    },
    {
      id: 'youtube_main',
      i18nKey: 'youtube_main',
      handle: '@ElimArganda',
      url: 'https://www.youtube.com/@ElimArganda',
      icon: 'youtube',
      gradient: ['#ff0000', '#a30000'],
    },
  ],
  mediaGalleryUrl:
    'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
  // Eventos destacados ordenados aproximadamente por relevancia litúrgica.
  // Editables sin tocar UI: añadir/quitar entradas se refleja en el carrusel
  // de la galería automáticamente.
  mediaEvents: [
    {
      id: 'botez_2025_11_30',
      i18nKey: 'botez_2025_11_30',
      icon: 'baptism',
      gradient: ['#1e3a8a', '#3b82f6'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'concert_colinde_copii',
      i18nKey: 'concert_colinde_copii',
      icon: 'youth',
      gradient: ['#7c3aed', '#ec4899'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'concert_colinde_elim',
      i18nKey: 'concert_colinde_elim',
      icon: 'concert',
      gradient: ['#b45309', '#f59e0b'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'evanghelizare',
      i18nKey: 'evanghelizare',
      icon: 'evangelism',
      gradient: ['#065f46', '#10b981'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'seara_revelion',
      i18nKey: 'seara_revelion',
      icon: 'celebration',
      gradient: ['#831843', '#f43f5e'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'talantul_in_negot_2026',
      i18nKey: 'talantul_in_negot_2026',
      icon: 'star',
      gradient: ['#1e40af', '#06b6d4'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
    {
      id: 'zambetul_din_cutie',
      i18nKey: 'zambetul_din_cutie',
      icon: 'gift',
      gradient: ['#9d174d', '#f472b6'],
      driveUrl:
        'https://drive.google.com/drive/folders/1jVMEFjKxfEM1yUcm4aFhGV0AWXwdrXne?usp=sharing',
    },
  ],
};
