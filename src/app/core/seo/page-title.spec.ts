import { APP_NAME } from '../site';
import { appWindowTitle, siteTitle } from './page-title';

const es = (pageTitle: string, isHome = false) => ({ brand: 'Iglesia Elim Arganda', pageTitle, isHome });

describe('siteTitle', () => {
  it('portada: la marca delante; el resto, detrás', () => {
    expect(siteTitle(es('Iglesia pentecostal rumana', true))).toBe('Iglesia Elim Arganda · Iglesia pentecostal rumana');
    expect(siteTitle(es('Contacto'))).toBe('Contacto · Iglesia Elim Arganda');
  });

  it('sin título de página, sólo la marca', () => {
    expect(siteTitle(es(''))).toBe('Iglesia Elim Arganda');
    expect(siteTitle(es('Iglesia Elim Arganda', true))).toBe('Iglesia Elim Arganda');
  });
});

describe('appWindowTitle', () => {
  it('empieza siempre por el nombre de la app, también en español y en interiores', () => {
    for (const parts of [es('Iglesia pentecostal rumana', true), es('Contacto'), es('')]) {
      expect(appWindowTitle(APP_NAME, parts).startsWith(APP_NAME)).toBe(true);
    }
    expect(appWindowTitle(APP_NAME, es('Contacto'))).toBe('Biserica Elim Arganda · Contacto');
  });

  it('sin título de página, sólo el nombre de la app', () => {
    expect(appWindowTitle(APP_NAME, es(''))).toBe(APP_NAME);
  });
});
