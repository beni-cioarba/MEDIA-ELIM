import { withShareLang } from './share-lang';

describe('withShareLang', () => {
  it('añade ?lang al enlace de cualquier página', () => {
    expect(withShareLang('https://elimarganda.com/despre', 'es')).toBe('https://elimarganda.com/despre?lang=es');
    expect(withShareLang('https://elimarganda.com/', 'ro')).toBe('https://elimarganda.com/?lang=ro');
  });

  it('sustituye un ?lang anterior y conserva el resto (parámetros y ancla)', () => {
    expect(withShareLang('https://elimarganda.com/program?lang=ro&x=1#ev-3', 'es')).toBe(
      'https://elimarganda.com/program?lang=es&x=1#ev-3',
    );
  });

  it('invitados: el español va en la ruta, con barra final y sin ?lang', () => {
    expect(withShareLang('https://elimarganda.com/invitati', 'es')).toBe('https://elimarganda.com/invitati/es/');
    expect(withShareLang('https://elimarganda.com/invitati/es?lang=es', 'es')).toBe(
      'https://elimarganda.com/invitati/es/',
    );
  });

  it('invitados en rumano: /invitati/ con ?lang=ro (manda sobre el idioma guardado de quien lo abre)', () => {
    expect(withShareLang('https://elimarganda.com/invitati/es', 'ro')).toBe('https://elimarganda.com/invitati/?lang=ro');
  });

  it('no toca la hoja del QR ni rompe con una URL no válida', () => {
    expect(withShareLang('https://elimarganda.com/invitati/qr', 'es')).toBe('https://elimarganda.com/invitati/qr?lang=es');
    expect(withShareLang('no es una url', 'es')).toBe('no es una url');
  });
});
