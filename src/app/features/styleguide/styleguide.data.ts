/**
 * Datos de la guía de estilos: lo que se enseña y con qué texto.
 *
 * Están aquí y no en la plantilla para que **añadir una pieza al catálogo
 * sea añadir una entrada a una lista**, no maquetar otra sección. La
 * plantilla sólo sabe recorrer estas estructuras.
 *
 * No se traduce: la guía es documentación interna para quien construye la
 * app (y para la IA), no contenido público.
 */

/** Grupo de muestras de color: nombre visible, token CSS y para qué sirve. */
export interface SwatchGroup {
  readonly title: string;
  readonly note: string;
  readonly swatches: readonly { readonly token: string; readonly use: string }[];
}

export const COLOR_GROUPS: readonly SwatchGroup[] = [
  {
    title: 'Marca',
    note: 'Navy para la estructura y el texto principal; el oro es acento, nunca relleno.',
    swatches: [
      { token: '--c-primary', use: 'Titulares, botones primarios, iconos activos' },
      { token: '--c-primary-deep', use: 'Fondos oscuros: pie, panel de control' },
      { token: '--c-primary-darkest', use: 'Lienzo de consola' },
      { token: '--c-gold', use: 'Acento sobre oscuro, indicador en vivo' },
      { token: '--c-gold-deep', use: 'Acento sobre claro (cumple contraste)' },
      { token: '--c-gold-tint', use: 'Fondo del elemento activo' },
    ],
  },
  {
    title: 'Superficies',
    note: 'Tres niveles: lienzo, superficie y realce. El agrupador suave sustituye a la caja fuerte.',
    swatches: [
      { token: '--c-bg', use: 'Lienzo de la página' },
      { token: '--c-surface', use: 'Tarjetas, paneles, filas' },
      { token: '--c-surface-2', use: 'Cabeceras de panel, campos deshabilitados' },
      { token: '--c-surface-accent', use: 'Agrupador de sección (bloque de contenido)' },
      { token: '--c-veil', use: 'Fondo al pasar el puntero' },
      { token: '--c-hairline', use: 'Filete: la separación por defecto' },
    ],
  },
  {
    title: 'Estado',
    note: 'Sólo para estado real (resultado de una acción o del sistema), nunca decorativo.',
    swatches: [
      { token: '--c-success', use: 'Confirmado, correcto' },
      { token: '--c-warning', use: 'Atención, caduca pronto' },
      { token: '--c-danger', use: 'Error, destructivo' },
      { token: '--c-info', use: 'Informativo, neutro' },
      { token: '--c-live', use: 'Emisión en directo' },
    ],
  },
];

/** Un nivel de la escala tipográfica, con su papel. */
export interface TypeSample {
  readonly token: string;
  readonly role: string;
  readonly sample: string;
}

export const TYPE_SCALE: readonly TypeSample[] = [
  { token: '--fs-display', role: 'Portada: una vez por página como mucho', sample: 'Bine ai venit acasă' },
  { token: '--fs-h1', role: 'Título de página', sample: 'Anunțuri' },
  { token: '--fs-h2', role: 'Título de sección', sample: 'Programare săptămânală' },
  { token: '--fs-h3', role: 'Título de bloque o tarjeta', sample: 'Citirea Bibliei' },
  { token: '--fs-body-lg', role: 'Entradilla, resumen que se lee en voz alta', sample: 'Lo primero que se lee de un aviso.' },
  { token: '--fs-body', role: 'Cuerpo', sample: 'El texto normal de la aplicación.' },
  { token: '--fs-sm', role: 'Secundario: metadatos, pies', sample: 'Sábado, 26 de septiembre · 18:00' },
  { token: '--fs-xs', role: 'Etiqueta en versalitas', sample: 'INVITAT' },
];

/** Escalas numéricas (espacio, radio, elevación) que se pintan como barras. */
export const SPACE_STEPS = ['1', '2', '3', '4', '5', '6', '8', '10', '12'] as const;
export const RADIUS_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', 'pill'] as const;
export const ELEVATION_STEPS = ['1', '2', '3', '4'] as const;

/** Entrada del catálogo de primitivas: qué es, cuándo usarla y su marcado. */
export interface PrimitiveDoc {
  readonly id: string;
  readonly name: string;
  readonly when: string;
  readonly snippet: string;
}

/**
 * El marcado de cada pieza. Es el **mismo** que se pinta arriba en la
 * muestra: la plantilla lo inyecta con `[innerHTML]` (contenido propio,
 * estático y sin datos de usuario) para que no haya dos versiones que se
 * desincronicen.
 */
