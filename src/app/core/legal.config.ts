/**
 * Datos legales de la web y servicios de terceros que intervienen en ella.
 *
 * Es la fuente de la página «Informații legale și confidențialitate»
 * (`/legal`). **La lista de servicios es una declaración**: tiene que decir la
 * verdad sobre lo que hace la web. Regla para quien añada o quite algo que
 * hable con otro servidor (una fuente, un mapa, un formulario, analítica):
 * **se actualiza aquí en el mismo cambio**.
 *
 * Los textos explicativos de cada servicio están en `legal.{ro,es}.json`
 * (`legal.services.<id>.purpose`); aquí sólo va lo que no se traduce.
 */

/** Cuándo habla la web con el servicio. */
export type ThirdPartyWhen =
  /** Al cargar cualquier página (o las que se indican en su texto). */
  | 'always'
  /** Sólo si el visitante lo pide: pulsa, envía o activa algo. */
  | 'on_request';

export interface ThirdPartyService {
  /** Clave bajo `legal.services.*`. */
  readonly id: string;
  /** Nombre propio del servicio: no se traduce. */
  readonly name: string;
  readonly when: ThirdPartyWhen;
  /** Su política de privacidad (o su web, si no publica una dirección fija). */
  readonly policyUrl: string;
}

export interface LegalInfo {
  /**
   * Titular de la web, tal y como figura legalmente. Por defecto, el titular
   * de las cuentas de donativos (`donations.holder`).
   */
  readonly entity: string | null;
  /** NIF de la entidad, o `null` si no se ha facilitado (no se pinta). */
  readonly taxId: string | null;
  /**
   * Número de inscripción en el Registro de Entidades Religiosas, o `null` si
   * no se ha facilitado (no se pinta).
   */
  readonly registry: string | null;
  /**
   * Buzón al que se piden el acceso, la corrección o el borrado de datos
   * (apartado «Drepturile tale»). Es el de quien mantiene la web, que es
   * quien puede retirar un dato; no el buzón general de la iglesia.
   */
  readonly privacyEmail: string;
  /** Última revisión de la página (`YYYY-MM-DD`). */
  readonly updatedOn: string;
}

export const LEGAL_INFO: LegalInfo = {
  // Nombre legal confirmado por la iglesia el 16/11/2026.
  entity: 'IGLESIA APOSTOLICA ELIM',
  // TODO(iglesia): pendientes de que los facilite la iglesia. Mientras sean
  // `null`, la página no pinta esas líneas. **No rellenar con datos buscados
  // en internet**: tienen que salir de la documentación de la entidad.
  taxId: null,
  registry: null,
  privacyEmail: 'beni.cioarba@gmail.com',
  updatedOn: '2026-11-24',
};

/**
 * Servicios de terceros, en el orden en que se explican.
 *
 * `web3forms`, `onesignal`, `goatcounter` y `sentry` sólo se listan si están
 * configurados (`contact.form.accessKey`, `oneSignalAppId`, `TELEMETRY_CONFIG`):
 * lo filtra la página.
 */
export const THIRD_PARTY_SERVICES: readonly ThirdPartyService[] = [
  {
    id: 'github',
    name: 'GitHub Pages',
    when: 'always',
    policyUrl: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  },
  {
    // Visitas sin cookies (`core/telemetry`): sólo si hay código de sitio.
    id: 'goatcounter',
    name: 'GoatCounter',
    when: 'always',
    policyUrl: 'https://www.goatcounter.com/help/privacy',
  },
  {
    // Errores (`core/telemetry`): sólo si hay DSN, y sólo cuando falla algo.
    id: 'sentry',
    name: 'Sentry',
    when: 'always',
    policyUrl: 'https://sentry.io/privacy/',
  },
  {
    // Miniaturas y la API de datos (directo, vídeo del día de Împreună).
    id: 'youtube_images',
    name: 'YouTube',
    when: 'always',
    policyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'impreuna',
    name: 'proiectulimpreuna.ro',
    when: 'always',
    policyUrl: 'https://proiectulimpreuna.ro',
  },
  {
    id: 'youtube_player',
    name: 'YouTube',
    when: 'on_request',
    policyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    when: 'on_request',
    policyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'web3forms',
    name: 'Web3Forms',
    when: 'on_request',
    policyUrl: 'https://web3forms.com/privacy',
  },
  {
    id: 'onesignal',
    name: 'OneSignal',
    when: 'on_request',
    policyUrl: 'https://onesignal.com/privacy_policy',
  },
];
