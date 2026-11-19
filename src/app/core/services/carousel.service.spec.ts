import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PresentationService } from '../presentation.service';
import { CarouselService } from './carousel.service';
import { PresentationBlocksService, PresentationSlide } from './presentation-blocks.service';
import { PresentationDisplayService } from './presentation-display.service';
import { PresentationSyncService, SyncCommand, SyncState } from './presentation-sync.service';

/** Diapositiva mínima: el carrusel sólo mira `key` y `block`. */
const slide = (key: string, block = 'weekly'): PresentationSlide =>
  ({ key, block, titleKey: `blocks.${key}` }) as unknown as PresentationSlide;

/**
 * Canal de sincronización de pruebas: una sola ventana, que es líder. Una
 * orden enviada se ejecuta al momento en el escenario registrado, que es lo
 * que hace el canal real cuando no hay nadie más.
 */
class FakeSync {
  readonly isLeader = signal(true);
  readonly remoteState = signal<SyncState | null>(null);
  readonly canPublish = signal(false);
  readonly published: SyncState[] = [];
  joined: string | null = null;
  private hooks: { onCommand(c: SyncCommand): void; onRemoteState(s: SyncState, inherit: boolean): void } | null = null;

  registerStage(hooks: NonNullable<FakeSync['hooks']>): void {
    this.hooks = hooks;
  }
  join(role: string): void {
    this.joined = role;
  }
  leave(): void {
    this.joined = null;
  }
  publishState(state: SyncState): void {
    this.published.push(state);
  }
  sendCommand(command: SyncCommand): void {
    this.hooks?.onCommand(command);
  }
  /** Llega el estado de otra ventana (la que manda). */
  remote(state: SyncState, inherit = false): void {
    this.hooks?.onRemoteState(state, inherit);
  }
}

function setup(initial: readonly PresentationSlide[]) {
  const slides = signal<readonly PresentationSlide[]>(initial);
  const sync = new FakeSync();
  const fullscreen = signal(false);
  const autoAdvance = signal(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: PresentationBlocksService, useValue: { activeSlides: slides.asReadonly() } },
      {
        provide: PresentationDisplayService,
        useValue: { autoAdvance: autoAdvance.asReadonly(), durationForSlide: () => 20 },
      },
      { provide: PresentationSyncService, useValue: sync },
      {
        provide: PresentationService,
        useValue: { isFullscreen: fullscreen.asReadonly(), isNativeFullscreen: signal(false), role: signal(null) },
      },
    ],
  });
  const carousel = TestBed.inject(CarouselService);
  TestBed.tick();
  return { carousel, slides, sync, fullscreen, autoAdvance };
}