export const PRIMITIVES: readonly PrimitiveDoc[] = [
  {
    id: 'card',
    name: 'ui-card',
    when: 'Caja de contenido por defecto. Con --interactive si se pulsa, --accent para agrupar una sección y --soft cuando la tarjeta lleva imagen o icono y basta un tono más para reconocerla.',
    snippet: `<article class="ui-card">
  <h3 class="ui-section-head__title">Título</h3>
  <p>Contenido de la tarjeta.</p>
</article>`,
  },
  {
    id: 'row',
    name: 'ui-row',
    when: 'Fila de lista densa (bandeja, lista de diapositivas, tabla ligera). Hereda la densidad del contexto: en .ui-dense mide 36 px. Con --wrap el título se ajusta a dos líneas en vez de recortarse: obligatorio en columnas estrechas.',
    snippet: `<ul class="ui-list">
  <li class="ui-row ui-row--interactive">
    <span class="ui-row__main">Conferință de tineret</span>
    <span class="ui-row__meta">26 sept</span>
    <span class="ui-row__actions"><button class="ui-icon-btn">✕</button></span>
  </li>
</ul>`,
  },
  {
    id: 'toolbar',
    name: 'ui-toolbar',
    when: 'Barra de acciones de una consola. Los grupos separan lo que hace cosas distintas; --end empuja a la derecha.',
    snippet: `<div class="ui-toolbar">
  <div class="ui-toolbar__group">…</div>
  <span class="ui-toolbar__sep"></span>
  <div class="ui-toolbar__group ui-toolbar__group--end">…</div>
</div>`,
  },
  {
    id: 'panel',
    name: 'ui-panel',
    when: 'Contenedor de consola con cabecera fija y cuerpo con scroll propio. Es lo que evita que una lista larga empuje la página.',
    snippet: `<section class="ui-panel">
  <header class="ui-panel__head">
    <h2 class="ui-panel__title">Diapozitive</h2>
  </header>
  <div class="ui-panel__body">…</div>
</section>`,
  },
  {
    id: 'chip',
    name: 'ui-chip',
    when: 'Etiqueta o filtro. Con --selectable se pulsa y marca estado con .is-active / aria-pressed.',
    snippet: `<ul class="ui-chips">
  <li><button class="ui-chip ui-chip--selectable is-active">Todos</button></li>
  <li><button class="ui-chip ui-chip--selectable">Anuncios</button></li>
</ul>`,
  },
  {
    id: 'status',
    name: 'ui-status',
    when: 'Estado del sistema o de un elemento. Cinco variantes; el punto de color lo pone la propia clase.',
    snippet: `<span class="ui-status ui-status--ok">Publicat</span>
<span class="ui-status ui-status--live">În direct</span>`,
  },
  {
    id: 'segmented',
    name: 'ui-segmented',
    when: 'Dos o tres opciones excluyentes en poco espacio (tamaño del QR, vista). Más de tres: pestañas o desplegable.',
    snippet: `<div class="ui-segmented" role="radiogroup">
  <button class="ui-segmented__btn" role="radio">S</button>
  <button class="ui-segmented__btn is-active" role="radio" aria-checked="true">M</button>
  <button class="ui-segmented__btn" role="radio">L</button>
</div>`,
  },
  {
    id: 'field',
    name: 'ui-field / ui-input',
    when: 'Campo compacto de consola: etiqueta en versalitas encima y control del alto estándar.',
    snippet: `<label class="ui-field">
  <span class="ui-field__label">Durată</span>
  <input class="ui-input" type="number" value="30" />
</label>`,
  },
  {
    id: 'tabs',
    name: 'ui-tabs',
    when: 'Navegación dentro de una página (no entre páginas: eso es el menú). Subrayado, no pastillas.',
    snippet: `<nav class="ui-tabs">
  <a class="ui-tab is-active" href="#">Vizual</a>
  <a class="ui-tab" href="#">Date</a>
</nav>`,
  },
  {
    id: 'band',
    name: 'ui-band',
    when: 'Franja a sangre que corta la página y sujeta el dato o el mensaje que debe quedarse. Una por página: dos seguidas se anulan.',
    snippet: `<section class="ui-band">
  <div class="ui-band__inner">
    <ul class="stats-band__list">
      <li class="ui-stat ui-stat--band">
        <span class="ui-stat__value">26+</span>
        <span class="ui-stat__label">Ani de slujire</span>
      </li>
    </ul>
  </div>
</section>`,
  },
  {
    id: 'stat',
    name: 'ui-stat',
    when: 'Cifra con su rótulo en un panel de control. La cifra es el dato; el rótulo, el contexto.',
    snippet: `<div class="ui-stat">
  <span class="ui-stat__value">10</span>
  <span class="ui-stat__label">Diapozitive</span>
</div>`,
  },
  {
    id: 'meta',
    name: 'ui-meta',
    when: 'Línea de datos secundarios separados por puntos medios. Los separadores los pone el CSS, no el texto.',
    snippet: `<p class="ui-meta">
  <span>Duminică, 18 octombrie</span><span>10:00</span><span>Biserica Elim</span>
</p>`,
  },
  {
    id: 'empty',
    name: 'ui-empty',
    when: 'Estado vacío: qué pasa y qué hacer. Nunca dejar una caja en blanco.',
    snippet: `<div class="ui-empty">
  <p class="ui-empty__title">Niciun anunț activ</p>
  <p>Los avisos aparecen aquí mientras están vigentes.</p>
</div>`,
  },
  {
    id: 'kbd',
    name: 'ui-kbd',
    when: 'Atajos de teclado del operador. Siempre junto a la acción que ejecutan.',
    snippet: `<p>Pausa: <kbd class="ui-kbd">Espacio</kbd> · Pantalla completa: <kbd class="ui-kbd">F</kbd></p>`,
  },
];

