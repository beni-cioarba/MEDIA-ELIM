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
npm start        # ng serve (prestart regenera version.ts y el calendario de suscripción)
npm run build    # ng build (producción; prebuild = version.ts + calendario + npm run check)
npm run watch    # build --watch en desarrollo
npm test         # Vitest (@angular/build:unit-test), en modo observación
npm run test:unit  # los mismos tests, una pasada (lo que usa `npm run check`)
npm run check    # i18n:check + check:projection + Drive sin red + tests de scripts + tests unitarios (puertas de calidad, también en CI)
npm run i18n:check
npm run check:projection   # presupuesto de legibilidad de la proyección
npm run check:content      # fechas, ids, ficheros referenciados y claves de los *.config.ts
npm run check:boundaries   # capas: una feature no importa de otra; layout y shared, tampoco
npm run e2e -- --dist <carpeta browser>   # prueba de humo sobre la compilación (ver abajo)
npm run version:generate
npm run calendar:events    # assets/calendars/elim-events.ics desde church.config.ts
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
- Proiectul Împreună: el workflow de deploy corre `npm run impreuna:sync` antes del
  build (`continue-on-error`) para llevar los vídeos del día; ver `32-impreuna.md`.
- Presupuestos en producción: **bundle inicial 600 kB warning / 620 kB error**
  (el error está pegado al valor real a propósito: que crezca tiene que ser
  una decisión, no un descuido);
  bundle `styles` 80 kB / 120 kB; estilos por componente 36 kB / 48 kB.
- `stylePreprocessorOptions.includePaths: ["src", "src/styles"]` — es lo que
  permite `@use 'ds' as *;` desde cualquier hoja de componente.
- `outputHashing: all` para cache-busting.
- Base href de producción: `/` — dominio propio **`https://elimarganda.com/`**
  (GitHub Pages del repo `MEDIA-ELIM`; el antiguo
  `beni-cioarba.github.io/MEDIA-ELIM/` redirige solo).

Sólo `MainLayoutComponent` es eager; todas las páginas (incluido el escenario)
son `loadComponent`, y el drawer móvil, el pie y el dock flotante usan `@defer`.
No hay `provideAnimations*()`: Material 22 anima con CSS y
`@angular/animations` se desinstaló (16/11/2026). Las traducciones son un chunk
por idioma (`ro-json`, `es-json`): sólo el activo entra al arrancar.

Las rutas públicas se precargan tras el primer pintado, en reposo
(`PublicPreloadingStrategy`); las del operador llevan `data.preload: false`
y quien tiene «Ahorro de datos» no precarga nada. El service worker sigue
precacheando la app entera.

Medido el 17/11/2026 (Angular 22.2, sin zone.js, iconos y cabecera sin
Material): **479 kB raw / 128 kB transfer** iniciales. Venía de 661 en la
auditoría: el mega-menú diferido (`NavPanelComponent`), los iconos sin
`MatIconRegistry` y zone.js fuera (`76-plan-maestro.md`).

- `server: "src/main.server.ts"` + `outputMode: "static"`: **prerender** de
  las páginas públicas en el build (sección «Prerender»). No hay servidor en
  producción: la salida sigue siendo `dist/iglesia-redes/browser`, estática.

## Despliegue — `.github/workflows/deploy.yml`

Node 24 → `npm ci` → calendario de suscripción (`npm run calendar:events`, ver
abajo) → `npm run check` → `ng build --configuration production --base-href /`
→ source maps a Sentry y fuera de la web (`scripts/sentry-sourcemaps.mjs`,
ver `77-analitica-errores.md`) → copia el **shell** `index.csr.html` a `404.html` (fallback SPA; no
`index.html`, que con prerender es la portada ya pintada) → crea `.nojekyll`
→ publica en GitHub Pages.

> Si añades rutas nuevas, el fallback `404.html` ya las cubre. No hace falta
> `withHashLocation()`.

**Páginas estáticas por ruta, sitemap, robots y JSON-LD** (09/11/2026,
ampliado el 14/11/2026): tras el fallback,
`node scripts/generate-route-pages.mjs --dist dist/iglesia-redes/browser`:

