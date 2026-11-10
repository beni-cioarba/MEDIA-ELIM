import {
  buildVCard,
  guestsDisplayUrl,
  guestsUrl,
  initialsOf,
  nextServiceState,
  parseGuestLang,
  splitAddress,
  vcardEscape,
} from './guests.view';

describe('guests.view', () => {
  describe('guestsUrl', () => {
    it('apunta a /invitati/ con barra final (GitHub Pages responde 200 sin redirección)', () => {
      expect(guestsUrl('https://elimarganda.com/', 'ro')).toBe('https://elimarganda.com/invitati/');
    });

    it('añade la barra si la URL pública no la trae', () => {
      expect(guestsUrl('https://elimarganda.com', 'ro')).toBe('https://elimarganda.com/invitati/');
    });

    it('sólo el español lleva ?lang (el rumano es el idioma por defecto)', () => {
      expect(guestsUrl('https://elimarganda.com/', 'es')).toBe('https://elimarganda.com/invitati/?lang=es');
    });
  });

  describe('guestsDisplayUrl', () => {
    it('quita el protocolo, el www y la barra final', () => {
      expect(guestsDisplayUrl('https://www.elimarganda.com/')).toBe('elimarganda.com/invitati');
      expect(guestsDisplayUrl('http://elimarganda.com')).toBe('elimarganda.com/invitati');
    });
  });

  describe('parseGuestLang', () => {
    it('acepta ro y es sin importar mayúsculas ni espacios', () => {
      expect(parseGuestLang('es')).toBe('es');
      expect(parseGuestLang(' RO ')).toBe('ro');
    });

    it('ignora valores vacíos o desconocidos', () => {
      expect(parseGuestLang(null)).toBeNull();
      expect(parseGuestLang(undefined)).toBeNull();
      expect(parseGuestLang('')).toBeNull();
      expect(parseGuestLang('en')).toBeNull();
      expect(parseGuestLang('es-ES')).toBeNull();
    });
  });

  describe('splitAddress', () => {
    it('parte «calle, CP localidad» (la dirección real de la iglesia)', () => {
      expect(splitAddress('Av. de Madrid, 30, 28500 Arganda del Rey')).toEqual({
        street: 'Av. de Madrid, 30',
        postalCode: '28500',
        locality: 'Arganda del Rey',
      });
    });

    it('devuelve null si no hay código postal de cinco cifras', () => {
      expect(splitAddress('Arganda del Rey')).toBeNull();
      expect(splitAddress('Calle Mayor 1, 2850 Arganda')).toBeNull();
    });
  });

  describe('vcardEscape', () => {
    it('escapa barra invertida, coma, punto y coma y saltos de línea (RFC 6350)', () => {
      expect(vcardEscape('a\\b, c; d\ne')).toBe('a\\\\b\\, c\\; d\\ne');
    });
  });

  describe('buildVCard', () => {
    const card = {
      name: 'Biserica ELIM Arganda',
      phone: '+34678668977',
      email: 'pavelnegrusier@gmail.com',
      address: 'Av. de Madrid, 30, 28500 Arganda del Rey',
      region: 'Madrid',
      country: 'España',
      url: 'https://elimarganda.com/',
      note: 'Biserica evanghelică penticostală din Arganda del Rey.',
    };

    it('genera una vCard 3.0 con CRLF y cierre', () => {
      const vcard = buildVCard(card);
      expect(vcard.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
      expect(vcard.endsWith('END:VCARD\r\n')).toBe(true);
      expect(vcard).not.toMatch(/[^\r]\n/);
    });

    it('lleva nombre, teléfono, correo, web y nota', () => {
      const vcard = buildVCard(card);
      expect(vcard).toContain('FN:Biserica ELIM Arganda\r\n');
      expect(vcard).toContain('TEL;TYPE=CELL,VOICE:+34678668977\r\n');
      expect(vcard).toContain('EMAIL;TYPE=INTERNET:pavelnegrusier@gmail.com\r\n');
      expect(vcard).toContain('URL:https://elimarganda.com/\r\n');
      expect(vcard).toContain('NOTE:Biserica evanghelică penticostală din Arganda del Rey.\r\n');
    });

    it('parte la dirección en sus campos (calle con la coma escapada)', () => {
      expect(buildVCard(card)).toContain(
        'ADR;TYPE=WORK:;;Av. de Madrid\\, 30;Arganda del Rey;Madrid;28500;España\r\n',
      );
    });

    it('sin forma reconocible, la dirección entera va como calle', () => {
      expect(buildVCard({ ...card, address: 'Arganda del Rey' })).toContain(
        'ADR;TYPE=WORK:;;Arganda del Rey;;Madrid;;España\r\n',
      );
    });

    it('sin nota no pinta la línea NOTE', () => {
      expect(buildVCard({ ...card, note: undefined })).not.toContain('NOTE:');
    });
  });

  describe('nextServiceState', () => {
    it('en marcha cuando ya empezó (minutos ≤ 0)', () => {
      expect(nextServiceState({ minutesUntil: 0, daysAway: 0 })).toBe('live');
      expect(nextServiceState({ minutesUntil: -30, daysAway: 0 })).toBe('live');
    });

    it('hoy, mañana o más adelante', () => {
      expect(nextServiceState({ minutesUntil: 45, daysAway: 0 })).toBe('today');
      expect(nextServiceState({ minutesUntil: 900, daysAway: 1 })).toBe('tomorrow');
      expect(nextServiceState({ minutesUntil: 4000, daysAway: 3 })).toBe('later');
    });
  });

  describe('initialsOf', () => {
    it('dos iniciales en mayúscula, ignorando espacios de más', () => {
      expect(initialsOf('Ioan Lauran')).toBe('IL');
      expect(initialsOf('  natanael  beniamin cioarba ')).toBe('NB');
      expect(initialsOf('Ierasmina')).toBe('I');
    });
  });
});
