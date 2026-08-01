/**
 * Nombres de icono admitidos en toda la app.
 *
 * Vive en `core/ui` (y no en el componente) para que la capa de datos
 * (`church.config.ts`, `navigation.config.ts`) pueda tipar sus iconos sin
 * depender de la capa de presentación.
 */
export type IconName =
  | 'home'
  | 'users'
  | 'calendar'
  | 'clock'
  | 'image'
  | 'play'
  | 'map-pin'
  | 'mail'
  | 'phone'
  | 'send'
  | 'copy'
  | 'check'
  | 'gift'
  | 'credit-card'
  | 'share'
  | 'book'
  | 'heart'
  | 'music'
  | 'church'
  | 'sparkles'
  | 'chevron-down'
  | 'arrow-right'
  | 'menu'
  | 'close';
