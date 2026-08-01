# 50 · Build, despliegue y automatismos

## Comandos

```bash
npm start        # ng serve (prestart regenera version.ts)
npm run build    # ng build (producción; prebuild regenera version.ts)
npm run watch    # build --watch en desarrollo
npm test         # Karma/Jasmine — configurado, aún sin specs
npm run i18n:check
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

- Builder: `@angular-devkit/build-angular:application`.
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
chunk tampoco está en el arranque.

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
- `npm run pwa:icons` regenera los iconos (normal y maskable, 192/512) desde
  `assets/logo-elim.png` con `sharp`.

> `logo-elim.png` (6719×2813, ~423 kB) es sólo el **máster** para generar
> iconos. La web usa `assets/logo-elim.webp` (384 px, ~9 kB), que es el que se
> precarga en `index.html`. Si cambia el logotipo, regenera ambos.

## Scripts de `scripts/`

| Script                   | Qué hace                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `generate-version.mjs`   | Escribe `src/environments/version.ts` (semver + contador git) |
| `optimize-images.js`     | `src/assets/drive-media/*.{jpg,png}` → `.webp` 1600px + `-thumb.webp` 480px |
| `generate-pwa-icons.mjs` | Iconos PWA desde el logo                                     |
| `fetch-youtube.js`       | Genera `youtube.json` (usado por el cron)                    |
| `check-i18n-parity.mjs`  | Verifica que ES y RO tengan las mismas claves                 |

Ejecuta `optimize-images.js` **siempre** antes de añadir un `MediaEvent`: las
imágenes originales de Drive pesan decenas de MB.
