import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../church.config';
import { ClockService } from '../services/clock.service';
import { IMPREUNA_WP_API, IMPREUNA_YOUTUBE_UPLOADS, YOUTUBE_PLAYLIST_ITEMS_API } from './impreuna.config';
import { ImpreunaService } from './impreuna.service';

const KEY = 'elim.impreuna.2026.read';

/** Reloj fijo: el servicio sólo lee `now()`. */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 11, 9).getTime());
  readonly pageVisible = signal(true);
}

function setup(date: Date): { service: ImpreunaService; http: HttpTestingController; clock: FixedClock } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      { provide: ClockService, useClass: FixedClock },
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, youtubeApiKey: 'test-key' } },
    ],
  });
  const clock = TestBed.inject(ClockService) as unknown as FixedClock;
  clock.now.set(date.getTime());
  return { service: TestBed.inject(ImpreunaService), http: TestBed.inject(HttpTestingController), clock };
}

/** Entrada de la web del proyecto («Ziua 317 – … – 13 Noiembrie 2026»). */
const wpPost = (day: number, video: string) => ({
  id: 90000 + day,
  title: { rendered: `Ziua ${day} &#8211; Nume Prenume &#8211; ${day - 304} Noiembrie 2026` },
  content: { rendered: `<p>Iacov</p><iframe src="https://www.youtube.com/embed/${video}?feature=oembed"></iframe>` },
});

/** Subida del canal del Cult («Ziua 317 Nume Prenume», a las 22:15 UTC de la víspera). */
const upload = (day: number, video: string) => ({
  snippet: {
    title: `Ziua ${day} Nume Prenume`,
    publishedAt: new Date(Date.UTC(2026, 0, day - 1, 22, 15)).toISOString(),
    resourceId: { videoId: video },
  },
});

const isYoutube = (r: { url: string }) => r.url === YOUTUBE_PLAYLIST_ITEMS_API;
const isWordpress = (r: { url: string }) => r.url === IMPREUNA_WP_API;

