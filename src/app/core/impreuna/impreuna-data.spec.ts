/**
 * Integridad de los datos generados por `npm run impreuna:sync` y del
 * cableado del módulo (rutas, menú, textos). Si el script o una edición
 * nueva rompen algo, falla aquí y no en la pantalla de alguien.
 */
import { APP_ROUTES } from '../../app.routes';
import { DEFAULT_CHURCH_CONFIG } from '../church.config';
import { APP_PATHS, STAGE_BLOCK_SLUGS } from '../navigation/app-paths';
import { MAIN_NAV } from '../navigation/navigation.config';
import { NavItem } from '../navigation/nav.model';
import booksJson from '../bible/bible-books.json';
import media from './data/2026.media.json';
import plan from './data/2026.plan.json';
import { EDITION_STATS, IMPREUNA_EDITION, PLAN_DAYS, editionToday, planDay } from './impreuna-edition';
import { daysInYear } from './impreuna-plan';
import { parseReading } from '../bible/bible-refs';
import packEs from '../../../assets/i18n/impreuna.es.json';
import packRo from '../../../assets/i18n/impreuna.ro.json';
import mainEs from '../../../assets/i18n/es.json';
import mainRo from '../../../assets/i18n/ro.json';

function lookup(dictionary: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dictionary,
  );
}

const flatNav = (items: readonly NavItem[]): NavItem[] => items.flatMap((i) => [i, ...flatNav(i.children ?? [])]);

describe('Proiectul Împreună · plan generado', () => {
  it('tiene un día por cada día del año y todos sus libros existen', () => {
    expect(plan.readings.length).toBe(daysInYear(plan.year));
    const books = Object.keys(booksJson.books);
    for (const reading of plan.readings) {
      const refs = parseReading(reading);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(books).toContain(ref.book);
        expect(ref.chapter).toBeGreaterThan(0);
        if (ref.from) expect(ref.to).toBeGreaterThanOrEqual(ref.from);
      }
    }
  });

  it('respeta lo auditado en 2026: salto en el día 82 y días de referencia', () => {
    expect(IMPREUNA_EDITION.youversionSkipped).toEqual([82]);
    expect(planDay(1)?.refs[0].code).toBe('MAT.1');
    expect(planDay(82)?.refs.map((r) => r.code)).toEqual(['PSA.35', 'PRO.8.22-31']);
    expect(planDay(314)?.refs.map((r) => r.code)).toEqual(['PSA.124', 'PSA.125', 'PRO.26.17-21']);
    expect(planDay(315)?.refs[0].code).toBe('JAS.1');
    expect(planDay(315)?.youversionDay).toBe(316);
    expect(planDay(365)?.refs[0].code).toBe('REV.22');
    expect(planDay(0)).toBeNull();
    expect(planDay(366)).toBeNull();
  });

  it('las cifras salen del plan: todo el NT, 150 salmos y 31 proverbios', () => {
    expect(EDITION_STATS.days).toBe(365);
    expect(EDITION_STATS.ntBooks).toBe(27);
    expect(EDITION_STATS.psalms).toBe(150);
    expect(EDITION_STATS.proverbs).toBe(31);
    expect(EDITION_STATS.ntDays + EDITION_STATS.wisdomDays).toBe(365);
    expect(PLAN_DAYS.length).toBe(365);
  });

  it('sitúa una fecha antes, durante y después de la edición', () => {
    expect(editionToday(new Date(2025, 11, 31, 12))).toEqual({ status: 'before', day: 1 });
    expect(editionToday(new Date(2026, 10, 11, 9))).toEqual({ status: 'running', day: 315 });
    expect(editionToday(new Date(2027, 0, 2, 9))).toEqual({ status: 'ended', day: 365 });
  });
});

describe('Proiectul Împreună · vídeos generados', () => {
  it('cada fila es [id de YouTube, ponente, id de la entrada] y no pasa del plan', () => {
    expect(media.year).toBe(plan.year);
    expect(media.days.length).toBeLessThanOrEqual(plan.readings.length);
    for (const row of media.days as unknown as readonly (readonly [string | null, string | null, number | null] | null)[]) {
      if (!row) continue;
      if (row[0] !== null) expect(row[0]).toMatch(/^[\w-]{11}$/);
      if (row[2] !== null) expect(Number.isInteger(row[2])).toBe(true);
    }
  });

  it('los nombres de los ponentes van compuestos (NFC): se pintan y se buscan bien', () => {
    const speakers = (media.days as unknown as ([string | null, string | null, number | null] | null)[])
      .map((row) => row?.[1])
      .filter((s): s is string => !!s);
    expect(speakers.filter((s) => s !== s.normalize('NFC'))).toEqual([]);
  });
});

