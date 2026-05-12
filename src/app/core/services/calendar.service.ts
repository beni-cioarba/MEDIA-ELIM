import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, UpcomingEvent } from '../church.config';

/**
 * `CalendarService` — generación de archivos `.ics` (RFC 5545) y URLs
 * `webcal://` para sincronizar los próximos eventos de la iglesia con
 * Google Calendar, Apple Calendar, Outlook, etc.
 *
 *  ▸ **Exportación puntual (.ics)** — descarga directa de uno o todos
 *    los eventos. El usuario lo abre y se añade manualmente.
 *  ▸ **Suscripción (webcal://)** — URL estable que el cliente de calendario
 *    consulta periódicamente; las actualizaciones son automáticas. Requiere
 *    publicar `assets/calendars/elim-events.ics` desde el servidor estático.
 *
 * No depende de librerías externas: el formato iCalendar se construye a mano
 * para mantener el bundle reducido.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly translate = inject(TranslateService);

  private static readonly PRODID = '-//Biserica Elim Arganda//Eventos//RO';
  /** Duración por defecto del evento si no se calcula otra cosa (minutos). */
  private static readonly DEFAULT_DURATION_MIN = 120;

  /* ───────────────────────── API pública ───────────────────────── */

  /** Descarga un único evento como archivo `.ics`. */
  downloadEvent(event: UpcomingEvent): void {
    const ics = this.buildCalendar([event], event.title);
    this.triggerDownload(ics, this.fileNameForEvent(event));
  }

  /** Descarga TODOS los eventos próximos como un único archivo `.ics`. */
  downloadAll(events: readonly UpcomingEvent[]): void {
    const ics = this.buildCalendar(
      events,
      this.t('calendar.calendar_name', 'Biserica Elim Arganda · Evenimente')
    );
    this.triggerDownload(ics, 'elim-arganda-evenimente.ics');
  }

  /**
   * URL `webcal://` para suscripción "live". Apunta a un fichero estático
   * en `assets/calendars/elim-events.ics`. Los clientes de calendario se
   * refrescarán automáticamente (el .ics declara `REFRESH-INTERVAL:PT6H`).
   */
  webcalUrlForAll(): string {
    return this.buildWebcalUrl('elim-events.ics');
  }

  /** URL `https://...` equivalente a la `webcal://` (para Google Calendar web). */
  httpsUrlForAll(): string {
    return this.webcalUrlForAll().replace(/^webcal:\/\//i, 'https://');
  }

  /**
   * URL "Add to Google Calendar" (rápido, no requiere descarga).
   * Útil cuando el usuario está logueado en Google y quiere previsualizar
   * el evento antes de aceptar.
   */
  googleAddUrlForEvent(event: UpcomingEvent): string {
    const start = this.combineDateAndTime(event.date, event.time);
    const end = new Date(start.getTime() + CalendarService.DEFAULT_DURATION_MIN * 60_000);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${this.formatLocal(start)}/${this.formatLocal(end)}`,
      details: this.googleDescription(event),
      location: this.t('calendar.location_default', 'Biserica Elim Arganda del Rey'),
      ctz: 'Europe/Madrid',
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

  /** Copia un texto al portapapeles (con fallback legacy para navegadores viejos). */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallthrough */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  /* ─────────────────────── Construcción .ics ─────────────────────── */

  private buildCalendar(events: readonly UpcomingEvent[], calendarName: string): string {
    const now = this.formatUtc(new Date());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:${CalendarService.PRODID}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escape(calendarName)}`,
      `X-WR-CALDESC:${this.escape(this.t('calendar.calendar_description', 'Programa și evenimente Biserica Elim Arganda'))}`,
      'X-WR-TIMEZONE:Europe/Madrid',
      'X-PUBLISHED-TTL:PT6H',
      'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    ];
    for (const ev of events) {
      lines.push(...this.buildEvent(ev, now));
    }
    lines.push('END:VCALENDAR');
    return this.foldLines(lines).join('\r\n') + '\r\n';
  }

  private buildEvent(event: UpcomingEvent, dtstamp: string): string[] {
    const start = this.combineDateAndTime(event.date, event.time);
    const end = new Date(start.getTime() + CalendarService.DEFAULT_DURATION_MIN * 60_000);
    const uid = this.buildUid(event);
    const description = this.buildDescription(event);
    const location = this.t('calendar.location_default', 'Biserica Elim Arganda del Rey');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${this.formatLocal(start)}`,
      `DTEND:${this.formatLocal(end)}`,
      `SUMMARY:${this.escape(event.title)}`,
      `LOCATION:${this.escape(location)}`,
      `DESCRIPTION:${this.escape(description)}`,
      `URL:${this.escape(this.config.publicUrl)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      // Recordatorio 12h antes — para no olvidar el evento.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${this.escape(event.title)}`,
      'TRIGGER:-PT12H',
      'END:VALARM',
      'END:VEVENT',
    ];
  }

  /** Descripción multi-línea del evento (escapada con `\\n` por línea). */
  private buildDescription(event: UpcomingEvent): string {
    const parts: string[] = [];
    if (event.description) parts.push(event.description);
    if (event.preacher) {
      parts.push('');
      parts.push(`${this.t('upcoming.preacher', 'Cuvânt')}: ${event.preacher}`);
    }
    if (event.worshipLead) {
      parts.push(`${this.t('upcoming.worship', 'Închinare')}: ${event.worshipLead}`);
    }
    if (event.verse) {
      parts.push('');
      parts.push(event.verse);
    }
    return parts.join('\\n');
  }

  /** Versión "para Google" — usa `\n` reales (los URL params los aceptan). */
  private googleDescription(event: UpcomingEvent): string {
    const parts: string[] = [];
    if (event.description) parts.push(event.description);
    if (event.preacher) parts.push(`${this.t('upcoming.preacher', 'Cuvânt')}: ${event.preacher}`);
    if (event.worshipLead) parts.push(`${this.t('upcoming.worship', 'Închinare')}: ${event.worshipLead}`);
    if (event.verse) parts.push(event.verse);
    return parts.join('\n');
  }

  /* ─────────────────────────── Helpers ─────────────────────────── */

  private buildWebcalUrl(filename: string): string {
    // Origen real del cliente; si no hay window (SSR), cae a publicUrl.
    let origin = '';
    if (typeof window !== 'undefined' && window.location?.origin) {
      origin = window.location.origin;
    } else {
      try {
        origin = new URL(this.config.publicUrl).origin;
      } catch {
        origin = '';
      }
    }
    const noScheme = origin.replace(/^https?:\/\//i, '');
    // El path sigue al origen — preservamos la base si la SPA está bajo subruta.
    const basePath = this.computeBasePath();
    return `webcal://${noScheme}${basePath}assets/calendars/${filename}`;
  }

  private computeBasePath(): string {
    if (typeof window === 'undefined') return '/';
    const pathname = window.location.pathname || '/';
    // Si la URL es .../index.html, recorta hasta el último segmento.
    const idx = pathname.lastIndexOf('/');
    return idx >= 0 ? pathname.substring(0, idx + 1) : '/';
  }

  private buildUid(event: UpcomingEvent): string {
    return `${this.slug(event.id)}-${event.date.replace(/-/g, '')}@elim-arganda`;
  }

  private fileNameForEvent(event: UpcomingEvent): string {
    return `${this.slug(event.id)}-${event.date}.ics`;
  }

  private combineDateAndTime(isoDate: string, hhmm: string): Date {
    const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
    // Soporta "10:00", "20:30" o "10:00 & 18:00" (toma el primer slot).
    const firstTime = (hhmm || '').split('&')[0].trim();
    const [h, mi] = firstTime.split(':').map((n) => parseInt(n, 10));
    return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
  }

  /** Formato local sin Z: `YYYYMMDDTHHMMSS` — el cliente lo interpreta en su tz. */
  private formatLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  }

  private formatUtc(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  }

  /** Escapa caracteres reservados RFC 5545 dentro de valores de propiedad. */
  private escape(text: string): string {
    return (text ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /** Plegado de líneas a 75 octetos según RFC 5545 §3.1. */
  private foldLines(lines: string[]): string[] {
    const out: string[] = [];
    for (const line of lines) {
      if (line.length <= 75) {
        out.push(line);
        continue;
      }
      let remaining = line;
      let first = true;
      while (remaining.length > 0) {
        const chunkSize = first ? 75 : 74;
        out.push((first ? '' : ' ') + remaining.substring(0, chunkSize));
        remaining = remaining.substring(chunkSize);
        first = false;
      }
    }
    return out;
  }

  private slug(text: string): string {
    return (text ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private triggerDownload(content: string, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Liberar el ObjectURL en la siguiente vuelta del event loop.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** `translate.instant` con fallback inline si la clave no existe. */
  private t(key: string, fallback: string): string {
    const v = this.translate.instant(key);
    return !v || v === key ? fallback : v;
  }
}
