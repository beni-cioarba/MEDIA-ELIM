import { TestBed } from '@angular/core/testing';
import { Announcement, CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../church.config';
import { fakeClock } from '../testing/fake-clock';
import { AnnouncementsService, announcementParts } from './announcements.service';

/** Un anuncio mínimo: sólo lo que mira el servicio. */
function announcement(partial: Partial<Announcement> & Pick<Announcement, 'id' | 'expiresOn'>): Announcement {
  return { title: partial.id, sections: [], ...partial } as Announcement;
}

const ANNOUNCEMENTS: readonly Announcement[] = [
  announcement({ id: 'caducado', expiresOn: '2026-11-10' }),
  announcement({ id: 'hoy-caduca', expiresOn: '2026-11-16' }),
  announcement({ id: 'vigente', publishedOn: '2026-11-01', expiresOn: '2026-11-30' }),
  announcement({ id: 'programado', publishedOn: '2026-11-20', expiresOn: '2026-11-27' }),
  announcement({ id: 'semana', publishedOn: '2026-11-15', expiresOn: '2026-11-21' }),
  announcement({ id: 'solo-web', expiresOn: '2026-11-25', webOnly: true }),
  announcement({ id: 'muy-viejo', expiresOn: '2026-06-01' }),
];

function setup(now = '2026-11-16T10:00:00') {
  const clock = fakeClock(now);
  TestBed.configureTestingModule({
    providers: [
      clock.provider,
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, announcements: ANNOUNCEMENTS } },
    ],
  });
  return { service: TestBed.inject(AnnouncementsService), clock };
}

const ids = (list: readonly Announcement[]) => list.map((a) => a.id);

describe('AnnouncementsService (vigencia por fecha)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('vigente = publicado y sin caducar; el día de caducidad todavía cuenta', () => {
    const { service } = setup();
    expect(ids(service.active()).sort()).toEqual(['hoy-caduca', 'semana', 'solo-web', 'vigente']);
    expect(service.hasActive()).toBe(true);
  });

  it('ordena por la fecha más cercana (la del acto o, si no hay, la de caducidad)', () => {
    const { service } = setup();
    expect(ids(service.active())).toEqual(['hoy-caduca', 'semana', 'solo-web', 'vigente']);
  });

  it('un anuncio programado no se ve hasta su día, y entonces aparece solo', () => {
    const { service, clock } = setup();
    expect(service.byId('programado')).toBeNull();
    expect(ids(service.scheduled())).toEqual(['programado']);

    clock.set('2026-11-20T00:05:00');
    expect(service.byId('programado')?.id).toBe('programado');
    expect(service.scheduled()).toEqual([]);
  });

  it('al pasar la medianoche de su último día, deja de estar vigente sin recargar', () => {
    const { service, clock } = setup();
    expect(service.byId('hoy-caduca')).not.toBeNull();
    clock.set('2026-11-17T00:01:00');
    expect(service.byId('hoy-caduca')).toBeNull();
    expect(ids(service.past())).toContain('hoy-caduca');
  });

  it('lo que sólo es para la web no se proyecta', () => {
    const { service } = setup();
    expect(ids(service.projectable())).not.toContain('solo-web');
    expect(ids(service.active())).toContain('solo-web');
  });

  it('el archivo guarda 90 días, del más reciente al más antiguo', () => {
    const { service } = setup();
    expect(ids(service.past())).toEqual(['caducado']);
    expect(service.pastById('muy-viejo')).toBeNull();
    // Aunque ya no se liste, un enlace antiguo sigue encontrando el anuncio.
    expect(service.anyById('muy-viejo')?.id).toBe('muy-viejo');
  });

  it('«de toda la semana»: sin fecha de acto y con 6 días o más de vigencia', () => {
    const { service } = setup();
    expect(ids(service.weekLong()).sort()).toEqual(['semana', 'vigente']);
  });

  it('sin id no encuentra nada (enlace mal formado)', () => {
    const { service } = setup();
    expect(service.byId(null)).toBeNull();
    expect(service.byId(undefined)).toBeNull();
    expect(service.anyById('')).toBeNull();
  });
});

describe('announcementParts', () => {
  it('cuenta las partes proyectables (las secciones sólo-web no suman)', () => {
    const a = announcement({
      id: 'x',
      expiresOn: '2026-12-01',
      sections: [
        { kind: 'list', items: [], part: 1 },
        { kind: 'list', items: [], part: 2 },
        { kind: 'list', items: [], part: 3, webOnly: true },
      ] as unknown as Announcement['sections'],
    });
    expect(announcementParts(a)).toBe(2);
  });

  it('sin secciones es una sola parte', () => {
    expect(announcementParts(announcement({ id: 'y', expiresOn: '2026-12-01' }))).toBe(1);
  });
});