- Escribe `<ruta>/index.html` para **todas las páginas públicas**
  (`ROUTE_PAGES` + una por slug de `DEPARTMENT_SLUGS`): sobre el HTML
  **prerenderizado** de esa ruta si el build lo escribió, o sobre el shell
  (`index.csr.html`) si no (URL con datos), con su título («<página> · Biserica Elim Arganda»), descripción, Open Graph,
  `og:url` y **canónica con barra final**, o `noindex` (sin canónica) en las de
  datos personales (familias, causas, botezuri, invitați). Textos: las mismas
  claves que `data.seo` de la ruta, en rumano (`seo.site_name` = nombre del
  sitio). GitHub Pages sirve `/<ruta>/` con **200** y `/<ruta>` con 301 hacia
  ella. **Por qué**: hasta el 14/11/2026 sólo `/` e `/impreuna` respondían 200;
  el resto salía por `404.html` con estado **404** y Google no las indexaba
  (sólo aparecía la portada, sin enlaces de sitio). **Toda página pública nueva
  entra en `ROUTE_PAGES`** (el test comprueba que sus claves existen en ro y es).
- Portada: título «Biserica Elim Arganda · Biserică penticostală română»,
  canónica y **JSON-LD** (`WebSite` + `Church`/`Organization`: nombre y
  alternativos, logo `icon-any-512.png`, dirección, teléfono, correo, mapa y
  redes `*_main`), todo leído de `church.config.ts` y `ro.json`.
- El service worker cachea el shell (`"index": "/index.csr.html"` en
  `ngsw-config.json`), que el script no toca. Si alguna vez `/index.html`
  vuelve a la tabla del service worker (build sin prerender), el script
  **recalcula su SHA-1 en `ngsw.json`**; si no, el service worker vería el hash
  descuadrado y dejaría de servir la app desde caché.
- `sitemap.xml` (portada + páginas indexables) y `robots.txt` (bloquea sólo las
  herramientas: `ROBOTS_DISALLOW`; las `noindex` quedan rastreables para que
  Google lea su `noindex`).

Pendiente fuera del código (ver `70-roadmap.md`): dar de alta el dominio en
Google Search Console, enviar el sitemap y crear / verificar el perfil de
empresa de Google (Maps).

Sus tests (`scripts/*.test.mjs`, `node --test`) corren en
`npm run check` (`test:scripts`, con el glob entre comillas: desde Node 22
`--test` no acepta un directorio), así que un fallo no llega a publicarse.

> Compilar en local desde Git Bash: `--base-href /` se convierte en
> `C:/Program Files/Git/` (conversión de rutas de MSYS). Usa
> `MSYS_NO_PATHCONV=1` delante o PowerShell; el CI (Linux) no tiene el problema.

## Prerender (desde el 19/11/2026)

El build pinta en Node **cada página pública** y escribe su HTML con el
contenido ya dentro (39 rutas: portada, páginas de módulo, departamentos,
bloques `media/<slug>`; las redirecciones salen como página de redirección).
Lo leen los buscadores y lo ve quien abre la web con mala conexión antes de
que llegue el JavaScript. Medido: `despre-noi` pasa de un `<app-root>` vacío
a 7.200 caracteres de texto en el HTML.

- **Qué se prerenderiza no se escribe a mano**: `app.routes.server.ts` recorre
  `APP_ROUTES` y toma `data.prerender`, que pone `pageRoute()` desde
  `prerenderPaths(page)` (`core/modules/module.model.ts`): las páginas sin
  parámetros que no son herramienta, la portada y los `expand`. Las
  herramientas van en modo cliente explícito (`media/ecran` encaja también en
  `media/:blockId`). Las URL con datos (`anunturi/:id`, perfiles, días de
  Împreună, botezuri: 483) siguen siendo copias del shell con su meta; son el
  siguiente paso si interesa (un `getPrerenderParams` con los mismos datos que
  `dataPages()`).
- **Sin hidratación, a propósito.** El contenido depende de la hora («AZI»,
  cuentas atrás, anuncios vigentes) y el del build no cuadra con el del
  visitante: hidratar daría desajustes (NG0500). Angular sustituye el HTML por
  el suyo, y con `withEnabledBlockingInitialNavigation()` lo hace de una vez:
  medido fotograma a fotograma, ninguno pinta el `<main>` vacío. El build se
  rehace cada noche (cron del despliegue), así que el HTML nunca tiene más de
  un día.
- **Sin red en el prerender** (`app.config.server.ts`): las peticiones a
  `http(s)://…` fallan al momento y cada componente pinta su alternativa sin
  red. Sin esto, cada página llamaba a la API de YouTube en cada build.
  `LoggerService` calla los avisos en Node (los errores, no).
- **`@defer` pinta su placeholder** en el servidor: los bloques de
  `media/<slug>` (cada uno en su `@defer`) salen sólo con la cabecera.
