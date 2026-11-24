import { manifestHref, syncManifestLink } from './manifest-link';

describe('syncManifestLink', () => {
  it('enlaza el manifiesto del idioma y no lo reescribe si ya es el suyo', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.head.innerHTML = '<link rel="manifest" href="manifest.webmanifest">';
    const link = doc.querySelector('link')!;
    const spy = vi.spyOn(link, 'setAttribute');

    syncManifestLink(doc, 'ro');
    expect(spy).not.toHaveBeenCalled();
    syncManifestLink(doc, 'es');
    expect(link.getAttribute('href')).toBe(manifestHref('es'));
    syncManifestLink(doc, 'ro');
    expect(link.getAttribute('href')).toBe('manifest.webmanifest');
  });

  it('sin enlace (pruebas, vistas sin cabecera) no hace nada', () => {
    expect(() => syncManifestLink(document.implementation.createHTMLDocument(''), 'es')).not.toThrow();
  });
});
