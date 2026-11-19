import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Announcement, CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../church.config';
import { fakeClock } from '../testing/fake-clock';
import { PRESENTATION_BLOCKS } from '../presentation/blocks';
import { AnnouncementsService } from './announcements.service';
import { BibleReadingService } from './bible-reading.service';
import { PresentationBlocksService } from './presentation-blocks.service';

const NOW = '2026-11-16T10:00:00';

const announcement = (id: string): Announcement =>
  ({ id, title: id, sections: [], publishedOn: '2026-11-01', expiresOn: '2026-11-30' }) as unknown as Announcement;

function setup(announcements: readonly Announcement[] = [announcement('a1'), announcement('a2')]) {
  const clock = fakeClock(NOW);
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      clock.provider,
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, announcements } },
    ],
  });
  return { blocks: TestBed.inject(PresentationBlocksService), clock };
}

/** Como `setup`, sustituyendo un servicio (para provocar un fallo). */
function setupWith(override: Provider) {
  const clock = fakeClock(NOW);
  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      clock.provider,
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, announcements: [announcement('a1')] } },
      override,
    ],
  });
  return { blocks: TestBed.inject(PresentationBlocksService) };
}

/** Las preferencias del operador viven en `localStorage`: cada test empieza limpio. */
function clearPreferences(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('iglesia-redes.presentation')) localStorage.removeItem(key);
  }
}

describe('PresentationBlocksService (qué se proyecta)', () => {
  beforeEach(clearPreferences);
  afterEach(() => {
    TestBed.resetTestingModule();
    clearPreferences();
  });

  it('por defecto todo va en automático y hay algo que proyectar', () => {
    const { blocks } = setup();
    expect(blocks.states().every((s) => s.isAuto)).toBe(true);
    expect(blocks.activeBlockIds().length).toBeGreaterThan(0);
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
    expect(blocks.hasManualOverrides()).toBe(false);
  });

  it('las claves de las diapositivas son únicas (el carrusel las sigue por clave)', () => {
    const { blocks } = setup();
    const keys = blocks.activeSlides().map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('un anuncio vigente = una diapositiva; ocultarlo la quita', () => {
    const { blocks } = setup();
    const announced = () => blocks.activeSlides().filter((s) => s.block === 'announcements').map((s) => s.announcement?.id);
    expect(announced()).toEqual(['a1', 'a2']);
    blocks.setAnnouncementVisible('a1', false);
    expect(announced()).toEqual(['a2']);
    blocks.setAnnouncementVisible('a1', true);
    expect(announced()).toEqual(['a1', 'a2']);
  });

  it('apagar un bloque lo saca de la proyección; volver a automático lo recupera', () => {
    const { blocks } = setup();
    const id = blocks.activeBlockIds()[0];
    blocks.setEnabled(id, false);
    expect(blocks.activeBlockIds()).not.toContain(id);
    expect(blocks.states().find((s) => s.id === id)?.isAuto).toBe(false);
    expect(blocks.hasManualOverrides()).toBe(true);

    blocks.resetToAuto(id);
    expect(blocks.activeBlockIds()).toContain(id);
    expect(blocks.hasManualOverrides()).toBe(false);
  });

  it('encender a mano un bloque que el automático dejaría fuera lo proyecta', () => {
    const { blocks } = setup();
    const off = blocks.states().find((s) => !s.enabled);
    if (!off) return; // hoy todos los bloques tienen contenido: nada que forzar
    blocks.setEnabled(off.id, true);
    expect(blocks.activeBlockIds()).toContain(off.id);
  });

  it('NUNCA se queda en blanco: con todo apagado sigue habiendo un bloque y una diapositiva', () => {
    const { blocks } = setup();
    for (const state of blocks.states()) blocks.setEnabled(state.id, false);
    expect(blocks.activeCount()).toBe(0);
    expect(blocks.activeBlockIds().length).toBe(1);
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
  });

  it('con todos los anuncios ocultos y sólo ese bloque encendido, proyecta otro con contenido', () => {
    const { blocks } = setup();
    for (const state of blocks.states()) blocks.setEnabled(state.id, state.id === 'announcements');
    blocks.setAnnouncementVisible('a1', false);
    blocks.setAnnouncementVisible('a2', false);
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
  });

  it('las preferencias del operador sobreviven a recargar la página', () => {
    const first = setup();
    const id = first.blocks.activeBlockIds()[0];
    first.blocks.setEnabled(id, false);
    first.blocks.setAnnouncementVisible('a2', false);
    TestBed.resetTestingModule();

    const second = setup();
    expect(second.blocks.states().find((s) => s.id === id)?.override).toBe(false);
    expect(second.blocks.announcementStates().find((a) => a.announcement.id === 'a2')?.visible).toBe(false);
  });

  it('«restablecer todo» vuelve al automático y lo deja guardado', () => {
    const first = setup();
    first.blocks.setEnabled(first.blocks.activeBlockIds()[0], false);
    first.blocks.setAnnouncementVisible('a1', false);
    first.blocks.resetAll();
    expect(first.blocks.hasManualOverrides()).toBe(false);
    TestBed.resetTestingModule();

    const second = setup();
    expect(second.blocks.hasManualOverrides()).toBe(false);
  });

  it('el orden de proyección se puede cambiar y restablecer', () => {
    const { blocks } = setup();
    const original = [...blocks.allBlockIds()];
    blocks.moveBlock(0, 2);
    expect(blocks.allBlockIds()).not.toEqual(original);
    expect([...blocks.allBlockIds()].sort()).toEqual([...original].sort());
    expect(blocks.hasCustomOrder()).toBe(true);
    blocks.resetOrder();
    expect(blocks.allBlockIds()).toEqual(original);
  });

  it('el orden y los títulos salen del registro de bloques', () => {
    const { blocks } = setup();
    expect(blocks.allBlockIds()).toEqual(PRESENTATION_BLOCKS.map((b) => b.id));
    expect(blocks.states().map((s) => s.titleKey)).toEqual(PRESENTATION_BLOCKS.map((b) => b.titleKey));
  });

  it('un bloque cuya regla automática revienta queda fuera; los demás siguen', () => {
    const { blocks } = setupWith({
      provide: BibleReadingService,
      useValue: {
        hasReading: () => {
          throw new Error('dato roto');
        },
      },
    });
    const bible = blocks.states().find((s) => s.id === 'bible');
    expect(bible?.autoAvailable).toBe(false);
    expect(blocks.activeBlockIds()).not.toContain('bible');
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
  });

  it('un bloque que revienta al preparar sus diapositivas queda fuera; la proyección no se queda en blanco', () => {
    let broken = false;
    const { blocks } = setupWith({
      provide: AnnouncementsService,
      useValue: {
        projectable: () => {
          if (broken) throw new Error('anuncio mal formado');
          return [announcement('a1')];
        },
        active: () => [announcement('a1')],
      },
    });
    expect(blocks.activeSlides().some((s) => s.block === 'announcements')).toBe(true);
    broken = true;
    expect(blocks.expand('announcements')).toEqual([]);
    // Con todo lo demás apagado y el único bloque roto, sigue habiendo algo.
    for (const state of blocks.states()) blocks.setEnabled(state.id, state.id === 'announcements');
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
  });

  it('sin anuncios vigentes el bloque de anuncios no se proyecta solo', () => {
    const { blocks } = setup([]);
    expect(blocks.states().find((s) => s.id === 'announcements')?.autoAvailable).toBe(false);
    expect(blocks.activeBlockIds()).not.toContain('announcements');
    expect(blocks.activeSlides().length).toBeGreaterThan(0);
  });
});
