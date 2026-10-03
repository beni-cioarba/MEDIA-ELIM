import { Injectable, computed, inject } from '@angular/core';
import { Announcement, CHURCH_CONFIG } from '../church.config';
import { DAY_MS, parseIsoDate, startOfDay } from '../util/iso-date';
import { ClockService } from './clock.service';

/**
 * Anunțuri **vigentes**: única fuente de verdad para la web (`/anunturi`) y
 * para la proyección (una diapositiva por anuncio).
 *
 * Un anuncio está vigente desde `publishedOn` (o desde siempre) hasta
 * `expiresOn`, ambos incluidos y en días naturales locales. La lista reacciona
 * al reloj compartido, así que el portátil del templo deja de proyectar un
 * anuncio caducado sin recargar la página, igual que hace con los eventos.
 *
 * Orden: primero lo que ocurre antes (`date`); los anuncios sin fecha propia
 * se ordenan por su caducidad. Así lo más urgente se proyecta primero.
 */
/**
 * Días que un anuncio sigue en el archivo («Anunțuri trecute») después de
 * caducar. El archivo sirve para consultar lo que se anunció hace poco (¿qué
 * había que traer?, ¿a quién había que apuntarse?), no para guardar el
 * histórico entero: con los años la lista no crece.
 */
const PAST_WINDOW_DAYS = 90;

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly config = inject(CHURCH_CONFIG);
  private readonly clock = inject(ClockService);

  readonly active = computed<readonly Announcement[]>(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    return this.config.announcements
      .filter((a) => {
        const from = a.publishedOn ? startOfDay(parseIsoDate(a.publishedOn)).getTime() : -Infinity;
        const until = startOfDay(parseIsoDate(a.expiresOn)).getTime();
        return from <= today && today <= until;
      })
      .sort((a, b) => sortKey(a) - sortKey(b));
  });

  readonly hasActive = computed<boolean>(() => this.active().length > 0);

  /**
   * Anuncios caducados en los últimos `PAST_WINDOW_DAYS` días, el más reciente
   * primero. Sólo para la web: la proyección nunca los ve (invariante 5).
   */
  readonly past = computed<readonly Announcement[]>(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    const oldest = today - PAST_WINDOW_DAYS * DAY_MS;
    return this.config.announcements
      .filter((a) => {
        const until = startOfDay(parseIsoDate(a.expiresOn)).getTime();
        return until < today && until >= oldest;
      })
      .sort((a, b) => parseIsoDate(b.expiresOn).getTime() - parseIsoDate(a.expiresOn).getTime());
  });

  /**
   * Anuncios **programados**: ya escritos pero aún no publicados
   * (`publishedOn` futuro), el que antes se publica primero. Sólo para el
   * panel de control, que permite verlos y probarlos antes del día; la web
   * y la proyección nunca los muestran antes de tiempo.
   */
  readonly scheduled = computed<readonly Announcement[]>(() => {
    const today = startOfDay(new Date(this.clock.now())).getTime();
    return this.config.announcements
      .filter((a) => a.publishedOn && startOfDay(parseIsoDate(a.publishedOn)).getTime() > today)
      .sort((a, b) => parseIsoDate(a.publishedOn!).getTime() - parseIsoDate(b.publishedOn!).getTime());
  });

  /**
   * Cualquier anuncio por id (vigente, programado o pasado). Sólo para la
   * vista de prueba del panel (`/media/ecran?rol=solo&anunt=<id>`).
   */
  anyById(id: string | null | undefined): Announcement | null {
    if (!id) return null;
    return this.config.announcements.find((a) => a.id === id) ?? null;
  }

  /** Anuncio vigente por id, o `null` si no existe o ya ha caducado. */
  byId(id: string | null | undefined): Announcement | null {
    if (!id) return null;
    return this.active().find((a) => a.id === id) ?? null;
  }

  /** Anuncio del archivo por id (caducado hace poco), o `null`. */
  pastById(id: string | null | undefined): Announcement | null {
    if (!id) return null;
    return this.past().find((a) => a.id === id) ?? null;
  }
}

/**
 * Número de diapositivas que ocupa un anuncio al proyectarse: la mayor
 * `part` de sus secciones proyectables (1 si ninguna la indica).
 */
export function announcementParts(announcement: Announcement): number {
  return announcement.sections
    .filter((s) => !s.webOnly)
    .reduce((max, s) => Math.max(max, s.part ?? 1), 1);
}

function sortKey(announcement: Announcement): number {
  return parseIsoDate(announcement.date ?? announcement.expiresOn).getTime();
}