- **Reglas para el código**: `10-architecture.md` → «Código que corre también
  en Node». Si algo toca el navegador, el build escribe `[elim:error]` con la
  traza y esa página sale sin contenido: revisa el log del build.
- `ng serve` también renderiza en el servidor (útil: los errores salen antes).
- Salida: `index.html` = portada prerenderizada; `index.csr.html` = shell (sin
  contenido), que es lo que usan el 404, las páginas sin prerender y el
  service worker.

## Prueba de humo — `scripts/e2e/`

`npm run e2e -- --dist dist/iglesia-redes/browser` (tras el build, la copia
a `404.html` y `generate-route-pages.mjs`). Es un paso **obligatorio** del
despliegue: si falla, no se publica.

- `serve-dist.mjs` sirve la compilación como GitHub Pages (carpeta → 200,
  sin barra → 301, lo que no existe → `404.html` con estado 404).
- `smoke.mjs` abre cada página estática a 1366 y a 390 px con el Chrome
  instalado y le pasa `page-audit.mjs`: un `h1`, un `main`, sin desbordes,
  `alt`, nombres accesibles, etiquetas, claves sin traducir, contraste AA y
  objetivos táctiles de 24 px. De las colecciones de URL con datos audita una
  de cada forma. Después pide por HTTP **todos** los enlaces internos (ninguno
  puede dar 404) y recorre el carrusel de `/media/ecran` a 1920 × 1080
  (ninguna diapositiva en blanco).
- Mira con `prefers-reduced-motion`: un texto a mitad de su animación de
  entrada mide menos contraste del que tiene.
- Los errores de recursos de **otros** servidores (la API de YouTube rechaza
  el origen local) no cuentan; los propios, sí.
- Tras publicar, el job `verify-live` comprueba que el sitio responde.
- Hay además un cron nocturno que reconstruye y publica: lo que depende de la
  fecha se pone al día solo.

## Calendario de suscripción — `assets/calendars/elim-events.ics`

«Abonează-te» de Evenimente (`CalendarSyncButtonComponent` →
`CalendarService.webcalUrlForAll()`) abre
`webcal://<host>/assets/calendars/elim-events.ics` (la base sale de
`document.baseURI`: igual desde `/` que desde `/media/evenimente`). El fichero
**no se sube al repo** (`.gitignore`): lo escribe
`scripts/generate-events-calendar.mjs` (`npm run calendar:events`) desde
`core/church.config.ts` en `prestart`, en `prebuild` y en el deploy (paso
propio antes de las puertas de calidad y del build, que lo copia con
`src/assets/**`). Para que salga un evento basta con añadirlo al config y
publicar (11/11/2026).

Qué lleva, todo del config:

- **Cada `upcomingEvents`**, también los pasados (a quien se suscribe le quedan
  como historial; se van al borrarlos del config). Una entrada por hora
  (`'10:00 & 18:00'` → dos; la primera con el UID de las descargas,
  `slug(id)-AAAAMMDD@elim-arganda`), 2 h, aviso 12 h antes. **Sin hora** → de
  día completo, no a las 00:00 (cuando se le pone hora, el mismo UID la
  recibe). `URL` = su tarjeta, `/media/evenimente#ev-<id>`.
- **El `weeklyProgram`**, como series `RRULE` desde `PROGRAM_SINCE`
  (01/09/2026): una por culto y hora, sin alarmas y `TRANSP:TRANSPARENT` (no
  marca «ocupado»). Las sesiones `monthly` son series propias, descontadas de
  la normal: el domingo a las 10:00, `BYDAY=2SU,3SU,4SU,5SU` «Închinare și
  învățătură» + `BYDAY=1SU` «Cina Domnului». `ordinalsFor` encuentra el `BYDAY`
  exacto de cualquier combinación de `MonthlyRule` (también «el último»); si
  alguna no cabe en una `RRULE`, avisa y sale de más, nunca de menos.
- **Un evento a la hora de un culto lo sustituye ese día** (`EXDATE`), como en
  la web (`ScheduleService`: «manda el manual»).
- Horas con `TZID=Europe/Madrid` + `VTIMEZONE` (no «flotantes» como las
  descargas sueltas: desde otro huso, p. ej. Rumanía, se ve la hora buena),
  `REFRESH-INTERVAL` / `X-PUBLISHED-TTL` de 6 h, líneas plegadas a 75
  **octetos** (no caracteres: los diacríticos ocupan 2) y CRLF.
- **Determinista**: `DTSTAMP` fijo y orden estable → mismo config, mismo
  fichero byte a byte (y si no cambia, no se reescribe).

