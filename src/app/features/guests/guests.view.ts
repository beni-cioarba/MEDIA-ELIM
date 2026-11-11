/**
 * Lógica pura de la página de invitados (`/invitati`): sin Angular, para
 * poder probarla (`guests.view.spec.ts`).
 */

/** Segmento de la página y de su hoja de QR (no se importa `APP_PATHS` para seguir siendo puro). */
export const GUESTS_SEGMENT = 'invitati';

/** Idiomas en que se puede abrir la página por enlace (`?lang=`). */
export type GuestLang = 'ro' | 'es';

/** Segmento de la versión en español: `/invitati/es`. */
export const GUESTS_ES_SEGMENT = 'es';

/**
 * Ruta interna de la página en un idioma: `/invitati` (rumano, el de por
 * defecto) o `/invitati/es`. El idioma va **en la ruta**, no en `?lang`:
 * así cada idioma tiene su página estática (WhatsApp y compañía leen el HTML,
 * no ejecutan la app, y un `?lang` no cambia lo que leen).
 */
export function guestsPath(lang: GuestLang): string {
  return lang === 'es' ? `/${GUESTS_SEGMENT}/${GUESTS_ES_SEGMENT}` : `/${GUESTS_SEGMENT}`;
}

/**
 * URL pública de la página en un idioma: la del QR y la que se comparte.
 * **Con barra final**: el despliegue sirve `invitati/index.html` e
 * `invitati/es/index.html`, y así GitHub Pages responde 200 sin redirección.
 */
export function guestsUrl(publicUrl: string, lang: GuestLang): string {
  const base = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
  return `${base}${guestsPath(lang)}/`;
}

/** La dirección como se teclea, bajo el QR: `elimarganda.com/invitati`. */
export function guestsDisplayUrl(publicUrl: string, lang: GuestLang = 'ro'): string {
  const host = publicUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  return `${host}${guestsPath(lang)}`;
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

/** Datos de un evento para el enlace de Google Calendar. */
export interface CalendarLinkEvent {
  readonly title: string;
  /** `YYYY-MM-DD`. */
  readonly iso: string;
  /** `HH:MM` (hora de Madrid). */
  readonly time: string;
  readonly durationMin: number;
  readonly details: string;
  readonly location: string;
}

/** `YYYYMMDDTHHMMSS` (hora local, sin zona: la pone `ctz`). */
function calendarStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/**
 * Enlace «añadir a Google Calendar» con el evento ya rellenado. La hora va
 * sin zona y `ctz=Europe/Madrid`: es la hora de la iglesia esté donde esté
 * quien lo añade. En Android abre la app de Calendar; en el ordenador, la web.
 */
export function googleCalendarUrl(event: CalendarLinkEvent): string {
  const [y, m, d] = event.iso.split('-').map(Number);
  const [hh, mm] = event.time.split(':').map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + event.durationMin * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    ctz: 'Europe/Madrid',
    details: event.details,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Traducción breve de los títulos del programa (contenido de la iglesia, que
 * se publica en rumano) para la página en español: «Rugăciune» → «Oración».
 * Un título compuesto («A · B») se traduce por partes; si alguna parte no
 * está en el glosario, no se traduce nada (mejor sin glosa que a medias).
 */
export function glossTitle(title: string, glossary: Readonly<Record<string, string>>): string | null {
  const parts = title.split(' · ').map((part) => glossary[part.trim()]);
  return parts.every(Boolean) ? parts.join(' · ') : null;
}
