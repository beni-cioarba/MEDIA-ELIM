/**
 * Representa un enlace a una red social o plataforma externa de la iglesia.
 *
 * Los textos visibles (`name`, `subtitle`, `ariaLabel`) NO se almacenan aquí:
 * se resuelven vía i18n (`@ngx-translate/core`) usando la clave `i18nKey`.
 */
export interface SocialLink {
  /** Identificador estable, útil para `trackBy` en *ngFor. */
  readonly id: string;
  /** Clave dentro de `socials.items.*` en los JSON de traducción. */
  readonly i18nKey: string;
  /** El handle claro de la red social (ej: @elimarganda) */
  readonly handle: string;
  /** URL absoluta a la que se redirige al pulsar la tarjeta. */
  readonly url: string;
  /** Icono SVG inline a renderizar. */
  readonly icon: SocialIcon;
  /** Colores principales del gradiente de marca (from, to). */
  readonly gradient: readonly [string, string];
}

export type SocialIcon = 'instagram' | 'facebook' | 'youtube' | 'web';
