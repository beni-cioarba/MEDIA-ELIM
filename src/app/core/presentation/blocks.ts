import type { ChurchConfig } from '../church.config';
import type { AnnouncementsService } from '../services/announcements.service';
import type { BibleReadingService } from '../services/bible-reading.service';
import type { PrayerCausesService } from '../services/prayer-causes.service';
import type { ScheduleService } from '../services/schedule.service';
import type { TalentContestService } from '../services/talent-contest.service';

/**
 * **Registro de bloques proyectables**: el único sitio que dice qué bloques
 * hay, en qué orden salen por defecto, cuánto dura cada diapositiva y cuándo
 * se proyecta solo.
 *
 * De aquí derivan el tipo `PresentationBlockId`, el orden y los títulos del
 * carrusel y del panel (`PresentationBlocksService`), los tiempos por defecto
 * (`PresentationDisplayService`) y las reglas automáticas.
 *
 * ── Añadir un bloque ────────────────────────────────────────────────
 *  1. Una entrada aquí (en su sitio del orden).
 *  2. Su componente en `features/stage/blocks/<x>-block/` y su `@case` en
 *     `stage.component.html` (dentro de un `@defer`: carga perezosa).
 *  3. Si tiene página propia en la web, su slug en `STAGE_BLOCK_SLUGS`.
 * El renderizado se queda en la plantilla del escenario a propósito: así las
 * entradas de cada bloque están tipadas y comprobadas al compilar
 * (`strictTemplates`); un `NgComponentOutlet` genérico las perdería.
 *
 * ── Un bloque roto no tumba la proyección ────────────────────────────
 * `auto` y la expansión en diapositivas se evalúan **cada bloque por
 * separado y protegidos**: si uno lanza una excepción (un dato mal formado),
 * ese bloque se queda fuera del carrusel, se registra el error y los demás
 * siguen proyectándose (`PresentationBlocksService`).
 */

/** Lo que una regla automática puede consultar. */
export interface BlockSources {
  readonly config: ChurchConfig;
  readonly announcements: AnnouncementsService;
  readonly schedule: ScheduleService;
  readonly bible: BibleReadingService;
  readonly prayerCauses: PrayerCausesService;
  readonly talentContest: TalentContestService;
  /** ¿Hay una semana de familias que proyectar (la vigente o la siguiente elegida)? */
  readonly hasFamiliesWeek: () => boolean;
  /** ¿Hay un botez con candidatos en los próximos días (o hoy)? */
  readonly hasBaptismSoon: () => boolean;
}

export interface BlockDef {
  readonly id: string;
  /** Clave i18n del título (puntos del carrusel, panel de ajustes). */
  readonly titleKey: string;
  /** Segundos por diapositiva por defecto (el operador lo cambia en el panel). */
  readonly durationS: number;
  /** ¿Se proyecta solo? Regla automática: sólo si tiene contenido. */
  readonly auto: (sources: BlockSources) => boolean;
}

/**
 * En el **orden de proyección por defecto** (23/11/2026, fijado por el usuario):
 * primero lo que la congregación necesita leer (anuncios, eventos, lectura y
 * programa de la semana), después la oración (las causas de la iglesia y luego
 * las familias) y el botez, y al final lo permanente (directos, galería, redes,
 * concurso, Împreună y el QR de la web).
 */
export const PRESENTATION_BLOCKS = [
  {
    id: 'announcements',
    titleKey: 'announcements.title',
    // Los anuncios se leen, no se miran: mucho más que una lista de redes.
    durationS: 30,
    auto: (s) => s.announcements.projectable().length > 0,
  },
  { id: 'upcoming', titleKey: 'upcoming.title', durationS: 15, auto: (s) => s.schedule.hasUpcomingEvents() },
  {
    id: 'bible',
    titleKey: 'bible.title',
    // 10 s (01/11/2026, a petición del usuario; antes 20).
    durationS: 10,
    auto: (s) => s.bible.hasReading(),
  },
  { id: 'weekly', titleKey: 'weekly.title', durationS: 12, auto: (s) => s.config.weeklyProgram.length > 0 },
  {
    id: 'causes',
    titleKey: 'prayer_causes.title',
    // Una sola diapositiva con toda la lista, que se lee en voz alta y se ora
    // por ella. 30 s (04/10/2026, a petición del usuario; antes 60): si se ora
    // más rato, el operador lo alarga desde el panel.
    durationS: 30,
    auto: (s) => s.prayerCauses.hasCauses,
  },
  {
    id: 'families',
    titleKey: 'family_prayer.title',
    // Resumen y fichas comparten tiempo: una ficha lleva foto y uno o dos
    // párrafos que se leen en voz alta mientras se ve la familia.
    durationS: 20,
    auto: (s) => s.hasFamiliesWeek(),
  },
  {
    // Botez: los candidatos, uno a uno, mientras se presentan en el culto.
    // Sólo la semana del botez (y el día): `BaptismsService.presentedSoon`.
    id: 'baptism',
    titleKey: 'baptism_slide.title',
    // Un retrato y su mărturie: se lee mientras suena su audio. En el culto
    // se pasan a mano (atajo «Botez» del panel).
    durationS: 20,
    auto: (s) => s.hasBaptismSoon(),
  },
  { id: 'streams', titleKey: 'streams.title', durationS: 12, auto: () => true },
  { id: 'gallery', titleKey: 'gallery.title', durationS: 12, auto: (s) => s.config.mediaEvents.length > 0 },
  { id: 'socials', titleKey: 'socials.section_title', durationS: 12, auto: (s) => s.config.socials.length > 0 },
  {
    // Talantul în Negoț: hacia el final, antes del QR.
    id: 'talent',
    titleKey: 'talent_contest.title',
    durationS: 25,
    // Mientras quede alguna fase por delante (o se esté celebrando).
    auto: (s) => s.talentContest.focusPhase() !== null,
  },
  {
    // Proiectul Împreună: casi al final; no sale sola (ver `auto`).
    id: 'impreuna',
    titleKey: 'impreuna_slide.title',
    durationS: 15,
    // Fuera de la presentación por defecto (petición del usuario,
    // 15/11/2026): no sale sola. El operador puede encenderla en el panel.
    auto: () => false,
  },
  {
    // El QR, al final de la vuelta: «todo esto está en la web». Basta con que
    // dé tiempo a sacar el móvil y escanear.
    id: 'website',
    titleKey: 'website_slide.block',
    durationS: 15,
    auto: () => true,
  },
] as const satisfies readonly BlockDef[];

/** Identificador estable de cada bloque proyectable del carrusel. */
export type PresentationBlockId = (typeof PRESENTATION_BLOCKS)[number]['id'];

/** Segundos por defecto de cada bloque. */
export const DEFAULT_BLOCK_DURATIONS_S = Object.fromEntries(
  PRESENTATION_BLOCKS.map((block) => [block.id, block.durationS]),
) as Readonly<Record<PresentationBlockId, number>>;