/** Regla de diseño que la guía enuncia y que el código debe cumplir. */
export interface Principle {
  readonly title: string;
  readonly body: string;
}

export const PRINCIPLES: readonly Principle[] = [
  {
    title: 'Densidad con jerarquía',
    body: 'Cabe más información por pantalla, pero siempre hay un elemento primario por bloque. Comprimir no es apretar: es quitar aire muerto y dejar el que separa ideas.',
  },
  {
    title: 'El filete separa, la sombra flota',
    body: 'En reposo, borde de 1 px. La elevación se reserva a lo que está por encima del contenido: menús, diálogos, dock y lo que se arrastra.',
  },
  {
    title: 'Una pieza, un sitio',
    body: 'Si un patrón aparece dos veces, es una primitiva ui-* y se documenta aquí. Nada de tarjetas a medida por módulo.',
  },
  {
    title: 'La densidad la fija el contexto',
    body: 'Los componentes consumen --ui-*. La web es cómoda; una consola se pone .ui-dense y todo su subárbol encoge a filas de 36 px y controles de 32 px.',
  },
  {
    title: 'Acento con criterio',
    body: 'El oro marca lo accionable y el estado activo. Si algo dorado no es pulsable ni un remate, sobra.',
  },
  {
    title: 'Responsive al 100 %',
    body: 'De 320 px a 4K, sin scroll horizontal, solapes ni textos recortados. Fluido antes que breakpoint; los cortes son los de $breakpoints.',
  },
  {
    title: 'Proyección es otra superficie',
    body: 'El escenario no usa esta escala: tiene la suya de cartel (--pj-*), pensada para leerse a 15–20 m. Nunca mezcles px/rem allí.',
  },
  {
    title: 'Estados completos',
    body: 'Nada se da por terminado sin hover, focus-visible, activo, deshabilitado y área táctil de 44 px.',
  },
];

// ---------------------------------------------------------------------
// Referencias medidas. No son capturas ni impresiones: son los valores
// leídos con `getComputedStyle` sobre las páginas que el proyecto tomó como
// referencia. Sirven para justificar una decisión («¿por qué 32 px de alto
// en un chip?») y para no discutir de memoria.
// ---------------------------------------------------------------------

export interface ReferenceRow {
  /** Pieza medida. */
  readonly piece: string;
  /** Lo que devuelve Coursera. */
  readonly coursera: string;
  /** Lo que devuelve Google Store. */
  readonly google: string;
  /** Lo que hace esta app y por qué. */
  readonly ours: string;
}

export const REFERENCES: readonly ReferenceRow[] = [
  {
    piece: 'Rótulo de bloque',
    coursera: '20 px / 600 / −0,003 em',
    google: '24 px / 500',
    ours: '--fs-section (18–20 px) / 700. Lo que jerarquiza es el aire y el «ver todo», no el tamaño.',
  },
  {
    piece: 'Titular de portada',
    coursera: '48 px / 600 / −0,01 em',
    google: '76 px / 500 / −0,013 em',
    ours: '--fs-display (35–51 px) / 800 / --ls-display. Menos cuerpo porque debajo hay contenido, no producto.',
  },
  {
    piece: 'Tarjeta',
    coursera: 'radio 16 · filete 1 px · sin sombra',
    google: 'radio 28 · sin filete · fondo #f9f9f9',
    ours: '--r-card 16 + filete (ui-card) y variante --soft con tono para las que llevan imagen.',
  },
  {
    piece: 'Botón',
    coursera: '36 px alto · radio 8 · 14 px/600',
    google: '40–48 px alto · píldora · 14–16 px/500',
    ours: '--ui-control-h (40 web / 32 consola), píldora en la llamada principal.',
  },
  {
    piece: 'Chip',
    coursera: '32 px alto · píldora · filete 1 px · 14 px/400; activo relleno',
    google: 'píldora rellena',
    ours: 'ui-chip: 32 px, peso 500 en reposo y 600 relleno al activarse.',
  },
  {
    piece: 'Rejilla',
    coursera: '4 col. de 211 px · hueco 12 px',
    google: '3 col. de 304 px · hueco 24 px',
    ours: 'Columnas fijas por número de elementos (nunca filas cojas) y hueco de 12–24 px.',
  },
  {
    piece: 'Enlace «ver todo»',
    coursera: '14 px / 600 · color de marca · sin subrayado',
    google: '16 px / 500 · color de marca',
    ours: 'ui-link: --fs-sm / 600, subrayado sólo al apuntar (accesibilidad).',
  },
  {
    piece: 'Corte de ritmo',
    coursera: 'banda a sangre #002457 con una cifra',
    google: 'banda de imagen a sangre',
    ours: 'ui-band en --c-band (navy 800) con ui-stat--band. Una por página.',
  },
];
