import { APP_INITIALIZER, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { IconName } from './icon-name';

/**
 * Catálogo de iconos propios de la app, registrado en `MatIconRegistry`.
 *
 * ── Por qué SVG en línea y no la fuente de iconos ──────────────────────
 * `<mat-icon>fontIcon</mat-icon>` obliga a descargar una fuente (~150 kB
 * la de Material Symbols completa) *antes* de poder pintar la cabecera.
 * En la pantalla de la iglesia, donde la app arranca con la red del
 * templo, eso se traduce en una navegación sin iconos durante segundos.
 *
 * Registrándolos con `addSvgIconLiteralInNamespace` conseguimos:
 *  · **0 peticiones de red** — los paths viajan en el bundle (≈2 kB).
 *  · **0 layout shift** — el icono existe desde el primer pintado.
 *  · La API de Material (`<mat-icon svgIcon="elim:home">`), su
 *    accesibilidad (`aria-hidden`, `role="img"`) y su integración con
 *    `mat-icon-button`, `mat-menu-item`, `mat-chip`…
 *
 * La fuente Material Symbols de Google sigue disponible (se carga sin
 * bloquear desde `index.html`) para iconografía secundaria puntual:
 * `<mat-icon fontSet="material-symbols-outlined">volunteer_activism</mat-icon>`.
 *
 * ── Seguridad ─────────────────────────────────────────────────────────
 * `bypassSecurityTrustHtml` se aplica sobre cadenas **constantes escritas
 * en este fichero**, nunca sobre datos externos ni entradas de usuario:
 * no hay superficie de XSS. Cualquier icono que llegue de fuera debe
 * registrarse con `addSvgIcon(url)` y servirse desde nuestro propio
 * origen, jamás con literales dinámicos.
 */

/** Espacio de nombres de los iconos propios: `elim:<nombre>`. */
export const ELIM_ICON_NAMESPACE = 'elim';

/**
 * Icono de **relleno** copiado tal cual de un set de referencia (Material
 * Symbols), con su propio `viewBox`. Para lo figurativo que no tiene Lucide:
 * se toma de un set profesional en vez de dibujarlo a mano.
 */
interface FilledIcon {
  readonly viewBox: string;
  readonly d: string;
}

/**
 * Casi todos comparten `viewBox 0 0 24 24` y se dibujan con trazo (`stroke`)
 * para que se vean coherentes a cualquier escala, incluida la proyección.
 * El grosor se controla con `--elim-icon-stroke` desde CSS. Los `FilledIcon`
 * son la excepción (estilo «outlined» de Material, de grosor equivalente).
 */
const ICON_PATHS: Record<IconName, readonly string[] | FilledIcon> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  calendar: [
    'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M16 2v4M8 2v4M3 10h18',
  ],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'M12 7v5l3 2'],
  image: [
    'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M3 16l5-5 4 4 3-3 6 6',
    'M9.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0',
  ],
  play: ['M8 5.5v13l11-6.5z'],
  'map-pin': [
    'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z',
    'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  ],
  mail: [
    'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'm3 7 9 6 9-6',
  ],
  phone: [
    'M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3 5.1 1.8 1.8 0 0 1 4.8 3h2.6a1.8 1.8 0 0 1 1.8 1.5c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.3 10a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.5 1.8z',
  ],
  send: ['M21 3 10.5 13.5', 'M21 3l-6.6 18-3.9-7.5L3 9.6z'],
  copy: [
    'M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
    'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  ],
  check: ['M20 6 9 17l-5-5'],
  gift: [
    'M20 12v9H4v-9',
    'M2.5 7h19v5h-19z',
    'M12 21V7',
    'M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z',
    'M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z',
  ],
  'credit-card': [
    'M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
    'M2 10.5h20',
    'M6 14.5h3',
  ],
  share: ['M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7', 'M16 6l-4-4-4 4', 'M12 2v13'],
  book: [
    'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z',
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
  ],
  heart: [
    'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z',
  ],
  // Familia: dos adultos y un niño entre ellos (dibujo propio, mismo trazo y
  // rejilla que Lucide). Sustituye a «hand-heart» en «Rugăciune pentru
  // familii»: la mano con corazón decía «cuidar», no «familia», y `users`
  // ya es «La iglesia».
  // Manos en oración: «folded_hands» de Material Symbols Outlined (Google,
  // Apache 2.0), copiado tal cual. Para «Cauze de rugăciune»: el corazón
  // decía «amor», no «orar». Un icono figurativo así se toma de un set
  // profesional, no se dibuja a mano (se probó y no daba la talla).
  pray: {
    viewBox: '0 -960 960 960',
    d: 'M620-320v-109l-45-81q-7 5-11 13t-4 17v229L663-80h-93l-90-148v-252q0-31 15-57t41-43l-56-99q-20-38-17.5-80.5T495-832l68-68 276 324 41 496h-80l-39-464-203-238-6 6q-10 10-11.5 23t4.5 25l155 278v130h-80Zm-360 0v-130l155-278q6-12 4.5-25T408-776l-6-6-203 238-39 464H80l41-496 276-324 68 68q30 30 32.5 72.5T480-679l-56 99q26 17 41 43t15 57v252L390-80h-93l103-171v-229q0-9-4-17t-11-13l-45 81v109h-80Z',
  },
  // Material Symbols «slideshow» y «palette» (Google, Apache 2.0), copiados
  // tal cual: accesos del pie al panel de proyección y a la guía de estilos.
  slideshow: {
    viewBox: '0 -960 960 960',
    d: 'm380-300 280-180-280-180v360ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z',
  },
  palette: {
    viewBox: '0 -960 960 960',
    d: 'M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-177 23q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120-160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm200 0q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm120 160q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z',
  },
  // WhatsApp: logo oficial de Simple Icons (CC0), copiado tal cual. Marca
  // reconocible al instante: en «Contact» abre el chat con la iglesia.
  whatsapp: {
    viewBox: '0 0 24 24',
    d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  },
  // Lucide «trophy»: Talantul în Negoț (menú Programa).
  trophy: [
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6',
    'M18 9h1.5a2.5 2.5 0 0 0 0-5H18',
    'M4 22h16',
    'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22',
    'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
    'M18 2H6v7a6 6 0 0 0 12 0V2Z',
  ],
  // Lucide «download» y «external-link»: recursos descargables / web externa.
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  // Lucide «arrow-up»: volver arriba (pie).
  'arrow-up': ['M12 19V5', 'm5 12 7-7 7 7'],
  family: [
    'M8 4.5a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
    'M2.5 21v-5.5A3.5 3.5 0 0 1 6 12a3.5 3.5 0 0 1 3 1.7',
    'M20 4.5a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
    'M21.5 21v-5.5A3.5 3.5 0 0 0 18 12a3.5 3.5 0 0 0-3 1.7',
    'M13.7 12.6a1.7 1.7 0 1 1-3.4 0a1.7 1.7 0 1 1 3.4 0',
    'M9 21v-2.5a3 3 0 0 1 6 0V21',
  ],
  music: [
    'M9 18V6l10-2v12',
    'M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
    'M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
  ],
  church: ['M12 2v6', 'M9 5h6', 'M12 8l7 5v9H5v-9z', 'M10 22v-5h4v5'],
  sparkles: [
    'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z',
    'M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  ],
  'chevron-down': ['M6 9l6 6 6-6'],
  // Trazo idéntico al de `chevron-down` girado: así las tres flechas
  // pesan lo mismo ópticamente en la misma retícula de 24.
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  megaphone: [
    'M3 10v4a1 1 0 0 0 1 1h2.5l6.5 4V5L6.5 9H4a1 1 0 0 0-1 1z',
    'M16.5 9.5a3.5 3.5 0 0 1 0 5',
    'M19.5 7a7.5 7.5 0 0 1 0 10',
  ],
  // Seis puntos: agarrador para arrastrar (los trazos de longitud 0 con
  // remate redondo se pintan como puntos).
  grip: ['M9 5.6v.8M9 11.6v.8M9 17.6v.8M15 5.6v.8M15 11.6v.8M15 17.6v.8'],
  close: ['M6 6l12 12M18 6L6 18'],
  // Cuatro esquinas hacia fuera / hacia dentro: el mismo dibujo que el botón
  // de pantalla completa del escenario, para que se reconozca en el panel.
  fullscreen: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
  'fullscreen-exit': ['M9 4v5H4', 'M15 4v5h5', 'M9 20v-5H4', 'M15 20v-5h5'],
  // Instalar la web como app: teléfono con flecha de descarga (pie).
  'install-app': [
    'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z',
    'M12 7v7',
    'm9 11 3 3 3-3',
  ],
  // Familia de dispositivos del chip «100 % adaptable». Proporciones
  // exageradas a propósito (ancho / medio / estrecho) para que se
  // distingan a 12 px.
  'device-desktop': [
    'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M8 21h8',
    'M12 17v4',
  ],
  'device-tablet': [
    'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M11 18h2',
  ],
  'device-phone': [
    'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M11 18h2',
  ],
  // Glifos de los navegadores, para que las instrucciones de instalación
  // muestren el mismo dibujo que la persona tiene que buscar en pantalla:
  // «Compartir» de Apple (Lucide «share»), menú ⋮ y «Añadir» (+ en caja).
  'share-ios': ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  'more-vert': ['M12 5.6v.8M12 11.6v.8M12 17.6v.8'],
  'more-horiz': ['M5.6 12h.8M11.6 12h.8M17.6 12h.8'],
  'add-box': [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M12 8v8',
    'M8 12h8',
  ],
};

function toSvg(icon: readonly string[] | FilledIcon): string {
  if (!Array.isArray(icon)) {
    const filled = icon as FilledIcon;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${filled.viewBox}" fill="currentColor" data-filled=""><path d="${filled.d}"/></svg>`;
  }
  const paths = icon as readonly string[];
  const body = paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/**
 * Registra el catálogo propio en `MatIconRegistry` y fija la fuente por
 * defecto de `<mat-icon>` a Material Symbols (para el uso puntual de
 * iconos de Google sin repetir `fontSet` en cada plantilla).
 *
 * Se añade en `app.config.ts`: `providers: [ ..., provideElimIcons() ]`.
 */
export function provideElimIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const registry = inject(MatIconRegistry);
        const sanitizer = inject(DomSanitizer);
        return () => {
          for (const [name, paths] of Object.entries(ICON_PATHS)) {
            registry.addSvgIconLiteralInNamespace(
              ELIM_ICON_NAMESPACE,
              name,
              sanitizer.bypassSecurityTrustHtml(toSvg(paths)),
            );
          }
          registry.setDefaultFontSetClass('material-symbols-outlined');
        };
      },
    },
  ]);
}
