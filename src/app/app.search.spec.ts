import { TestBed } from '@angular/core/testing';
import { Route, provideRouter } from '@angular/router';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { APP_ROUTES, APP_SEARCH_SOURCES } from './app.routes';
import { BAPTISMS } from './core/baptisms.config';
import { Announcement, CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from './core/church.config';
import { FAMILY_PRAYER_WEEKS } from './core/family-prayer.config';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';
import { PEOPLE_INDEX } from './core/leadership.config';
import { APP_PATHS, blockPath } from './core/navigation/app-paths';
import { PRAYER_CAUSES } from './core/prayer-causes.config';
import { searchablePages } from './core/search/page-entries';
import { SEARCH_KINDS, SEARCH_SOURCES, SearchEntry } from './core/search/search.model';
import { SearchService } from './core/search/search.service';
import { fold, words } from './core/search/search-text';
import { LanguageService } from './core/services/language.service';
import { fakeClock } from './core/testing/fake-clock';
import { TALENT_CONTEST } from './core/talent-contest.config';

// El buscador de verdad: todos los módulos, sus textos y sus datos. Aquí se
// comprueba lo que un módulo nuevo puede romper sin darse cuenta.

const announcement = (partial: Partial<Announcement> & Pick<Announcement, 'id' | 'expiresOn'>): Announcement =>
  ({ title: partial.id, lead: '', sections: [], ...partial }) as Announcement;

const ANNOUNCEMENTS: readonly Announcement[] = [
  announcement({ id: 'zvigente', title: 'Anunt zvigente', publishedOn: '2026-11-01', expiresOn: '2026-11-30' }),
  announcement({ id: 'zcaducado', title: 'Anunt zcaducado', expiresOn: '2026-11-10' }),
  announcement({ id: 'zprogramado', title: 'Anunt zprogramado', publishedOn: '2026-11-25', expiresOn: '2026-12-01' }),
];

async function setup(lang: 'ro' | 'es' = 'ro', now = '2026-11-24T10:00:00') {
  const clock = fakeClock(now);
  TestBed.configureTestingModule({
    providers: [
      clock.provider,
      provideRouter(APP_ROUTES),
      provideHttpClient(),
      provideTranslateService({ fallbackLang: 'ro', loader: { provide: TranslateLoader, useClass: InlineTranslateLoader } }),
      { provide: SEARCH_SOURCES, useValue: APP_SEARCH_SOURCES },
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, announcements: ANNOUNCEMENTS } },
    ],
  });
  const language = TestBed.inject(LanguageService);
  await firstValueFrom(TestBed.inject(TranslateService).use(lang));
  language.current.set(lang);
  // Los paquetes esperan al diccionario principal.
  (language as unknown as { markReady: () => void }).markReady();
  const service = TestBed.inject(SearchService);
  await service.prepare();
  return { service, clock };
}

const ids = (service: SearchService, query: string): string[] => service.search(query).hits.map((h) => h.entry.id);
const paths = (service: SearchService, query: string): string[] => service.search(query).hits.map((h) => h.entry.path);
const entriesOf = (service: SearchService): readonly SearchEntry[] =>
  (service as unknown as { _index: () => { entries: readonly SearchEntry[] } })._index().entries;

/** Todo lo que se puede leer o encontrar de una entrada. */
const textOf = (e: SearchEntry): string =>
  [e.title, e.altTitle, e.context, e.body, ...(typeof e.keywords === 'string' ? [e.keywords] : (e.keywords ?? []))].join(' ');

