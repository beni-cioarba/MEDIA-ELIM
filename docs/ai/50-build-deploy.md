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
npm run check    # i18n:check + check:projection + Drive sin red (puertas de calidad, también en CI)
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
- **Actualizaciones** (`PwaUpdateService`, rehecho el 05/10/2026). El SW
  sirve siempre la copia guardada y descarga la nueva por detrás; aplicarla =
  **recargar** (toda navegación completa recibe la última versión, lo asigna
  `ngsw-worker.js`). No se usa `activateUpdate()`: cambia la caché por debajo
  del JS antiguo y rompe los chunks diferidos.
  - Comprueba al abrir, al volver a la pestaña, al recuperar la red y cada
    15 min con la pestaña visible (mínimo 1 min entre comprobaciones).
  - Aplica: **al entrar** (abrir, volver tras ≥ 10 min fuera o restaurar del
    bfcache) si la versión llega en ≤ 15 s → recarga ya; si no, **en la
    siguiente navegación** carga completa del destino (`location.assign`;
    con atrás/adelante, `reload`); y **al salir de pantalla completa**.
  - Nunca durante una proyección (pantalla completa, o entre ventanas
    `/media/…`), ni con el foco en un campo de texto. `unrecoverable` →
    recarga en cuanto se pueda. Tope anti-bucle: una recarga automática por
    minuto (`sessionStorage`).
  - **Fallo corregido**: antes todo colgaba de `ApplicationRef.isStable`, que
    nunca llega (los `setInterval` de reloj y carruseles corren dentro de la
    zona): no había comprobaciones periódicas ni al volver, y el SW se
    registra siempre por el tope de 30 s de `registerWhenStable`. Los
    temporizadores del servicio van fuera de la zona.
  - Probado con Playwright + Edge sobre un build servido en local
    (versiones A→B→C→D con `ngsw-config` regenerado): entrada, sin recarga a
    mitad de lectura, navegación y atrás.
- **Enlaces profundos** (auditado el 29/09/2026): GitHub Pages no tiene
  rutas; `404.html` es copia de `index.html`, así que
  `…/rugaciune-pentru-familii/<domingo>#<familia>` abre la página y el router
  baja a la ficha (**pero con estado HTTP 404**, que algunas vistas previas de
  redes pueden rechazar; pendiente: generar `index.html` por ruta en el
  despliegue). `og:url` = URL de la página, no la portada (con la portada las
  redes reescribían el enlace a `…/MEDIA-ELIM/#<familia>`). Las anclas bajan
  con el desplazamiento del alto de la cabecera (`ViewportScroller.setOffset`
  en `app.config.ts`: el router ignora `scroll-padding-top`).
- Versionado: **MAYOR.MENOR manual** en `package.json` (el usuario dice
  cuándo es 2.1.0 o 3.0.0) y **PARCHE automático** = commits desde el último
  cambio de `"version"` (`autoRelease` en `scripts/generate-version.mjs`):
  2.0.0 + 17 commits → v2.0.17. Por commit, no por compilación (mismo código
  = mismo número, en local y en el CI; el CI clona con `fetch-depth: 0`).
  Además: build = nº de commits, hash, «dirty», fecha. El chip del pie muestra `v2.0.0` (con «+» si se compiló con cambios
  sin commitear) y el detalle en su tooltip.
- **Instalar como app** (01/10/2026): botón «Instalar» en la franja legal del
  pie (`shared/install-app`) gobernado por `PwaInstallService`. Se pinta sólo
  si la web **no** está abierta como app (`display-mode` standalone/fullscreen/
  minimal-ui/WCO, `navigator.standalone`, `android-app://`) y la plataforma
  instala: Chromium con `beforeinstallprompt` guardado (también escritorio) →
  diálogo nativo; móvil/tableta sin aviso nativo y Safari macOS ≥ 17 → hoja
  `<dialog>` con los pasos de *ese* navegador (`detectInstallEnvironment` en
  `core/util/install-platform.ts`: iOS Safari < 26 / ≥ 26 —«⋯» antes de
  Compartir—, Chrome/Firefox/Edge iOS, Android Chromium/Samsung/Firefox y apps
  con navegador integrado → «Abrir en Chrome» (intent) + copiar enlace). El
  evento se captura en un `<script>` de `index.html` porque llega antes que el
  pie diferido. `appinstalled` deja una marca de 30 días en localStorage.
  Límite inevitable: desde Safari de iOS no se puede saber si ya está en la
  pantalla de inicio (allí se sigue ofreciendo; dentro de la app, nunca).
- **Sello «100 % adaptable»** (`shared/device-fit`): ordenador · tableta ·
  teléfono, enciende el de la maqueta activa por ancho de ventana (< 720 /
  < 1024 / resto) y lo cambia en vivo; tooltip con el ancho actual.
- La franja legal es una **rejilla con áreas** (≥ lg: ©/meta | acciones | INEB;
  < lg: © / meta + INEB / acciones), no un flex que envuelve.
- `npm run pwa:icons` regenera el icono de la app y sus derivados desde el
  **emblema** (`scripts/assets-src/emblema-elim.png`, máster de 674 px que no se
  publica) con `sharp`: iconos `any` / `maskable` / `monochrome`, Apple 180,
  favicon, iconos de los atajos y `og-image.jpg`. Receta y proporciones en
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
| `check-drive-links.mjs`  | Enlaces de Drive de la galería: forma de cada `driveFolderId` y sin repetidos (`--offline`, dentro de `npm run check`); con red (`npm run check:drive`) además que cada carpeta exista y sea pública. Receta en `20-content-i18n.md` |
| `check-i18n-parity.mjs`  | Verifica que ES y RO tengan las mismas claves                 |
| `import-bible-plan.py`   | Excel del plan de lectura → `src/app/core/bible-reading.config.ts` (Python + `openpyxl`) |
| `import-family-photos.mjs` | Fotos de una semana de familias → `src/assets/family-prayer/<domingo>/<id>.webp` (1280) + `-480.webp`, sin metadatos; imprime `id` y medidas (`36-family-prayer.md`) |

Ejecuta `optimize-images.js` **siempre** antes de añadir un `MediaEvent`: las
imágenes originales de Drive pesan decenas de MB.
