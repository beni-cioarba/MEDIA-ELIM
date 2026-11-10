/**
 * Lógica pura de la página de invitados (`/invitati`): sin Angular, para
 * poder probarla (`guests.view.spec.ts`).
 */

/** Segmento de la página y de su hoja de QR (no se importa `APP_PATHS` para seguir siendo puro). */
export const GUESTS_SEGMENT = 'invitati';

/** Idiomas en que se puede abrir la página por enlace (`?lang=`). */
export type GuestLang = 'ro' | 'es';

/**
 * URL que codifica el QR. **Con barra final**: el despliegue sirve
 * `invitati/index.html`, y así GitHub Pages responde 200 sin la redirección
 * de `/invitati` → `/invitati/`. El rumano es el idioma por defecto: sólo el
 * español lleva `?lang=es`.
 */
export function guestsUrl(publicUrl: string, lang: GuestLang): string {
  const base = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
  return `${base}${GUESTS_SEGMENT}/${lang === 'es' ? '?lang=es' : ''}`;
}

/** La dirección como se teclea, bajo el QR: `elimarganda.com/invitati`. */
export function guestsDisplayUrl(publicUrl: string): string {
  const host = publicUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  return `${host}/${GUESTS_SEGMENT}`;
}

/** Valor de `?lang=` aceptado, o `null` si no viene o no es válido. */
export function parseGuestLang(value: string | null | undefined): GuestLang | null {
  const lang = value?.trim().toLowerCase();
  return lang === 'ro' || lang === 'es' ? lang : null;
}

/** Dirección postal partida («Av. de Madrid, 30, 28500 Arganda del Rey»). */
export interface PostalAddress {
  readonly street: string;
  readonly postalCode: string;
  readonly locality: string;
}

/**
 * Parte la dirección de `location.address` en calle, código postal y
 * localidad (formato español: «<calle>, <CP> <localidad>»). Si no tiene esa
 * forma devuelve `null` y la vCard lleva la dirección entera como calle.
 */
export function splitAddress(address: string): PostalAddress | null {
  const match = /^(.+?),\s*(\d{5})\s+(.+)$/.exec(address.trim());
  if (!match) return null;
  return { street: match[1].trim(), postalCode: match[2], locality: match[3].trim() };
}

/** Datos de la tarjeta de contacto de la iglesia. */
export interface ChurchCard {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  /** Provincia / región (`location.city`: «Madrid»). */
  readonly region: string;
  readonly country: string;
  readonly url: string;
  readonly note?: string;
}

/** Escapa un valor de texto de vCard (RFC 6350 §3.4): `\`, `,`, `;` y saltos de línea. */
export function vcardEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * vCard 3.0 de la iglesia («Salvează contactul»): la versión que importan
 * iOS, Android y Outlook sin preguntar. Líneas con CRLF, como pide el
 * estándar. Sin foto: el emblema inflaría el fichero y no aporta.
 */
export function buildVCard(card: ChurchCard): string {
  const parts = splitAddress(card.address);
  const adr = parts
    ? ['', '', parts.street, parts.locality, card.region, parts.postalCode, card.country]
    : ['', '', card.address, '', card.region, '', card.country];
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vcardEscape(card.name)};;;;`,
    `FN:${vcardEscape(card.name)}`,
    `ORG:${vcardEscape(card.name)}`,
    `TEL;TYPE=CELL,VOICE:${card.phone}`,
    `EMAIL;TYPE=INTERNET:${card.email}`,
    `ADR;TYPE=WORK:${adr.map(vcardEscape).join(';')}`,
    `URL:${card.url}`,
  ];
  if (card.note) lines.push(`NOTE:${vcardEscape(card.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

/** Estado de la tarjeta del próximo culto. */
export type NextServiceState = 'live' | 'today' | 'tomorrow' | 'later';

/**
 * Qué se dice del próximo culto: en marcha, hoy (con cuenta atrás), mañana o
 * el día de la semana. `minutesUntil ≤ 0` = ya empezó (dentro de su ventana).
 */
export function nextServiceState(next: {
  readonly minutesUntil: number;
  readonly daysAway: number;
}): NextServiceState {
  if (next.minutesUntil <= 0) return 'live';
  if (next.daysAway === 0) return 'today';
  if (next.daysAway === 1) return 'tomorrow';
  return 'later';
}

/** Iniciales para el monograma de una persona sin foto («Ioan Lauran» → «IL»). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
