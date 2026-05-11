import { InjectionToken } from '@angular/core';
import { SocialLink } from './social-link.model';

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
};