**Por qué un cargador propio y no el type stripping de Node 24.** Node sólo
borra anotaciones, y `church.config.ts` importa sin extensión
(`'./social-link.model'`), importa interfaces sin `type`
(`import { SocialLink }`) y usa el `InjectionToken` de Angular: con un
`import()` directo falla. `scripts/lib/load-ts-module.mjs` pasa cada fichero
por `ts.transpileModule` —el `typescript` del proyecto, el mismo que compila la
app—, resuelve los imports relativos como el bundler y sustituye
`@angular/core`. Da el mismo fichero con el Node 20 del PATH que con el 24 del
CI, y sirve a cualquier script que hoy lea un `.config.ts` con expresiones
regulares. Depende de la API de JS de `typescript` (la que usa también el
compilador de Angular).

Tests (`generate-events-calendar.test.mjs`, `lib/load-ts-module.test.mjs`,
dentro de `npm run check`): formato, series, `EXDATE` y el config real (genera,
UID únicos, todos los eventos dentro, y la ruta es la que pide
`CalendarService`). Las series se contrastaron además con `python-dateutil`:
de 09/2026 a 12/2028, cada domingo tiene exactamente una entrada a las 10:00 y
otra a las 18:00, con el título que toca.

> Con `ng serve` a pelo (el `web` de `.claude/launch.json` no pasa por
> `prestart`) el fichero puede faltar o estar viejo: `npm run calendar:events`.
> Cada cliente refresca a su ritmo (6 h es una sugerencia; Google Calendar
> tarda horas y no se puede forzar).

## Dominio — `elimarganda.com`

Registrado en **IONOS** (contrato «IONOS Pack Dominio»); el DNS se gestiona
allí, no en GitHub. Configurado el 10/10/2026:

| Registro | Host | Valor |
| --- | --- | --- |
| A ×4 | `@` y `www` | `185.199.108.153` … `185.199.111.153` (GitHub Pages) |
| TXT | `_github-pages-challenge-beni-cioarba` | verificación del dominio en la cuenta de GitHub |
| MX, DKIM, SPF, DMARC, `autodiscover` | — | **correo `elim@elimarganda.com`: no tocar** |

- En el repo: *Settings → Pages → Custom domain* = `elimarganda.com`,
  *Enforce HTTPS* activado (certificado de GitHub; el SSL de IONOS no hace
  falta). Con despliegue por Actions no se usa fichero `CNAME`.
- `www` lleva registros A (no CNAME) porque IONOS no admite CNAME junto a los
  MX que tiene `www`.
- La URL pública vive en **un solo sitio**: `publicUrl` en
  `core/church.config.ts` (QR, enlaces compartidos, `og:url`, calendario,
  formulario). Además: `og:image`/`twitter:image` en `src/index.html` y el
  `Referer` de `scripts/fetch-youtube.js`.
- La clave de la YouTube Data API está restringida por referrer en Google
  Cloud: debe incluir `https://elimarganda.com/*` y `https://www.elimarganda.com/*`.
- **Caché de GitHub tras activar el dominio** (10/10/2026): la portada
  `http://elimarganda.com/` siguió dando el 404 «There isn't a GitHub Pages
  site here» de antes del dominio (sólo la variante comprimida que piden los
  navegadores; `curl` sin `--compressed` daba 200). Se arregla **volviendo a
  desplegar** (*Actions → Deploy to GitHub Pages → Run workflow*): cada
  despliegue purga la caché del CDN.
- **PWA instaladas desde `github.io`**: su service worker vive en el origen
  antiguo y no puede actualizarse (el `ngsw.json` nuevo redirige al dominio,
  pero sus recursos `/main-….js` se resolverían en la raíz de `github.io`,
  que no existe). Siguen abriendo la última versión que guardaron. Remedio:
  desinstalar y volver a instalar desde `https://elimarganda.com`.

## Datos de YouTube — `.github/workflows/youtube-data.yml`

Cron (más frecuente los domingos) que ejecuta `scripts/fetch-youtube.js` y
publica `youtube.json` en la rama `youtube-data`. `YouTubeService` combina:

1. Ese JSON servido por `raw.githubusercontent.com` (sondeo cada 5 min) →
   últimas emisiones y respaldo del directo.
2. Sondeo directo a la YouTube Data API cada 2 min (2 unidades de cuota) para
   detectar el **EN DIRECTO** con fiabilidad.

