# 50 · Build, despliegue y automatismos

## Comandos

```bash
npm start        # ng serve
npm run build    # ng build (producción)
npm run watch    # build --watch en desarrollo
npm test         # Karma/Jasmine — configurado, aún sin specs
npm run pwa:icons
```

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
| `optimize-images.js`     | `src/assets/drive-media/*.{jpg,png}` → `.webp` 1600px + `-thumb.webp` 480px |
| `generate-pwa-icons.mjs` | Iconos PWA desde el logo                                     |
| `fetch-youtube.js`       | Genera `youtube.json` (usado por el cron)                    |

Ejecuta `optimize-images.js` **siempre** antes de añadir un `MediaEvent`: las
imágenes originales de Drive pesan decenas de MB.
