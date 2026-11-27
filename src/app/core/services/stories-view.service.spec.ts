import { TestBed } from '@angular/core/testing';
import { StoriesViewService } from './stories-view.service';

const KEY = 'iglesia-redes.stories.view';

function setup(): StoriesViewService {
  TestBed.resetTestingModule();
  return TestBed.inject(StoriesViewService);
}

describe('StoriesViewService', () => {
  beforeEach(() => localStorage.clear());

  it('por defecto, cronológica y sin dejar nada guardado', () => {
    const service = setup();
    expect(service.view()).toBe('timeline');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('recuerda la elección para la próxima visita', () => {
    setup().set('series');
    expect(localStorage.getItem(KEY)).toBe('series');
    expect(setup().view()).toBe('series');
  });

  it('volver a la cronológica borra la clave', () => {
    const service = setup();
    service.set('compact');
    service.set('timeline');
    expect(service.view()).toBe('timeline');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('un valor desconocido guardado vuelve a la cronológica', () => {
    localStorage.setItem(KEY, 'grid');
    expect(setup().view()).toBe('timeline');
  });
});