Secretos: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` en GitHub Secrets.

## Aviso diario de Proiectul Împreună — `.github/workflows/impreuna-push.yml`

Web push con OneSignal a las 08:00 de España a quien activó la «Amintire
zilnică» en `/impreuna` (detalle, decisión y activación: `32-impreuna.md` § 7).

- Cuatro cron (05:05 · 05:35 · 06:05 · 06:35 UTC): GitHub no sabe del horario
  de verano y retrasa los cron; `scripts/impreuna-push.mjs` espera a las 08:00
  exactas y la clave de idempotencia del día impide duplicados. `concurrency`
  `impreuna-push` los pone en fila. `npm ci --ignore-scripts` (sólo hace falta
  `typescript`, para leer el TypeScript de la app).
- Manual (Run workflow): `dry-run` (enseña el aviso), `now` (envía el de hoy,
  no duplica), `test` (sólo a un Subscription ID).
- Secreto: **`ONESIGNAL_API_KEY`** (App API key). Sin él, o sin
  `oneSignalAppId` en `church.config.ts`, termina con un aviso y no envía.
- El service worker de OneSignal se publica en `/push/onesignal/` (asset de
  `angular.json` desde `src/push/onesignal/`), con ámbito propio para no pisar
  `ngsw-worker.js`.
- Repositorio público: GitHub desactiva los cron tras **60 días sin commits**
  (avisa por correo); se reactiva en Actions.

## PWA

### Detección de versiones nuevas (auditoría del 19/11/2026)

Síntoma: «no se detectan las versiones nuevas y, con la app instalada, hay que
refrescar 4 veces o más». Medido en `elimarganda.com`:

- Toda la web va con `Cache-Control: max-age=600` (CDN de GitHub Pages), también
  `index.html`, `ngsw.json` y `ngsw-worker.js`.
- El SW servía **cada navegación desde su copia** y sólo pasaba a la versión
  nueva cuando terminaba de descargarla **entera** (`ngsw.json`: 166 ficheros
  de código en `prefetch` + recursos cambiados de 909). En el móvil eso tarda;
  cada recarga antes de acabar volvía a dar la vieja. El aviso
  (`VERSION_READY`) dependía del mismo SW.

Arreglo (calcado de elim-25, que no tiene SW y detecta con un `version.json`):

1. **`/version.json`** en la raíz (lo escribe `scripts/generate-version.mjs`
   junto a `version.ts`; en `angular.json` → assets; fuera de los grupos del
   SW, que no lo guarda; en `.gitignore`). `PwaUpdateService` lo lee sin caché
   (`cache: 'no-store'` + `?t=`) en cada comprobación: si la **fecha de
   compilación** publicada es posterior a la de la pestaña, hay versión nueva
   aunque el SW vaya a medias. Por fecha y no por commit: la reconstrucción
   nocturna publica el mismo commit con el contenido del día.
2. **`navigationRequestStrategy: "freshness"`** en `ngsw-config.json`: las
   navegaciones van primero a la red (sin red, la copia). Una sola recarga
   trae la página nueva; sus chunks nuevos, que el SW viejo no conoce, van a
   la red.
3. **Recargas con URL de un solo uso** (`?_v=<ms>`): el CDN no puede dar la
   página vieja de sus 10 minutos. `init()` quita el parámetro de la barra.
4. **Botón de la versión** (pie): pulsarlo abre el globo y llama a
   `updateNow()`: comprueba ya y, si hay versión nueva, la aplica (activa la
   del SW si está lista; si no, da de baja el SW y borra sus cachés `ngsw:`
   para que la recarga venga entera de la red; una vez por versión y pestaña)
   y recarga. Si no la hay: «Ai ultima versiune» + «Reîncarcă». Globo sin
   parpadeo: puente invisible sobre el hueco y 180 ms de espera al cerrar.

Probado en `ng serve` simulando una versión nueva en `version.json`:
«Se instalează v2.3.5…» → recarga con `?_v=` → barra limpia. En la compilación
de producción: `ngsw.json` lleva `freshness` y `version.json` no está en
`hashTable`.


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
  redes reescribían el enlace a `…/#<familia>`). Las anclas bajan
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
| `generate-events-calendar.mjs` | `src/assets/calendars/elim-events.ics` (suscripción de Evenimente) desde `church.config.ts`: eventos + programa semanal. En prestart, prebuild y deploy («Calendario de suscripción») |
| `lib/load-ts-module.mjs` | Carga en Node un `.ts` de la app (transpila con `typescript`, imports sin extensión, `@angular/core` sustituido): leer un config sin expresiones regulares |
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
