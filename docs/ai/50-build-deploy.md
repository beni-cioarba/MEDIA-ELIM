# 50 · Build, despliegue y automatismos

## Node

Angular 22 exige **Node ^22.22 || ^24.15** (`engines` en `package.json`; el CLI
se niega a arrancar con menos). En este equipo el Node global es 20.10, así que
en el hub hay un **Node 24 LTS portable** (zip oficial, SHA256 verificado, sin
instalador ni PATH) en `C:\workspace\.tools\node24` (`C:\workspace\.tools\README.md`):

```bash
PATH="/c/workspace/.tools/node24:$PATH" npm run build      # Git Bash
$env:PATH = "C:\workspace\.tools\node24;$env:PATH"         # PowerShell
```

La CI usa `actions/setup-node@v4` con `node-version: '24'`.

## Comandos

```bash
npm start        # ng serve (prestart regenera version.ts)
npm run build    # ng build (producción; prebuild = version.ts + npm run check)
npm run watch    # build --watch en desarrollo
npm test         # Vitest (@angular/build:unit-test) — configurado, aún sin specs
npm run check    # i18n:check + check:projection (puertas de calidad, también en CI)
npm run i18n:check
npm run check:projection   # presupuesto de legibilidad de la proyección
npm run version:generate
npm run pwa:icons
```

## Versionado

Dos fuentes, una manual y otra automática:

| Dato       | Origen                          | Quién lo sube                    |
| ---------- | ------------------------------- | -------------------------------- |
| `release`  | `version` de `package.json`     | Una persona, con criterio semver |
| `build`    | `git rev-list --count HEAD`     | Solo, en cada commit             |
| `commit`   | `git rev-parse --short HEAD`    | Solo                             |
| `dirty`    | `git status --porcelain`        | Solo                             |
| `builtAt`  | Fecha de compilación            | Solo                             |

`scripts/generate-version.mjs` escribe `src/environments/version.ts` en
`postinstall`, `prestart` y `prebuild`. Ese fichero está en `.gitignore`: es
un artefacto, no código fuente. **No lo edites a mano** — para cambiar el
número visible, sube `version` en `package.json`.

El pie muestra `v{release}` y, al pasar por encima (o al enfocarlo con
teclado), un tooltip con compilación, revisión y fecha. Es lo que hay que
pedir cuando alguien reporta un fallo.

> `deploy.yml` hace checkout con `fetch-depth: 0`. Con el clon superficial por
> defecto, `rev-list --count` devolvería 1 y el contador sería inútil.

## `angular.json`

- Builder: `@angular/build:application` (esbuild; sin webpack ni Karma en
  `node_modules`). `serve` → `@angular/build:dev-server`, `test` →
  `@angular/build:unit-test` (Vitest + jsdom).
- Assets: `favicon.ico`, `manifest.webmanifest`, `src/assets/**`.
- Presupuestos en producción: **bundle inicial 620 kB warning / 800 kB error**;
  bundle `styles` 80 kB / 120 kB; estilos por componente 36 kB / 48 kB.
- `stylePreprocessorOptions.includePaths: ["src", "src/styles"]` — es lo que
  permite `@use 'ds' as *;` desde cualquier hoja de componente.
- `outputHashing: all` para cache-busting.
- Base href de producción: `/MEDIA-ELIM/` (GitHub Pages).

Sólo `MainLayoutComponent` es eager; todas las páginas (incluido el escenario)
son `loadComponent`, y el drawer móvil, el pie y el dock flotante usan `@defer`.
Las animaciones de Material entran por `provideAnimationsAsync()`, así que su
chunk tampoco está en el arranque. Las traducciones son un chunk por idioma
(`ro-json`, `es-json`, ~23 kB): sólo el activo entra al arrancar.

Medido tras la subida a Angular 22 + tema M3 + idioma activo: **585 kB raw /
156 kB transfer** iniciales (Angular 17: 597 / 160); hoja global 21 kB (38).

## Despliegue — `.github/workflows/deploy.yml`

Node 20 → `npm ci` → `ng build --configuration production --base-href /MEDIA-ELIM/`
→ copia `index.html` a `404.html` (fallback SPA, imprescindible ahora que hay
router) → crea `.nojekyll` → publica en GitHub Pages.

> Si añades rutas nuevas, el fallback `404.html` ya las cubre. No hace falta
> `withHashLocation()`.

## Datos de YouTube — `.github/workflows/youtube-data.yml`

Cron (más frecuente los domingos) que ejecuta `scripts/fetch-youtube.js` y
publica `youtube.json` en la rama `youtube-data`. `YouTubeService` combina:

1. Ese JSON servido por `raw.githubusercontent.com` (sondeo cada 5 min) →
   últimas emisiones y respaldo del directo.
2. Sondeo directo a la YouTube Data API cada 2 min (2 unidades de cuota) para
   detectar el **EN DIRECTO** con fiabilidad.

Secretos: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` en GitHub Secrets.

## PWA

- `ngsw-config.json` + `provideServiceWorker` (sólo en producción).
- `PwaUpdateService` comprueba versiones al estabilizarse la app y cada hora;
  si hay una nueva, la activa y recarga. La pantalla del templo nunca se queda
  con una versión antigua.
- `npm run pwa:icons` regenera el icono de la app y sus derivados desde el
  **emblema** (`scripts/assets-src/emblema-elim.png`, máster de 674 px que no se
  publica) con `sharp`: `assets/pwa/icon-512.png` e `icon-192.png` (un PNG para
  `any` **y** `maskable`), `icon-180.png` (Apple), `favicon-32.png` y
  `src/favicon.ico` (16/32/48). Receta y proporciones en
  `docs/ai/45-design-system.md` → «Marca».

> No hay imagen de marca en `assets/`: la iglesia es el wordmark tipográfico
> (`app-brand-logo`) y INEB es SVG en el bundle (`app-ineb-logo`). Si cambia el
> emblema, se sustituye el máster y se regenera; nunca se retoca un PNG.

## Scripts de `scripts/`

| Script                   | Qué hace                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `generate-version.mjs`   | Escribe `src/environments/version.ts` (semver + contador git) |
| `optimize-images.js`     | `src/assets/drive-media/*.{jpg,png}` → `.webp` 1600px + `-thumb.webp` 480px |
| `generate-pwa-icons.mjs` | Icono de la app (PWA, Apple, favicon PNG + ICO) desde el emblema |
| `responsive-audit.snippet.js` | **No es de Node**: se pega en la consola del navegador. Informe de scroll horizontal, desbordes, solapes y `nowrap` recortados en el ancho actual (`docs/ai/40-styling.md` → Responsive) |
| `check-projection-sizes.mjs` | Guardia del presupuesto de legibilidad: falla si un `font-size` en `--pj-u` baja de 3,2u o la escala `--pj-fs-*` de su suelo (`npm run check:projection`, en CI) |
| `fetch-youtube.js`       | Genera `youtube.json` (usado por el cron)                    |
| `check-i18n-parity.mjs`  | Verifica que ES y RO tengan las mismas claves                 |
| `import-bible-plan.py`   | Excel del plan de lectura → `src/app/core/bible-reading.config.ts` (Python + `openpyxl`) |

Ejecuta `optimize-images.js` **siempre** antes de añadir un `MediaEvent`: las
imágenes originales de Drive pesan decenas de MB.