describe.each(['ro', 'es'] as const)('Buscador completo (%s)', (lang) => {
  let service: SearchService;

  beforeAll(async () => {
    ({ service } = await setup(lang));
  }, 60_000);

  afterAll(() => TestBed.resetTestingModule());

  it('se prepara con todos los módulos (ningún proveedor falla)', () => {
    expect(service.status()).toBe('ready');
    const modules = new Set(entriesOf(service).map((e) => e.id.split(':')[0]));
    for (const source of APP_SEARCH_SOURCES) expect(modules, source.id).toContain(source.id);
  });

  it('entradas bien formadas: ids únicos, tipo conocido, textos traducidos', () => {
    const entries = entriesOf(service);
    const all = entries.map((e) => e.id);
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
    for (const e of entries) {
      expect(SEARCH_KINDS, e.id).toContain(e.kind);
      expect(e.title.trim(), e.id).not.toBe('');
      // Una clave sin traducir se ve («nav.gallery», «departments.youth.x»).
      expect(e.title, e.id).not.toMatch(/^[a-z_]+(\.[\w-]+)+$/);
      expect(`${e.context ?? ''} ${e.body ?? ''}`, e.id).not.toMatch(/\b(nav|seo|departments|credo|guests|search|leadership|talent_contest|legal|about)\.[a-z_]+\.?[\w.]*\b/);
      expect(textOf(e), e.id).not.toContain('{{');
    }
  });

  it('cada resultado lleva a una ruta que existe y nunca a una herramienta', () => {
    const shell: readonly Route[] = APP_ROUTES.find((r) => r.path === '' && r.children)!.children!;
    const patterns = shell
      .filter((r) => r.path !== '**' && r.data?.['preload'] !== false && r.redirectTo === undefined)
      .map((r) => new RegExp(`^/${(r.path ?? '').replace(/:[^/]+/g, '[^/]+')}$`));
    for (const e of entriesOf(service)) {
      expect(patterns.some((p) => p.test(e.path)), e.path).toBe(true);
    }
  });

  it('encuentra las secciones en los dos idiomas, con y sin diacríticos', () => {
    const expected: readonly [string, string][] = [
      ['rugaciune pentru familii', `/${APP_PATHS.familyPrayer}`],
      ['Rugăciune pentru familii', `/${APP_PATHS.familyPrayer}`],
      ['bautismos', `/${APP_PATHS.baptisms}`],
      ['botezuri', `/${APP_PATHS.baptisms}`],
      ['donar', `/${APP_PATHS.donate}`],
      ['iban', `/${APP_PATHS.donate}`],
      ['donează', `/${APP_PATHS.donate}`],
      ['horario', blockPath('weekly')],
      ['program saptamanal', blockPath('weekly')],
      ['directo', blockPath('streams')],
      ['in direct', blockPath('streams')],
      ['fotos', blockPath('gallery')],
      ['poze', blockPath('gallery')],
      ['cómo llegar', blockPath('location')],
      ['coro', `/${APP_PATHS.departments}/cor`],
      ['tineret', `/${APP_PATHS.departments}/tineret`],
      ['jóvenes', `/${APP_PATHS.departments}/tineret`],
      ['anunturi', `/${APP_PATHS.announcements}`],
      ['avisos', `/${APP_PATHS.announcements}`],
      ['contacto', `/${APP_PATHS.contact}`],
      ['teléfono', `/${APP_PATHS.contact}`],
      ['quienes somos', `/${APP_PATHS.about}`],
      ['talantul', `/${APP_PATHS.talentContest}`],
      ['aparcamiento', `/${APP_PATHS.guests}`],
      ['parcare', `/${APP_PATHS.guests}`],
      ['credo', `/${APP_PATHS.credo}`],
      ['cookies', `/${APP_PATHS.legal}`],
    ];
    for (const [query, path] of expected) expect(paths(service, query).slice(0, 4), query).toContain(path);
  });

  it('encuentra personas de la conducere, artículos, libros de la Biblia y eventos por venir', () => {
    expect(service.search('negrusier').hits[0].entry.title).toBe('Pavel Negrușier');
    expect(service.search('naomi muresan').hits[0].entry.title).toBe('Naomi Mureșan');
    expect(service.search('tomoiaga').hits.some((h) => h.entry.kind === 'people')).toBe(true);
    expect(service.search(lang === 'ro' ? 'sfanta scriptura' : 'sagrada escritura').hits.some((h) => h.entry.kind === 'belief')).toBe(true);
    expect(service.search('castellon').hits[0].entry.kind).toBe('event');
    expect(service.search('salmos').hits.some((h) => h.entry.kind === 'bible')).toBe(true);
    expect(service.search('psalmii').hits.some((h) => h.entry.kind === 'bible')).toBe(true);
  });

  it('respeta la vigencia: ni caducado, ni programado, ni eventos pasados', () => {
    expect(ids(service, 'zvigente')).toEqual(['anunturi:zvigente']);
    expect(ids(service, 'zcaducado')).toEqual([]);
    expect(ids(service, 'zprogramado')).toEqual([]);
    // La evanghelizare del 8/11 ya pasó el 24/11.
    expect(entriesOf(service).some((e) => e.fragment === 'ev-evanghelizare_apc_2026_11_08')).toBe(false);
  });

  it('antes de escribir ofrece lo vigente primero', () => {
    const suggestions = service.suggestions();
    expect(suggestions.length).toBeLessThanOrEqual(8);
    expect(suggestions[0].id).toBe('anunturi:zvigente');
    expect(suggestions.map((e) => e.path)).toContain(blockPath('weekly'));
  });

  it('las páginas salen del mapa de rutas, sin herramientas ni duplicados de idioma', () => {
    const pages = searchablePages(APP_ROUTES).map((p) => p.path);
    expect(pages).toContain('/');
    expect(pages).toContain(blockPath('gallery'));
    for (const tool of ['/media/control', '/media/ecran', '/impreuna/tipar', '/invitati/qr', '/stil', '/invitati/es']) {
      expect(pages).not.toContain(tool);
    }
  });

  // ── Privacidad (docs/ai/78-search.md) ─────────────────────────────────

  /** Las palabras de un nombre, juntas y en cualquier orden, en una entrada. */
  const mentions = (e: SearchEntry, name: string): boolean => {
    const inEntry = new Set(words(textOf(e)));
    return words(name).every((w) => inEntry.has(w));
  };
  /** Quien además está en el organigrama (o en un directo, como predicador) es público por eso. */
  const publicNames = [...PEOPLE_INDEX.values()].map((p) => words(p.name));
  const isPublic = (name: string): boolean => publicNames.some((p) => words(name).every((w) => p.includes(w)));

  it('ningún candidato al bautismo: ni nombre, ni padres, ni testimonio, ni edad, ni procedencia', () => {
    const baptismEntries = entriesOf(service).filter((e) => e.id.startsWith(`${APP_PATHS.baptisms}:`));
    expect(baptismEntries).toHaveLength(BAPTISMS.length);
    for (const e of baptismEntries) expect(e.path.split('/').length, e.path).toBeLessThanOrEqual(3);
    for (const candidate of BAPTISMS.flatMap((b) => b.candidates)) {
      const found = entriesOf(service).filter((e) => mentions(e, candidate.name));
      if (!isPublic(candidate.name)) expect(found.map((e) => e.id), candidate.name).toEqual([]);
      for (const e of baptismEntries) {
        const text = fold(textOf(e));
        // (La descripción pública de la página nombra el pueblo de la iglesia; las entradas, no.)
        if (candidate.origin) expect(text, candidate.id).not.toContain(fold(candidate.origin));
        if (candidate.parents) expect(text, candidate.id).not.toContain(fold(candidate.parents));
        if (candidate.story?.summary) expect(text).not.toContain(fold(candidate.story.summary));
      }
    }
  });

  it('ninguna familia de oración ni nadie de las causas (datos de salud)', () => {
    const families = FAMILY_PRAYER_WEEKS.flatMap((w) => w.families);
    const prayer = entriesOf(service).filter(
      (e) => e.kind === 'prayer' || e.path.startsWith(`/${APP_PATHS.familyPrayer}`) || e.path.startsWith(`/${APP_PATHS.prayerCauses}`),
    );
    for (const e of prayer) {
      for (const family of families) expect(mentions(e, `${family.surname} ${family.names}`), e.id).toBe(false);
      for (const person of PRAYER_CAUSES.causes.flatMap((c) => c.people ?? [])) expect(mentions(e, person), e.id).toBe(false);
    }
    expect(entriesOf(service).some((e) => families.some((f) => f.message?.some((m) => e.body?.includes(m))))).toBe(false);
  });

  it('ningún teléfono de particulares', () => {
    for (const enroller of TALENT_CONTEST.enrollers) {
      for (const e of entriesOf(service)) expect(textOf(e)).not.toContain(enroller.phoneDisplay);
    }
  });
});

describe('Buscador: reconstrucción y fallos', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('al cambiar el día vuelve a mirar las vigencias', async () => {
    const { service, clock } = await setup('ro');
    expect(ids(service, 'zprogramado')).toEqual([]);
    clock.set('2026-11-25T08:00:00');
    await service.prepare();
    expect(ids(service, 'zprogramado')).toEqual(['anunturi:zprogramado']);
  }, 60_000);

  it('si un módulo falla se busca en los demás, y se reintenta al volver a abrir', async () => {
    const { service } = await setup('ro');
    const sources = (service as unknown as { sources: { load: () => Promise<unknown> }[] }).sources;
    let calls = 0;
    const failing = { id: 'roto', load: () => (calls++, Promise.reject(new Error('chunk'))) };
    (service as unknown as { sources: unknown }).sources = [...sources, failing];
    (service as unknown as { builtFor: string | null }).builtFor = null;
    await service.prepare();
    expect(service.status()).toBe('ready');
    expect(ids(service, 'donează').length).toBeGreaterThan(0);
    await service.prepare();
    expect(calls).toBe(2);
  }, 60_000);
});