describe('Proiectul Împreună · cableado', () => {
  const layout = APP_ROUTES.find((r) => r.path === '' && r.children);
  const child = (path: string) => layout?.children?.find((r) => r.path === path);

  it('hoy, un día y el plan cuelgan del shell con su paquete de textos', () => {
    for (const path of [
      APP_PATHS.impreuna,
      `${APP_PATHS.impreuna}/${APP_PATHS.impreunaDay}/:day`,
      `${APP_PATHS.impreuna}/${APP_PATHS.impreunaPlan}`,
    ]) {
      expect(child(path)?.resolve?.['i18n']).toBeDefined();
    }
  });

  it('la hoja imprimible va antes del shell y fuera de los buscadores', () => {
    const print = APP_ROUTES.find((r) => r.path === `${APP_PATHS.impreuna}/${APP_PATHS.impreunaPrint}`);
    expect(print).toBeDefined();
    expect(APP_ROUTES.indexOf(print!)).toBeLessThan(APP_ROUTES.indexOf(layout!));
    expect((print?.data?.['seo'] as { noindex?: boolean }).noindex).toBe(true);
  });

  it('está en el menú, dentro de Program', () => {
    const program = MAIN_NAV.find((i) => i.id === 'program');
    expect(flatNav(program?.children ?? []).some((i) => i.path === `/${APP_PATHS.impreuna}`)).toBe(true);
  });

  it('las claves del menú y del SEO existen en los dos idiomas', () => {
    for (const key of [
      'nav.impreuna',
      'nav.impreuna_desc',
      'nav_hub.impreuna_day',
      'seo.impreuna.title',
      'seo.impreuna.description',
      'seo.impreuna_plan.title',
      'seo.impreuna_plan.description',
      'seo.impreuna_print.title',
    ]) {
      expect(typeof lookup(mainRo, key)).toBe('string');
      expect(typeof lookup(mainEs, key)).toBe('string');
    }
  });

  it('la diapositiva existe en la proyección y su URL web lleva a la página', () => {
    expect(STAGE_BLOCK_SLUGS.impreuna).toBe(APP_PATHS.impreuna);
    const redirect = child(`${APP_PATHS.media}/${APP_PATHS.impreuna}`);
    expect(redirect?.redirectTo).toBe(APP_PATHS.impreuna);
    // Va antes del comodín `media/:blockId`, que la capturaría como bloque.
    const wildcard = layout?.children?.findIndex((r) => r.path === `${APP_PATHS.media}/:blockId`) ?? -1;
    expect(layout?.children?.indexOf(redirect!)).toBeLessThan(wildcard);
    for (const key of ['impreuna_slide.title', 'impreuna_slide.qr', 'impreuna_slide.fast', 'impreuna_slide.starts_tomorrow']) {
      expect(typeof lookup(mainRo, key)).toBe('string');
      expect(typeof lookup(mainEs, key)).toBe('string');
    }
  });

  it('el paquete del módulo tiene los mismos textos en rumano y en español', () => {
    const keys = (o: unknown, prefix = ''): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(keys(packEs).sort()).toEqual(keys(packRo).sort());
  });
});

describe('Proiectul Împreună · anuncio de lanzamiento', () => {
  const launch = DEFAULT_CHURCH_CONFIG.announcements.find((a) => a.id === 'proiectul_impreuna');

  it('existe, lleva a la página y caduca después de dos domingos', () => {
    expect(launch).toBeDefined();
    expect(launch!.lead).toContain(`elimarganda.com/${APP_PATHS.impreuna}`);
    expect(launch!.expiresOn).toBe('2026-11-22');
  });

  it('cabe en el cartel: límites de redacción de 35-announcements.md', () => {
    const a = launch!;
    expect(a.title.length).toBeLessThanOrEqual(56);
    expect(a.lead.length).toBeLessThanOrEqual(130);
    expect(a.sections.length).toBeLessThanOrEqual(2);
    for (const section of a.sections) {
      expect(section.items.length).toBeLessThanOrEqual(6);
      for (const item of section.items) expect(item.label.length).toBeLessThanOrEqual(40);
    }
    expect(a.footnote?.length ?? 0).toBeLessThanOrEqual(85);
    expect(a.verse?.text.length ?? 0).toBeLessThanOrEqual(60);
  });
});
