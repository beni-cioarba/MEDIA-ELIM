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
 * Todos comparten `viewBox 0 0 24 24` y se dibujan con trazo (`stroke`)
 * para que se vean coherentes a cualquier escala, incluida la proyección.
 * El grosor se controla con `--elim-icon-stroke` desde CSS.
 */
const ICON_PATHS: Record<IconName, readonly string[]> = {
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
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  close: ['M6 6l12 12M18 6L6 18'],
};

function toSvg(paths: readonly string[]): string {
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