describe('CarouselService (motor del carrusel)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('empieza en la primera y avanza en círculo', () => {
    const { carousel } = setup([slide('a'), slide('b'), slide('c')]);
    expect(carousel.currentIndex()).toBe(0);
    carousel.next();
    carousel.next();
    expect(carousel.currentSlide()?.key).toBe('c');
    carousel.next();
    expect(carousel.currentSlide()?.key).toBe('a');
  });

  it('retrocede en círculo desde la primera', () => {
    const { carousel } = setup([slide('a'), slide('b'), slide('c')]);
    carousel.prev();
    expect(carousel.currentSlide()?.key).toBe('c');
  });

  it('ir a un índice fuera de rango no hace nada', () => {
    const { carousel } = setup([slide('a'), slide('b')]);
    carousel.setIndex(1);
    carousel.setIndex(7);
    carousel.setIndex(-1);
    expect(carousel.currentIndex()).toBe(1);
  });

  it('si se quitan diapositivas, el índice se recorta: nunca apunta al vacío', () => {
    const { carousel, slides } = setup([slide('a'), slide('b'), slide('c')]);
    carousel.setIndex(2);
    slides.set([slide('a')]);
    expect(carousel.currentIndex()).toBe(0);
    expect(carousel.currentSlide()?.key).toBe('a');
  });

  it('sin diapositivas no revienta: índice 0 y ninguna activa', () => {
    const { carousel, slides } = setup([slide('a')]);
    slides.set([]);
    expect(carousel.count()).toBe(0);
    expect(carousel.currentIndex()).toBe(0);
    expect(carousel.currentSlide()).toBeNull();
    carousel.next();
    carousel.prev();
    expect(carousel.currentSlide()).toBeNull();
  });

  it('siguiendo una clave, la diapositiva se mantiene aunque cambie el orden', () => {
    const { carousel, slides, sync } = setup([slide('a'), slide('b'), slide('c')]);
    sync.sendCommand({ type: 'gotoKey', key: 'b' });
    expect(carousel.currentIndex()).toBe(1);
    // El operador reordena los bloques: «b» pasa al final.
    slides.set([slide('a'), slide('c'), slide('b')]);
    expect(carousel.currentSlide()?.key).toBe('b');
    expect(carousel.currentIndex()).toBe(2);
  });

  it('isActive / isBlockActive describen la diapositiva en pantalla', () => {
    const { carousel } = setup([slide('a', 'weekly'), slide('b', 'gallery')]);
    expect(carousel.isActive('a')).toBe(true);
    expect(carousel.isBlockActive('gallery' as never)).toBe(false);
    carousel.next();
    expect(carousel.isActive('b')).toBe(true);
    expect(carousel.isBlockActive('gallery' as never)).toBe(true);
  });

  it('pausa y reanudación conservan el tiempo transcurrido', () => {
    const { carousel } = setup([slide('a'), slide('b')]);
    expect(carousel.isPaused()).toBe(false);
    carousel.togglePause();
    expect(carousel.isPaused()).toBe(true);
    expect(carousel.timing().paused).toBe(true);
    expect(carousel.timing().elapsedAtPause).toBeGreaterThanOrEqual(0);
    carousel.togglePause();
    expect(carousel.isPaused()).toBe(false);
    expect(carousel.timing().elapsedAtPause).toBe(0);
  });

  it('con una sola diapositiva o en modo manual no hay cuenta atrás', () => {
    const one = setup([slide('a')]);
    expect(one.carousel.timing().durationMs).toBe(0);
    TestBed.resetTestingModule();

    const manual = setup([slide('a'), slide('b')]);
    expect(manual.carousel.timing().durationMs).toBe(20_000);
    manual.autoAdvance.set(false);
    expect(manual.carousel.timing().durationMs).toBe(0);
  });

  it('una ventana que no manda copia el estado de la que manda', () => {
    const { carousel, sync } = setup([slide('a'), slide('b'), slide('c')]);
    sync.isLeader.set(false);
    sync.remote({ index: 2, slideKey: 'c', paused: true, startedAt: 1000, elapsedAtPause: 500, durationMs: 30_000, count: 3, fullscreen: true });
    expect(carousel.currentSlide()?.key).toBe('c');
    expect(carousel.isPaused()).toBe(true);
  });

  it('la que manda ignora el estado ajeno, salvo que lo herede al tomar el relevo', () => {
    const { carousel, sync } = setup([slide('a'), slide('b'), slide('c')]);
    const state: SyncState = { index: 1, slideKey: 'b', paused: false, startedAt: 1000, elapsedAtPause: 0, durationMs: 30_000, count: 3, fullscreen: false };
    sync.remote(state);
    expect(carousel.currentIndex()).toBe(0);
    sync.remote(state, true);
    expect(carousel.currentSlide()?.key).toBe('b');
  });

  it('al proyectar se une al canal y al dejar de proyectar lo suelta', () => {
    const { sync, fullscreen } = setup([slide('a'), slide('b')]);
    expect(sync.joined).toBeNull();
    fullscreen.set(true);
    TestBed.tick();
    expect(sync.joined).toBe('inline');
    fullscreen.set(false);
    TestBed.tick();
    expect(sync.joined).toBeNull();
  });
});
