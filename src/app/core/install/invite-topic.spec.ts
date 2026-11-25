import es from '../../../assets/i18n/install.es.json';
import ro from '../../../assets/i18n/install.ro.json';
import { inviteTopic } from './invite-topic';

describe('inviteTopic', () => {
  it('habla de la página en la que se está', () => {
    expect(inviteTopic('/impreuna/ziua/12', 1, false)).toBe('citire');
    expect(inviteTopic('/impreuna', 1, true)).toBe('citire_ios');
    expect(inviteTopic('/media/transmisiuni', 1, true)).toBe('direct');
    expect(inviteTopic('/anunturi/x', 1, false)).toBe('anunturi');
    expect(inviteTopic('/media/program', 1, false)).toBe('program');
    expect(inviteTopic('/program', 1, false)).toBe('program');
  });

  it('en las demás alternan los generales', () => {
    expect(inviteTopic('/', 2, false)).toBe('rapid');
    expect(inviteTopic('/', 3, false)).toBe('acces');
    // Prefijo de palabra, no de ruta.
    expect(inviteTopic('/programul-altceva', 2, false)).toBe('rapid');
  });

  it('todos tienen texto en los dos idiomas', () => {
    for (const pack of [ro, es]) {
      expect(Object.keys(pack.install.reminder).sort()).toEqual(
        ['acces', 'anunturi', 'citire', 'citire_ios', 'direct', 'program', 'rapid'],
      );
    }
  });
});