describe('ImpreunaService', () => {
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => TestBed.resetTestingModule());

  it('sabe qué día es y compone el día en el idioma activo', () => {
    const { service } = setup(new Date(2026, 10, 11, 9));
    expect(service.todayDay()).toBe(315);
    const today = service.view(315)!;
    expect(today.isToday).toBe(true);
    expect(today.reading).toBe('Iacov 1');
    expect(today.media?.video).toBe('91WVKzPoQ-4');
    expect(service.view(316)?.isFuture).toBe(true);
    expect(service.view(400)).toBeNull();
  });

  it('marca, cuenta y recuerda lo leído', () => {
    const { service } = setup(new Date(2026, 10, 11, 9));
    service.toggleRead(315);
    expect(service.readCount()).toBe(1);
    expect(service.streak()).toBe(1);
    expect(service.behind()).toBe(314);
    expect(localStorage.getItem(KEY)).toBe('[315]');

    service.markThrough(315);
    expect(service.behind()).toBe(0);
    expect(service.streak()).toBe(315);

    TestBed.resetTestingModule();
    expect(setup(new Date(2026, 10, 11, 9)).service.readCount()).toBe(315);
  });

  it('marcar todo hasta hoy se puede deshacer', () => {
    const { service } = setup(new Date(2026, 10, 11, 9));
    service.toggleRead(300);
    const previous = service.markThrough(315);
    expect(service.readCount()).toBe(315);
    expect([...previous]).toEqual([300]);
    service.restoreRead(previous);
    expect(service.readCount()).toBe(1);
    expect(localStorage.getItem(KEY)).toBe('[300]');
  });

  it('un almacenamiento corrupto no rompe la página', () => {
    localStorage.setItem(KEY, '{no es json');
    expect(setup(new Date(2026, 10, 11, 9)).service.readCount()).toBe(0);
  });

  it('no consulta nada si ya tiene el vídeo y la entrada de hoy', () => {
    const { service, http } = setup(new Date(2026, 10, 11, 9));
    service.refresh();
    http.expectNone(() => true);
  });

  it('el vídeo llega de YouTube en cuanto se sube, antes que la web del proyecto', () => {
    const { service, http } = setup(new Date(2026, 10, 13, 0, 20)); // día 317, 00:20
    service.refresh();
    const yt = http.expectOne(isYoutube);
    expect(yt.request.params.get('playlistId')).toBe(IMPREUNA_YOUTUBE_UPLOADS);
    expect(yt.request.params.get('key')).toBe('test-key');
    yt.flush({ items: [upload(317, 'abcdefghijk'), upload(316, 'bcdefghijkl'), { snippet: { title: 'Gala Credo TV' } }] });
    http.expectOne(isWordpress).flush([]); // la web aún no ha publicado

    expect(service.view(317)?.media).toEqual({ video: 'abcdefghijk', speaker: 'Nume Prenume', postId: null });
    expect(service.view(316)?.media?.video).toBe('bcdefghijkl');
  });

  it('la entrada de la web llega después y no borra el vídeo; YouTube ya no se consulta', () => {
    const { service, http, clock } = setup(new Date(2026, 10, 13, 0, 20));
    service.refresh();
    http.expectOne(isYoutube).flush({ items: [upload(317, 'abcdefghijk')] });
    http.expectOne(isWordpress).flush([]);

    clock.now.set(new Date(2026, 10, 13, 0, 40).getTime());
    service.refresh(); // antes de 30 min: nada
    http.expectNone(() => true);

    clock.now.set(new Date(2026, 10, 13, 1, 0).getTime());
    service.refresh();
    http.expectNone(isYoutube); // ya tiene el vídeo
    http.expectOne(isWordpress).flush([{ ...wpPost(317, 'abcdefghijk') }]);
    expect(service.view(317)?.media).toEqual({ video: 'abcdefghijk', speaker: 'Nume Prenume', postId: 90317 });

    clock.now.set(new Date(2026, 10, 13, 9, 0).getTime());
    service.refresh(); // completo: no pregunta más
    http.expectNone(() => true);
  });

  it('si YouTube falla, el vídeo llega igual por la web del proyecto', () => {
    const { service, http } = setup(new Date(2026, 10, 13, 9));
    service.refresh();
    http.expectOne(isYoutube).flush('cuota', { status: 403, statusText: 'Forbidden' });
    http.expectOne(isWordpress).flush([wpPost(317, 'abcdefghijk')]);
    expect(service.view(317)?.media?.video).toBe('abcdefghijk');
  });

  it('descarta subidas que no son del proyecto o de otra edición', () => {
    const { service } = setup(new Date(2026, 10, 13, 9));
    service.mergeYoutube([
      { snippet: { title: 'Conferința Națională', publishedAt: '2026-11-12T10:00:00Z', resourceId: { videoId: 'aaaaaaaaaaa' } } },
      // «Ziua 2» subida en noviembre: de otra edición o un error, no del día 2.
      { snippet: { title: 'Ziua 2 Alguien', publishedAt: '2026-11-12T22:15:00Z', resourceId: { videoId: 'bbbbbbbbbbb' } } },
    ]);
    expect(service.view(2)?.media?.video).toBe('sNNr5Gm_lGY'); // el de la instantánea, intacto
  });

  it('si nada responde, sigue con la instantánea y no reintenta en bucle', () => {
    const { service, http } = setup(new Date(2026, 10, 13, 9));
    service.refresh();
    http.expectOne(isYoutube).flush('caída', { status: 503, statusText: 'Service Unavailable' });
    http.expectOne(isWordpress).flush('caída', { status: 503, statusText: 'Service Unavailable' });
    expect(service.view(315)?.media?.video).toBe('91WVKzPoQ-4');
    expect(service.view(317)?.media).toBeNull();
    service.refresh();
    http.expectNone(() => true);
  });
});
